/*
  _               __  __ _         _
 | |        /\   |  \/  | |       | |
 | |       /  \  | \  / | |__   __| | __ _
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|

 Name: Authentication Routes
 File: auth.ts
 Description: Handles user authentication and account creation
 Last Edited: 9 February 2026
*/

import { Router } from 'express';
import db from '../config/db.js';
import { sendEmail } from '../services/mailer.js';
import bcrypt from 'bcrypt'; 

const router = Router();

/* CREATE ACCOUNT
*  Route to create a new user account with access token validation
*  PARAMETERS: email, accessToken, password
*  RETURNS: Success message or error
*/
router.post('/createAccount', async (req: any, res: any) => {
    const { email, accessToken, password } = req.body;

    // Validate required fields
    if (!email || !accessToken || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    try {
        // Start a transaction
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            // Validate access token and check if it matches the email
            const tokenQuery = `
                SELECT email, expires_at
                FROM access_tokens
                WHERE access_token = $1 AND email = $2
            `;
            const tokenResult = await client.query(tokenQuery, [accessToken, email]);
            console.log('Token query result:', tokenResult.rows); // Debug log

            if (tokenResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid access token or email does not match'
                });
            }

            const tokenData = tokenResult.rows[0];

            // Check if token has expired
            if (new Date(tokenData.expires_at) < new Date()) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Access token has expired'
                });
            }

            // Check if user already exists
            const userCheckQuery = `
                SELECT user_id FROM users WHERE email = $1
            `;
            const userCheckResult = await client.query(userCheckQuery, [email]);

            if (userCheckResult.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'User with this email already exists'
                });
            }

            // TODO: Hash the password using bcrypt before storing
            // Install bcrypt: npm install bcrypt @types/bcrypt
            // import bcrypt from 'bcrypt';
            // const hashedPassword = await bcrypt.hash(password, 10);


            // Create the user account
            const createUserQuery = `
                INSERT INTO users (email, password_hash, created_at)
                VALUES ($1, $2, NOW())
                RETURNING user_id, email, created_at
            `;
            const createUserResult = await client.query(createUserQuery, [
                email,
                password // Replace with hashedPassword when bcrypt is implemented
            ]);

            // Delete or mark the access token as used
            const deleteTokenQuery = `
                DELETE FROM access_tokens WHERE access_token = $1
            `;
            await client.query(deleteTokenQuery, [accessToken]);

            await client.query('COMMIT');

            res.status(201).json({
                success: true,
                message: 'Account created successfully',
                user: {
                    id: createUserResult.rows[0].user_id,
                    email: createUserResult.rows[0].email,
                    createdAt: createUserResult.rows[0].created_at
                }
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error creating account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while creating account'
        });
    }
});

/* LOGIN
*  Params: email, password
*  Returns: Success message or error
*  Desc: Authenticates a user with their email and password. This is a placeholder route and should be expanded with proper session handling or JWT token generation for production use.
*/
router.post('/login', async (req: any, res: any) => {
    const { email, password } = req.body;

    // Validate fields
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

     try {
        // Connect to database to begin transaction
        const client = await db.connect();

        try {
            // Validate username and password pair. TODO: Add hashing
            const loginQuery = `
                SELECT email, password_hash, user_type
                FROM users
                WHERE email = $1 AND password = $2
            `;
            const loginResult = await client.query(loginQuery, [email, password]);
            console.log('Token query result:', loginResult.rows); // Debug log

            res.status(201).json({
                success: true,
                message: 'Account created successfully',
                user: {
                    id: loginResult.rows[0].user_id,
                    email: loginResult.rows[0].email,
                    user_type: loginResult.rows[0].user_type
                }
            });

        } catch(error) {
            // Query error
            console.error('Error creating account:', error);
            throw error;
        };
     } catch(error) {
        // Connection error
        console.error('Error creating account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while creating account'
        });
     };

});

export default router;
