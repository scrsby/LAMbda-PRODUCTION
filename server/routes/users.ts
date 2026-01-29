/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Authentication Routes
 File: auth.ts
 Required by: 
 Description: Handles 
 Functions: 
 Last Edited: 25 January 2026
*/ 

import express from 'express';
import db from '../config/db.js'; // Import your database connection

const router = express.Router();

/// USER CREATION SEQUENCE
//  Route handling the insertion of new users into the database, generation of access keys, and inital email to user containing access key
//  PARAMETERS: email
//  RETURNS: 
router.post('/createNewUser', async (req: any, res: any) => {
    const { email } = req.body;
    
    try {
        // Check if user already exists
        const [existingUser]: any = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        // USER CREATION SEQUENCE - Start transaction
        await db.query('BEGIN');
        
        try {
            const insertUser = 'INSERT INTO users(email) VALUES($1) RETURNING id';
            const userResult = await db.query(insertUser, [email]);
            
            const createAccessToken = 'INSERT INTO access_tokens VALUES ($1) RETURNING access_token';
            const tokenResult = await db.query(createAccessToken, [userResult.rows[0].id]);
            
            // Commit the transaction
            await db.query('COMMIT');
            
            // Return success response
            res.status(201).json({ 
                message: 'User created successfully',
                access_token: tokenResult.rows[0].access_token,
                user_id: userResult.rows[0].id
            });
            
        } catch (transactionError) {
            await db.query('ROLLBACK'); // Rollback on any transaction error
            throw transactionError; // Re-throw to be caught by outer catch
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;