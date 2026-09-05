import { Router } from 'express';
import type { Request } from 'express';
import { requireAuth, requireUserType } from '../utils/auth-middleware.js';

const router = Router();

type SessionUser = {
    id: string | number;
    vendorId?: string | number;
};

type SessionRequest = Request & {
    session?: {
        user?: SessionUser;
    };
};

const getSessionUser = (req: Request): SessionUser | undefined =>
    (req as SessionRequest).session?.user;

const inventorySelectQuery = `
    SELECT
        item_id AS "itemId",
        name AS "itemName",
        vendor_id AS "vendorId",
        inventory_number AS "inventoryCode",
        price,
        qty AS quantity
    FROM inventory
`;

router.get('/all', requireAuth, requireUserType('admin', 'system-admin', 'vendor', 'vendor-employee', 'vendor-admin'), async (_req, res) => {
    try {
        const db = (await import('../config/db.js')).default;
        const result = await db.query(`${inventorySelectQuery} ORDER BY item_id DESC`);

        res.status(200).json({
            success: true,
            items: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching inventory items'
        });
    }
});

router.get('/search', requireAuth, requireUserType('admin', 'system-admin', 'vendor', 'vendor-employee', 'vendor-admin'), async (req, res) => {
    const { itemId, itemName, vendorId, inventoryCode, price, quantity } = req.query;

    const conditions: string[] = [];
    const values: Array<string | number> = [];

    const addCondition = (condition: string, value: string | number) => {
        values.push(value);
        conditions.push(`${condition} $${values.length}`);
    };

    if (itemId !== undefined) {
        const parsedItemId = parseInt(String(itemId), 10);
        if (isNaN(parsedItemId) || parsedItemId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'itemId must be a valid positive integer'
            });
        }
        addCondition('item_id =', parsedItemId);
    }

    if (itemName !== undefined) {
        const sanitizedItemName = String(itemName).trim();
        if (sanitizedItemName.length > 0) {
            addCondition('name ILIKE', `%${sanitizedItemName}%`);
        }
    }

    if (vendorId !== undefined) {
        const parsedVendorId = parseInt(String(vendorId), 10);
        if (isNaN(parsedVendorId) || parsedVendorId <= 0) {
            return res.status(400).json({
                success: false,
                message: 'vendorId must be a valid positive integer'
            });
        }
        addCondition('vendor_id =', parsedVendorId);
    }

    if (inventoryCode !== undefined) {
        const sanitizedInventoryCode = String(inventoryCode).trim();
        if (sanitizedInventoryCode.length > 0) {
            addCondition('inventory_number::text ILIKE', `%${sanitizedInventoryCode}%`);
        }
    }

    if (price !== undefined) {
        const parsedPrice = parseFloat(String(price));
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({
                success: false,
                message: 'price must be a valid non-negative number'
            });
        }
        addCondition('price =', parsedPrice);
    }

    if (quantity !== undefined) {
        const parsedQuantity = parseInt(String(quantity), 10);
        if (isNaN(parsedQuantity) || parsedQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: 'quantity must be a valid non-negative integer'
            });
        }
        addCondition('qty =', parsedQuantity);
    }

    try {
        const db = (await import('../config/db.js')).default;
        const whereClause = conditions.length > 0 ? ` WHERE ${conditions.join(' AND ')}` : '';
        const result = await db.query(`${inventorySelectQuery}${whereClause} ORDER BY item_id DESC`, values);

        res.status(200).json({
            success: true,
            items: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error searching inventory items:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while searching inventory items'
        });
    }
});

router.post('/add', requireAuth, requireUserType('admin', 'system-admin', 'vendor-admin'), async (req, res) => {
    const { itemName, vendorId, inventoryCode, price, quantity } = req.body;

    // Validate required fields
    if (!itemName || !vendorId || price === undefined || quantity === undefined) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required: itemName, vendorId, price, quantity'
        });
    }

    // Validate numeric fields
    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseInt(quantity, 10);
    const parsedVendorId = parseInt(vendorId, 10);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
            success: false,
            message: 'Price must be a valid non-negative number'
        });
    }

    if (isNaN(parsedQuantity) || parsedQuantity < 0 || !Number.isInteger(parsedQuantity)) {
        return res.status(400).json({
            success: false,
            message: 'Quantity must be a valid non-negative integer'
        });
    }

    if (isNaN(parsedVendorId) || parsedVendorId <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Vendor ID must be a valid positive integer'
        });
    }

    // Sanitize itemName and inventoryCode (trim whitespace, check length)
    const sanitizedItemName = itemName.toString().trim();
    const sanitizedInventoryCode = inventoryCode ? inventoryCode.toString().trim() : null;

    if (sanitizedItemName.length === 0 || sanitizedItemName.length > 255) {
        return res.status(400).json({
            success: false,
            message: 'Item name must be between 1 and 255 characters'
        });
    }

    if (sanitizedInventoryCode !== null && sanitizedInventoryCode.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Vendor inventory code must be 100 characters or fewer'
        });
    }

    try {
        const db = (await import('../config/db.js')).default;

        // Insert the inventory item
        const insertQuery = `
            INSERT INTO inventory (name, vendor_id, inventory_number, price, qty)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING item_id
        `;
        
        const result = await db.query(insertQuery, [
            sanitizedItemName,
            parsedVendorId,
            sanitizedInventoryCode,
            parsedPrice,
            parsedQuantity,
        ]);

        res.status(201).json({
            success: true,
            message: 'Inventory item added successfully',
            item: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error adding inventory item:', error);
        
        // Handle unique constraint violations
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'An item with this vendor inventory number already exists for this vendor'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error while adding inventory item'
        });
    }
});

router.get('/vendor/items', requireAuth, requireUserType('vendor', 'vendor-employee', 'vendor-admin'), async (req, res) => {
    const sessionUser = getSessionUser(req);
    const sessionVendorId = sessionUser?.vendorId ?? sessionUser?.id;

    if (!sessionVendorId) {
        return res.status(403).json({
            success: false,
            message: 'Unable to determine vendor ID from session. Please log in again.'
        });
    }

    try {
        const db = (await import('../config/db.js')).default;
        const result = await db.query(
            `${inventorySelectQuery} WHERE vendor_id = $1 ORDER BY item_id DESC`,
            [sessionVendorId]
        );

        res.status(200).json({
            success: true,
            items: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching vendor inventory items:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching inventory items'
        });
    }
});

router.get('/vendor/search', requireAuth, requireUserType('vendor', 'vendor-employee', 'vendor-admin'), async (req, res) => {
    const sessionUser = getSessionUser(req);
    const sessionVendorId = sessionUser?.vendorId;

    if (!sessionVendorId) {
        return res.status(403).json({
            success: false,
            message: 'Unable to determine vendor ID from session. Please log in again.'
        });
    }

    const { itemName, inventoryCode, price, quantity } = req.query;

    const conditions: string[] = ['vendor_id = $1'];
    const values: Array<string | number> = [sessionVendorId];

    const addCondition = (condition: string, value: string | number) => {
        values.push(value);
        conditions.push(`${condition} $${values.length}`);
    };

    if (itemName !== undefined) {
        const sanitizedItemName = String(itemName).trim();
        if (sanitizedItemName.length > 0) {
            addCondition('name ILIKE', `%${sanitizedItemName}%`);
        }
    }

    if (inventoryCode !== undefined) {
        const sanitizedInventoryCode = String(inventoryCode).trim();
        if (sanitizedInventoryCode.length > 0) {
            addCondition('inventory_number::text ILIKE', `%${sanitizedInventoryCode}%`);
        }
    }

    if (price !== undefined) {
        const parsedPrice = parseFloat(String(price));
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({
                success: false,
                message: 'price must be a valid non-negative number'
            });
        }
        addCondition('price =', parsedPrice);
    }

    if (quantity !== undefined) {
        const parsedQuantity = parseInt(String(quantity), 10);
        if (isNaN(parsedQuantity) || parsedQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: 'quantity must be a valid non-negative integer'
            });
        }
        addCondition('qty =', parsedQuantity);
    }

    try {
        const db = (await import('../config/db.js')).default;
        const whereClause = ` WHERE ${conditions.join(' AND ')}`;
        const result = await db.query(
            `${inventorySelectQuery}${whereClause} ORDER BY item_id DESC`,
            values
        );

        res.status(200).json({
            success: true,
            items: result.rows,
            count: result.rows.length
        });
    } catch (error) {
        console.error('Error searching vendor inventory items:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while searching inventory items'
        });
    }
});

router.post('/vendor/add', requireAuth, requireUserType('vendor', 'vendor-employee', 'vendor-admin'), async (req, res) => {
    const { itemName, inventoryCode, price, quantity, vendorId } = req.body;

    if (vendorId !== undefined) {
        return res.status(403).json({
            success: false,
            message: 'Vendor ID cannot be specified. It is automatically determined from your session.'
        });
    }

    const sessionUser = getSessionUser(req);
    const sessionVendorId = sessionUser?.vendorId ?? sessionUser?.id;

    if (!sessionVendorId) {
        return res.status(403).json({
            success: false,
            message: 'Unable to determine vendor ID from session. Please log in again.'
        });
    }

    if (!itemName || price === undefined || quantity === undefined) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required: itemName, price, quantity'
        });
    }

    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseInt(quantity, 10);

    if (isNaN(parsedPrice) || parsedPrice < 0) {
        return res.status(400).json({
            success: false,
            message: 'Price must be a valid non-negative number'
        });
    }

    if (isNaN(parsedQuantity) || parsedQuantity < 0 || !Number.isInteger(parsedQuantity)) {
        return res.status(400).json({
            success: false,
            message: 'Quantity must be a valid non-negative integer'
        });
    }

    const sanitizedItemName = itemName.toString().trim();
    const sanitizedInventoryCode = inventoryCode ? inventoryCode.toString().trim() : null;

    if (sanitizedItemName.length === 0 || sanitizedItemName.length > 255) {
        return res.status(400).json({
            success: false,
            message: 'Item name must be between 1 and 255 characters'
        });
    }

    if (sanitizedInventoryCode !== null && sanitizedInventoryCode.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Vendor inventory code must be 100 characters or fewer'
        });
    }

    try {
        const db = (await import('../config/db.js')).default;

        const insertQuery = `
            INSERT INTO inventory (name, vendor_id, inventory_number, price, qty)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING item_id
        `;

        const result = await db.query(insertQuery, [
            sanitizedItemName,
            sessionVendorId,
            sanitizedInventoryCode,
            parsedPrice,
            parsedQuantity,
        ]);

        res.status(201).json({
            success: true,
            message: 'Inventory item added successfully',
            item: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error adding vendor inventory item:', error);

        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'An item with this vendor inventory number already exists for this vendor'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error while adding inventory item'
        });
    }
});

router.post('/vendor/remove-item', requireAuth, requireUserType('vendor', 'vendor-employee', 'vendor-admin'), async (req, res) => {
    const { itemId } = req.body;

    if (!itemId) {
        return res.status(400).json({ success: false, message: 'Missing required field: itemId' });
    }

    const sessionUser = getSessionUser(req);
    const sessionVendorId = sessionUser?.vendorId ?? sessionUser?.id;

    if (!sessionVendorId) {
        return res.status(403).json({
            success: false,
            message: 'Unable to determine vendor ID from session. Please log in again.'
        });
    }

    try {
        const db = (await import('../config/db.js')).default;

        const removeQuery = `
            DELETE FROM inventory
            WHERE item_id = $1 AND vendor_id = $2
            RETURNING item_id
        `;

        const result = await db.query(removeQuery, [itemId, sessionVendorId]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Item not found or does not belong to your account'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Inventory item removed successfully',
            item: result.rows[0]
        });
    } catch (error) {
        console.error('Error removing vendor inventory item:', error);
        res.status(500).json({ success: false, message: 'Internal server error while removing inventory item' });
    }
});

/* ADMIN REMOVE ITEM
* Removes an item from a ticket. Admins can remove any item from any ticket.
* Security: Only admin users can access this route. Admins can specify any ticketId and itemId.
*/
router.post('/remove-item', requireAuth, requireUserType('admin', 'system-admin', 'vendor-admin'), async (req, res) => {
    const { itemId } = req.body;
    if (!itemId) {
        return res.status(400).json({ error: 'Missing required fields: itemId' });
    }
    try {
        const db = (await import('../config/db.js')).default;

        // Insert the inventory item
        const removeQuery = `
            DELETE FROM inventory
            WHERE item_id = $1
            RETURNING item_id
        `;
        
        const result = await db.query(removeQuery, [
            itemId
        ]);

        res.status(201).json({
            success: true,
            message: 'Inventory item removed successfully',
            item: result.rows[0]
        });
    } catch (error) {
        console.error('Error in remove-from-ticket route:', error);
        res.status(500).json({ error: 'Internal server error while removing items from inventory' });
    }
});

export default router;