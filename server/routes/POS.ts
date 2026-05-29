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

/* ADD TO TICKET
* Endpoint to add items to a ticket by inserting into the ticket_items table and updating the total
* Request body should include ticketId and an array of items (each with productId, quantity, price)
*/
router.post('/add-to-ticket', async (req, res) => {
    const { receiptId, items } = req.body;
    try {
        // 1. Insert items into ticket_items table
        for (const item of items) {
            await db.query(
                'INSERT INTO ticket_items (ticket_id, product_id, quantity, price) VALUES ($1, $2, $3, $4)',
                [receiptId, item.itemId, item.quantity, item.price]
            );
        }
        // 2. Update the total price in the tickets table
        const totalPrice = items.reduce((total: number, item: any) => total + item.quantity * item.price, 0);
        await db.query(
            'UPDATE tickets SET total_price = total_price + $1 WHERE id = $2',
            [totalPrice, receiptId]
        );
        res.status(200).json({ message: 'Items added to ticket successfully' });
    } catch (error) {
        console.error('Error adding items to ticket:', error);
        res.status(500).json({ error: 'Failed to add items to ticket' });
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
