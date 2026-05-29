/*
  _               __  __ _         _
 | |        /\   |  \/  | |       | |
 | |       /  \  | \  / | |__   __| | __ _
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|

 Name: Inventory Routes
 File: inventory.ts
 Description: Defines API routes for inventory management, including adding and updating inventory items. Protected by authentication and admin user type checks.
 Last Edited: 26 February 2026
*/

import { Router } from 'express';
import { requireAuth, requireUserType } from '../utils/auth-middleware.js';

const router = Router();

const inventorySelectQuery = `
    SELECT
        item_id AS "itemId",
        name AS "itemName",
        vendor_id AS "vendorId",
        inventory_number AS "inventoryNumber",
        price,
        qty AS quantity
    FROM inventory
`;

/* GET ALL INVENTORY ITEMS
* Returns all inventory items for authenticated admin/vendor users.
*/
router.get('/all', requireAuth, requireUserType('admin', 'vendor'), async (_req, res) => {
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

/* SEARCH INVENTORY ITEMS
* Searches inventory using any combination of item fields as optional query parameters.
* Supported params: itemId, itemName, vendorId, inventoryNumber, price, quantity
*/
router.get('/search', requireAuth, requireUserType('admin', 'vendor'), async (req, res) => {
    const { itemId, itemName, vendorId, inventoryNumber, price, quantity } = req.query;

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

    if (inventoryNumber !== undefined) {
        const sanitizedInventoryNumber = String(inventoryNumber).trim();
        if (sanitizedInventoryNumber.length > 0) {
            addCondition('inventory_number::text ILIKE', `%${sanitizedInventoryNumber}%`);
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

/* ADMIN ADD INVENTORY ITEM 
*  Price, Quantity, Vendor ID, Vendor Inventory Number, and Item Name are required fields. Admins can add inventory items for any vendor.
*  Security: Only admin users can access this route. Admins can specify any vendorId.
*/

router.post('/add', requireAuth, requireUserType('admin'), async (req, res) => {
    const { itemName, vendorId, inventoryNumber, price, quantity } = req.body;

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

    // Sanitize itemName and inventoryNumber (trim whitespace, check length)
    const sanitizedItemName = itemName.toString().trim();
    const sanitizedInventoryNumber = inventoryNumber.toString().trim();

    if (sanitizedItemName.length === 0 || sanitizedItemName.length > 255) {
        return res.status(400).json({
            success: false,
            message: 'Item name must be between 1 and 255 characters'
        });
    }

    if (sanitizedInventoryNumber.length === 0 || sanitizedInventoryNumber.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Vendor inventory number must be between 1 and 100 characters'
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
            sanitizedInventoryNumber,
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

/* VENDOR ADD INVENTORY ITEM
* Price, Quantity, Vendor ID, Vendor Inventory Number, and Item Name are required fields. Vendors can only add inventory items for their own vendor ID.
* Vendor ID is determined from the authenticated user's session and cannot be specified in the request body. This prevents vendors from adding inventory for other vendors.
* Security: Rejects requests that include vendorId in the body to prevent ID spoofing.
*/
router.post('/vendor/add', requireAuth, requireUserType('vendor'), async (req, res) => {
    const { itemName, inventoryNumber, price, quantity, vendorId } = req.body;

    // SECURITY: Reject if vendorId is provided in the request body
    // This prevents vendors from spoofing their vendor ID to add items for other vendors
    if (vendorId !== undefined) {
        return res.status(403).json({
            success: false,
            message: 'Vendor ID cannot be specified. It is automatically determined from your session.'
        });
    }

    // Get vendorId from session (user's ID serves as their vendor ID)
    const sessionVendorId = req.session.user!.vendorId || req.session.user!.id;

    if (!sessionVendorId) {
        return res.status(403).json({
            success: false,
            message: 'Unable to determine vendor ID from session. Please log in again.'
        });
    }

    // Validate required fields
    if (!itemName || !inventoryNumber || price === undefined || quantity === undefined) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required: itemName, inventoryNumber, price, quantity'
        });
    }

    // Validate numeric fields
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

    // Sanitize itemName and inventoryNumber
    const sanitizedItemName = itemName.toString().trim();
    const sanitizedInventoryNumber = inventoryNumber.toString().trim();

    if (sanitizedItemName.length === 0 || sanitizedItemName.length > 255) {
        return res.status(400).json({
            success: false,
            message: 'Item name must be between 1 and 255 characters'
        });
    }

    if (sanitizedInventoryNumber.length === 0 || sanitizedInventoryNumber.length > 100) {
        return res.status(400).json({
            success: false,
            message: 'Vendor inventory number must be between 1 and 100 characters'
        });
    }

    try {
        const db = (await import('../config/db.js')).default;

        // Insert the inventory item using the session's vendor ID
        const insertQuery = `
            INSERT INTO inventory (itemName, vendorId, inventoryNumber, price, quantity, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING inventory_id, itemName, vendorId, inventoryNumber, price, quantity, created_at
        `;
        
        const result = await db.query(insertQuery, [
            sanitizedItemName,
            sessionVendorId,
            sanitizedInventoryNumber,
            parsedPrice,
            parsedQuantity,
            req.session.user!.id // Vendor user who created the item
        ]);

        res.status(201).json({
            success: true,
            message: 'Inventory item added successfully',
            item: result.rows[0]
        });

    } catch (error: any) {
        console.error('Error adding vendor inventory item:', error);
        
        // Handle unique constraint violations
        if (error.code === '23505') {
            return res.status(400).json({
                success: false,
                message: 'An item with this inventory number already exists in your inventory'
            });
        }

        res.status(500).json({
            success: false,
            message: 'Internal server error while adding inventory item'
        });
    }
});



export default router;