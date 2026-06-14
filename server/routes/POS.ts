/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 PREFIX: POS/
 Name: POS Routes
 File: POS.ts
 Description: Handles routes for POS operations, including creating receipts and processing transactions.
 Functions: 
 Last Edited: 10 February 2026
*/ 

import express from 'express';
import db from '../config/db.js'; // Import your database connection
import { sendEmail } from '../services/mailer.js'

const router = express.Router();

async function getTicketDetail(ticketId: string) {
    const ticketResult = await db.query(
        `SELECT t.ticket_id,
                t.cashier_id,
                t.created_at,
                t.status AS ticket_status,
                COALESCE(t.total, 0)::float AS total,
                COALESCE(
                    NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
                    u.email,
                    CONCAT('Employee #', t.cashier_id::text)
                ) AS employee_name
         FROM tickets t
         LEFT JOIN users u ON u.user_id = t.cashier_id
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
                t.status AS ticket_status,
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

/* CREATE TICKET
* Endpoint to create a new receipt and process a transaction
* Request body is empty, return the new receipt ID and details for items to be added
*/
router.post('/create-ticket', async (req, res) => {
    try {
        const cashierId = req.session.user?.id ?? 2;
        // 1. Create a new ticket in the database with status "open"
        const newTicket = await db.query(
            'INSERT INTO tickets (status, created_at, cashier_id) VALUES ($1, NOW(), $2) RETURNING ticket_id, created_at',
            ['open', cashierId]
        );
        const ticketId = newTicket.rows[0].ticket_id;
        // 2. Return the new ticket ID and details (initially empty items)
        res.status(201).json({
            ticketId: ticketId
        });
    } catch (error) {
        console.error('Error creating receipt:', error);
        res.status(500).json({ error: 'Failed to create receipt' });
    }
});

/* UPDATE TICKET
* Takes ticket_items (previously synced, may have price/discount changes) and unsynced_items (new).
* Updates existing rows by ticket_item_id, inserts new rows, then recalculates the ticket total.
* Returns the inserted items with their new ticket_item_ids.
*/
router.post('/update-ticket', async (req, res) => {
    const { ticketId, ticket_items, unsynced_items } = req.body;
    try {
        // 1. Fetch current DB rows for this ticket
        const currentResult = await db.query(
            'SELECT ticket_item_id FROM ticket_items WHERE ticket_id = $1',
            [ticketId]
        );
        const dbIds: number[] = currentResult.rows.map((r: any) => r.ticket_item_id);
        const frontendIds: number[] = ticket_items
            .filter((i: any) => i.ticket_item_id != null)
            .map((i: any) => i.ticket_item_id);
        const idsToDelete = dbIds.filter(id => !frontendIds.includes(id));

        // 2. Delete rows removed on the frontend
        for (const id of idsToDelete) {
            await db.query('DELETE FROM ticket_items WHERE ticket_item_id = $1', [id]);
        }

        // 3. Update previously synced items (price, discount, or quantity changes)
        for (const item of ticket_items) {
            const commission = parseFloat((item.final_price * 0.10).toFixed(2));
            const payout = parseFloat((item.final_price * 0.90).toFixed(2));
            await db.query(
                `UPDATE ticket_items
                 SET discount_percent = $1, discount_amount = $2,
                     final_price = $3, commission = $4, payout = $5, quantity = $6
                 WHERE ticket_item_id = $7 AND ticket_id = $8`,
                [item.discount_percent, item.discount_amount, item.final_price,
                 commission, payout, item.quantity, item.ticket_item_id, ticketId]
            );
        }

        // 2. Insert new unsynced items, capturing generated ticket_item_ids
        const insertedItems: any[] = [];
        for (const item of unsynced_items) {
            const commission = parseFloat((item.final_price * 0.10).toFixed(2));
            const payout = parseFloat((item.final_price * 0.90).toFixed(2));
            const result = await db.query(
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

        // 3. Recalculate and update ticket total (final_price * quantity per row)
        const totalResult = await db.query(
            'SELECT COALESCE(SUM(final_price * quantity), 0) AS total FROM ticket_items WHERE ticket_id = $1',
            [ticketId]
        );
        const total = parseFloat(totalResult.rows[0].total);
        await db.query('UPDATE tickets SET total = $1 WHERE ticket_id = $2', [total, ticketId]);

        res.status(200).json({ message: 'Ticket updated successfully', insertedItems });
    } catch (error) {
        console.error('Error updating ticket:', error);
        res.status(500).json({ error: 'Failed to update ticket' });
    }
});

/* GET TICKET
* Fetches a ticket and all its associated items by ticket_id.
* Column aliases map DB names to the TicketItem shape expected by the client.
*/
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

/* GET ALL TICKETS
* Returns ticket summaries for the POS orders page, with optional filters.
*/
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

/* CLOSE TICKET
* Endpoint to close a receipt and finalize the transaction
*/
router.post('/close-receipt', async (req, res) => {
    const { receiptId } = req.body;
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
