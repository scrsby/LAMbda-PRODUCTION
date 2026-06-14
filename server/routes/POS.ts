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

/* CREATE TICKET
* Endpoint to create a new receipt and process a transaction
* Request body is empty, return the new receipt ID and details for items to be added
*/
router.post('/create-ticket', async (req, res) => {
    try {
        // 1. Create a new ticket in the database with status "open"
        const newTicket = await db.query(
            'INSERT INTO tickets (status, created_at, cashier_id) VALUES ($1, NOW(), 2) RETURNING ticket_id, created_at',
            ['open']
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
        const ticketResult = await db.query(
            'SELECT ticket_id, cashier_id, created_at, ticket_status, total FROM tickets WHERE ticket_id = $1',
            [ticketId]
        );
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        const itemsResult = await db.query(
            `SELECT ticket_item_id,
                    vendor_id,
                    inventory_code        AS vendor_inventory_id,
                    item_name             AS name,
                    base_price::float     AS vendor_price,
                    discount_percent,
                    discount_amount::float AS discount_amount,
                    final_price::float    AS final_price,
                    quantity
             FROM ticket_items
             WHERE ticket_id = $1`,
            [ticketId]
        );
        res.status(200).json({ ticket: ticketResult.rows[0], items: itemsResult.rows });
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Failed to fetch ticket' });
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
    const { startDate, endDate } = req.query;
});

/* GET TICKET DETAILS
* Endpoint to retrieve details of a specific receipt
*/
router.get('/receipt/:id', async (req, res) => {
    const receiptId = req.params.id;
});

export default router;
