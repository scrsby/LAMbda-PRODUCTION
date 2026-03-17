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

/* ADMIN ADD INVENTORY ITEM 
*  Price, Quantity, Vendor ID, Vendor Inventory Number, and Item Name are required fields. Admins can add inventory items for any vendor.
*  Security: Only admin users can access this route. Admins can specify any vendor_id.
*/

router.post('/add', requireAuth, requireUserType('admin'), async (req, res) => {
    const { item_name, vendor_id, vendor_inventory_number, price, quantity } = req.body;

    // Validate required fields
    if (!item_name || !vendor_id || !vendor_inventory_number || price === undefined || quantity === undefined) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required: item_name, vendor_id, vendor_inventory_number, price, quantity'
        });
    }

    // Validate numeric fields
    const parsedPrice = parseFloat(price);
    const parsedQuantity = parseInt(quantity, 10);
    const parsedVendorId = parseInt(vendor_id, 10);

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

    // Sanitize item_name and vendor_inventory_number (trim whitespace, check length)
    const sanitizedItemName = item_name.toString().trim();
    const sanitizedInventoryNumber = vendor_inventory_number.toString().trim();

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
            INSERT INTO inventory (item_name, vendor_id, vendor_inventory_number, price, quantity, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING inventory_id, item_name, vendor_id, vendor_inventory_number, price, quantity, created_at
        `;
        
        const result = await db.query(insertQuery, [
            sanitizedItemName,
            parsedVendorId,
            sanitizedInventoryNumber,
            parsedPrice,
            parsedQuantity,
            req.session.user!.id // Admin user who created the item
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
* Security: Rejects requests that include vendor_id in the body to prevent ID spoofing.
*/
router.post('/vendor/add', requireAuth, requireUserType('vendor'), async (req, res) => {
    const { item_name, vendor_inventory_number, price, quantity, vendor_id } = req.body;

    // SECURITY: Reject if vendor_id is provided in the request body
    // This prevents vendors from spoofing their vendor ID to add items for other vendors
    if (vendor_id !== undefined) {
        return res.status(403).json({
            success: false,
            message: 'Vendor ID cannot be specified. It is automatically determined from your session.'
        });
    }

    // Get vendor_id from session (user's ID serves as their vendor ID)
    const sessionVendorId = req.session.user!.vendorId || req.session.user!.id;

    if (!sessionVendorId) {
        return res.status(403).json({
            success: false,
            message: 'Unable to determine vendor ID from session. Please log in again.'
        });
    }

    // Validate required fields
    if (!item_name || !vendor_inventory_number || price === undefined || quantity === undefined) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required: item_name, vendor_inventory_number, price, quantity'
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

    // Sanitize item_name and vendor_inventory_number
    const sanitizedItemName = item_name.toString().trim();
    const sanitizedInventoryNumber = vendor_inventory_number.toString().trim();

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
            INSERT INTO inventory (item_name, vendor_id, vendor_inventory_number, price, quantity, created_by)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING inventory_id, item_name, vendor_id, vendor_inventory_number, price, quantity, created_at
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