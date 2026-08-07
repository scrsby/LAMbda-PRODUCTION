import express from 'express';
import rateLimit from 'express-rate-limit';
import db from '../config/db.js'; // Import your database connection
import { sendEmail } from '../services/mailer.js'
import { requireAuth, requireUserType } from '../utils/auth-middleware.js';

const router = express.Router();
const rateLimitHandler = (message: string) => (_req: express.Request, res: express.Response) => {
    res.status(429).json({ error: message });
};

const posRouteRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 240,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('Too many POS requests. Please wait a moment and try again.')
});

const posWriteRateLimit = rateLimit({
    windowMs: 10 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    handler: rateLimitHandler('Too many POS write requests. Please wait a moment and try again.')
});

async function getTicketDetail(ticketId: string) {
    const ticketResult = await db.query(
        `SELECT t.ticket_id,
                t.cashier_id,
                t.created_at,
                t.ticket_status,
                COALESCE(t.total, 0)::float AS total,
                COALESCE(t.cash_payment, false) AS cash_payment,
                COALESCE(t.tax_exempt, false) AS tax_exempt,
                ted.business_name AS tax_exempt_business_name,
                COALESCE(
                    NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
                    u.email,
                    CONCAT('Employee #', t.cashier_id::text)
                ) AS employee_name
         FROM tickets t
         LEFT JOIN users u ON u.user_id = t.cashier_id
         LEFT JOIN tax_exempt_details ted ON ted.ticket_id = t.ticket_id
         WHERE t.ticket_id = $1`,
        [ticketId]
    );

    if (ticketResult.rows.length === 0) {
        return null;
    }

    const itemsResult = await db.query(
        `SELECT ticket_item_id,
                ticket_id,
                vendor_id,
                inventory_code         AS vendor_inventory_id,
                item_name              AS name,
                base_price::float      AS vendor_price,
                discount_percent,
                discount_amount::float AS discount_amount,
                final_price::float     AS final_price,
                commission::float      AS commission,
                payout::float          AS payout,
                quantity
         FROM ticket_items
         WHERE ticket_id = $1`,
        [ticketId]
    );

    return {
        ticket: ticketResult.rows[0],
        items: itemsResult.rows
    };
}

async function getTicketSummaries(filters: {
    orderId?: string;
    itemSearch?: string;
    startDate?: string;
    endDate?: string;
    employee?: string;
}) {
    const conditions: string[] = [];
    const values: string[] = [];

    if (filters.orderId) {
        values.push(`%${filters.orderId}%`);
        conditions.push(`CAST(t.ticket_id AS TEXT) ILIKE $${values.length}`);
    }

    if (filters.itemSearch) {
        values.push(`%${filters.itemSearch}%`);
        conditions.push(
            `EXISTS (
                SELECT 1
                FROM ticket_items ti
                WHERE ti.ticket_id = t.ticket_id
                  AND ti.item_name ILIKE $${values.length}
            )`
        );
    }

    if (filters.startDate) {
        values.push(filters.startDate);
        conditions.push(`t.created_at >= $${values.length}`);
    }

    if (filters.endDate) {
        values.push(filters.endDate);
        conditions.push(`t.created_at <= $${values.length}`);
    }

    if (filters.employee) {
        values.push(`%${filters.employee}%`);
        conditions.push(
            `COALESCE(
                NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
                u.email,
                CONCAT('Employee #', t.cashier_id::text)
            ) ILIKE $${values.length}`
        );
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const result = await db.query(
        `SELECT t.ticket_id,
                t.cashier_id,
                t.created_at,
                t.ticket_status,
                COALESCE(t.total, 0)::float AS total,
                COALESCE(
                    NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
                    u.email,
                    CONCAT('Employee #', t.cashier_id::text)
                ) AS employee_name
         FROM tickets t
         LEFT JOIN users u ON u.user_id = t.cashier_id
         ${whereClause}
         ORDER BY t.created_at DESC`,
        values
    );

    return result.rows;
}

router.use(requireAuth, requireUserType('employee', 'admin'), posRouteRateLimit);

router.post('/create-ticket', posWriteRateLimit, async (req, res) => {
    try {
        const cashierId = req.session.user?.id;
        if (!cashierId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // 1. Create a new ticket in the database with status "open"
        const newTicket = await db.query(
            'INSERT INTO tickets (ticket_status, created_at, cashier_id) VALUES ($1, NOW(), $2) RETURNING ticket_id, created_at',
            ['open', cashierId]
        );
        const ticketId = newTicket.rows[0].ticket_id;
        // 2. Return the new ticket ID and details (initially empty items)
        res.status(201).json({
            ticketId: ticketId
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Failed to create ticket' });
    }
});

router.post('/update-ticket', posWriteRateLimit, async (req, res) => {
    const { ticketId } = req.body;
    const ticketItems = Array.isArray(req.body?.ticket_items) ? req.body.ticket_items : [];
    const unsyncedItems = Array.isArray(req.body?.unsynced_items) ? req.body.unsynced_items : [];
    const cashPayment = req.body?.cashPayment === true;
    const taxExempt = req.body?.taxExempt === true;
    const taxExemptBusinessName = typeof req.body?.taxExemptBusinessName === 'string'
        ? req.body.taxExemptBusinessName.trim()
        : '';

    if (!ticketId) {
        return res.status(400).json({ error: 'ticketId is required' });
    }
    if (taxExempt && !taxExemptBusinessName) {
        return res.status(400).json({ error: 'Business name is required for tax exempt tickets' });
    }

    const client = await db.connect();
    let transactionStarted = false;

    try {
        await client.query('BEGIN');
        transactionStarted = true;

        const ticketResult = await client.query(
            'SELECT ticket_status FROM tickets WHERE ticket_id = $1 FOR UPDATE',
            [ticketId]
        );

        if (ticketResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Ticket not found' });
        }

        if (ticketResult.rows[0].ticket_status !== 'open') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Only open tickets can be updated' });
        }

        // 1. Fetch current DB rows for this ticket
        const currentResult = await client.query(
            'SELECT ticket_item_id FROM ticket_items WHERE ticket_id = $1',
            [ticketId]
        );
        const dbIds: number[] = currentResult.rows.map((r: any) => r.ticket_item_id);
        const frontendIds: number[] = ticketItems
            .filter((i: any) => i.ticket_item_id != null)
            .map((i: any) => i.ticket_item_id);
        const idsToDelete = dbIds.filter(id => !frontendIds.includes(id));

        // 2. Delete rows removed on the frontend
        for (const id of idsToDelete) {
            await client.query('DELETE FROM ticket_items WHERE ticket_item_id = $1', [id]);
        }

        // 3. Update previously synced items (price, discount, or quantity changes)
        for (const item of ticketItems) {
            const commission = parseFloat((item.final_price * 0.10).toFixed(2));
            const payout = parseFloat((item.final_price * 0.90).toFixed(2));
            await client.query(
                `UPDATE ticket_items
                 SET discount_percent = $1, discount_amount = $2,
                     final_price = $3, commission = $4, payout = $5, quantity = $6
                 WHERE ticket_item_id = $7 AND ticket_id = $8`,
                [item.discount_percent, item.discount_amount, item.final_price,
                 commission, payout, item.quantity, item.ticket_item_id, ticketId]
            );
        }

        // 4. Insert new unsynced items, capturing generated ticket_item_ids
        const insertedItems: any[] = [];
        for (const item of unsyncedItems) {
            const commission = parseFloat((item.final_price * 0.10).toFixed(2));
            const payout = parseFloat((item.final_price * 0.90).toFixed(2));
            const result = await client.query(
                `INSERT INTO ticket_items
                    (ticket_id, vendor_id, inventory_code, item_name, base_price,
                     discount_percent, discount_amount, final_price, commission, payout, quantity)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
                 RETURNING ticket_item_id`,
                [ticketId, item.vendor_id, item.vendor_inventory_id, item.name,
                 item.vendor_price, item.discount_percent, item.discount_amount,
                 item.final_price, commission, payout, item.quantity]
            );
            insertedItems.push({ ...item, ticket_item_id: result.rows[0].ticket_item_id });
        }

        // 5. Recalculate and update ticket total
        const totalResult = await client.query(
            'SELECT COALESCE(SUM(final_price * quantity), 0) AS total FROM ticket_items WHERE ticket_id = $1',
            [ticketId]
        );
        const total = parseFloat(totalResult.rows[0].total);
        await client.query(
            'UPDATE tickets SET total = $1, cash_payment = $2, tax_exempt = $3 WHERE ticket_id = $4',
            [total, cashPayment, taxExempt, ticketId]
        );
        await client.query('DELETE FROM tax_exempt_details WHERE ticket_id = $1', [ticketId]);
        if (taxExempt) {
            await client.query(
                'INSERT INTO tax_exempt_details (ticket_id, business_name) VALUES ($1, $2)',
                [ticketId, taxExemptBusinessName]
            );
        }
        await client.query('COMMIT');
        transactionStarted = false;

        res.status(200).json({ message: 'Ticket updated successfully', insertedItems });
    } catch (error) {
        if (transactionStarted) {
            try {
                await client.query('ROLLBACK');
            } catch (rollbackError) {
                console.error('Error rolling back ticket update transaction:', rollbackError);
            }
        }
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Failed to update ticket' });
    } finally {
        client.release();
    }
});


router.get('/inventory-search', async (req, res) => {
    const { vendorId, inventoryCode, itemName } = req.query;
    const conditions: string[] = [];
    const values: Array<string | number> = [];

    if (vendorId !== undefined) {
        const parsedVendorId = parseInt(String(vendorId), 10);
        if (isNaN(parsedVendorId) || parsedVendorId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'vendorId must be a valid positive integer'
            });
        }
        values.push(parsedVendorId);
        conditions.push(`vendor_id = $${values.length}`);
    }

    if (inventoryCode !== undefined) {
        const sanitizedInventoryCode = String(inventoryCode).trim();
        if (sanitizedInventoryCode.length > 0) {
            values.push(`%${sanitizedInventoryCode}%`);
            conditions.push(`inventory_number::text ILIKE $${values.length}`);
        }
    }

    if (itemName !== undefined) {
        const sanitizedItemName = String(itemName).trim();
        if (sanitizedItemName.length > 0) {
            values.push(`%${sanitizedItemName}%`);
            conditions.push(`name ILIKE $${values.length}`);
        }
    }

    if (conditions.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'At least one search field is required'
        });
    }

    try {
        const result = await db.query(
            `SELECT
                item_id AS "itemId",
                name AS "itemName",
                vendor_id AS "vendorId",
                inventory_number AS "inventoryCode",
                price,
                qty AS quantity
             FROM inventory
             WHERE ${conditions.join(' AND ')}
             ORDER BY item_id DESC`,
            values
        );

        res.status(200).json({
            success: true,
            items: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error searching register inventory:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to search inventory'
        });
    }
});

router.get('/ticket/:id', async (req, res) => {
    const ticketId = req.params.id;
    try {
        const ticketDetail = await getTicketDetail(ticketId);
        if (!ticketDetail) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.status(200).json(ticketDetail);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
    }
});

router.delete('/ticket/:id', requireAuth, requireUserType('admin'), async (req, res) => {
    const ticketId = req.params.id;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const ticketResult = await client.query(
            'SELECT ticket_status FROM tickets WHERE ticket_id = $1 FOR UPDATE',
            [ticketId]
        );

        if (ticketResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Ticket not found' });
        }

        if (ticketResult.rows[0].ticket_status !== 'open') {
            await client.query('ROLLBACK');
            return res.status(409).json({ error: 'Only open tickets can be deleted' });
        }

        await client.query('DELETE FROM ticket_items WHERE ticket_id = $1', [ticketId]);
        await client.query('DELETE FROM tickets WHERE ticket_id = $1', [ticketId]);
        await client.query('COMMIT');

        res.status(200).json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting ticket:', error);
        res.status(500).json({ error: 'Failed to delete ticket' });
    } finally {
        client.release();
    }
});

router.get('/tickets', async (req, res) => {
    const orderId = req.query.orderId?.toString().trim();
    const itemSearch = req.query.itemSearch?.toString().trim();
    const startDate = req.query.startDate?.toString().trim();
    const endDate = req.query.endDate?.toString().trim();
    const employee = req.query.employee?.toString().trim();

    try {
        const tickets = await getTicketSummaries({
            orderId,
            itemSearch,
            startDate,
            endDate,
            employee
        });
        res.status(200).json({ tickets });
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Failed to fetch tickets' });
    }
});

/* CLOSE RECEIPT (legacy stub — kept for backwards compatibility)
* Endpoint to close a receipt and finalize the transaction
*/
router.post('/close-receipt', async (req, res) => {
    res.status(410).json({
        error: 'close-receipt is no longer supported. Use /POS/close-ticket instead.',
        receiptId: req.body?.receiptId ?? null
    });
});

/* CLOSE TICKET
* Marks an open ticket as closed (paid). Expects { ticketId } in the request body.
*/
router.post('/close-ticket', posWriteRateLimit, async (req, res) => {
    const { ticketId } = req.body;
   const cashPayment = req.body?.cashPayment === true;
   const taxExempt = req.body?.taxExempt === true;
   const taxExemptBusinessName = typeof req.body?.taxExemptBusinessName === 'string'
       ? req.body.taxExemptBusinessName.trim()
       : '';

   if (!ticketId) {
       return res.status(400).json({ error: 'ticketId is required' });
   }
   if (taxExempt && !taxExemptBusinessName) {
       return res.status(400).json({ error: 'Business name is required for tax exempt tickets' });
   }

   const client = await db.connect();
   let transactionStarted = false;

   try {
       await client.query('BEGIN');
       transactionStarted = true;

       const result = await client.query(
           `UPDATE tickets
            SET ticket_status = 'closed',
                cash_payment = $1,
                tax_exempt = $2
            WHERE ticket_id = $3 AND ticket_status = 'open'
            RETURNING ticket_id`,
           [cashPayment, taxExempt, ticketId]
       );
       if (result.rows.length === 0) {
           await client.query('ROLLBACK');
           transactionStarted = false;
           return res.status(404).json({ error: 'Ticket not found or not open' });
       }

       await client.query('DELETE FROM tax_exempt_details WHERE ticket_id = $1', [ticketId]);
       if (taxExempt) {
           await client.query(
               'INSERT INTO tax_exempt_details (ticket_id, business_name) VALUES ($1, $2)',
               [ticketId, taxExemptBusinessName]
           );
       }

       await client.query('COMMIT');
       transactionStarted = false;
       res.status(200).json({ message: 'Ticket closed successfully', ticketId: result.rows[0].ticket_id });
   } catch (error) {
       if (transactionStarted) {
           try {
               await client.query('ROLLBACK');
           } catch (rollbackError) {
               console.error('Error rolling back close ticket transaction:', rollbackError);
           }
       }
       console.error('Error closing ticket:', error);
       res.status(500).json({ error: 'Failed to close ticket' });
   } finally {
       client.release();
   }
});



/* GET ALL TICKETS
* Endpoint to retrieve all receipts for a given day or time period
*/
router.get('/receipts', async (req, res) => {
    const orderId = req.query.orderId?.toString().trim();
    const itemSearch = req.query.itemSearch?.toString().trim();
    const startDate = req.query.startDate?.toString().trim();
    const endDate = req.query.endDate?.toString().trim();
    const employee = req.query.employee?.toString().trim();

    try {
        const tickets = await getTicketSummaries({
            orderId,
            itemSearch,
            startDate,
            endDate,
            employee
        });
        res.status(200).json({ tickets });
    } catch (error) {
        console.error('Error fetching receipts:', error);
        res.status(500).json({ error: 'Failed to fetch receipts' });
    }
});

/* GET TICKET DETAILS
* Endpoint to retrieve details of a specific receipt
*/
router.get('/receipt/:id', async (req, res) => {
    try {
        const ticketDetail = await getTicketDetail(req.params.id);
        if (!ticketDetail) {
            return res.status(404).json({ error: 'Receipt not found' });
        }
        res.status(200).json(ticketDetail);
    } catch (error) {
        console.error('Error fetching receipt:', error);
        res.status(500).json({ error: 'Failed to fetch receipt' });
    }
});

export default router;
