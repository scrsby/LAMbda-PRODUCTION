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

const router = Router();

/* CREATE ACCOUNT
*  Route to create a new user account with access token validation
*  PARAMETERS: email, accessToken, username, password
*  RETURNS: Success message or error
*/
router.post('/createAccount', async (req: any, res: any) => {
    const { email, accessToken, username, password } = req.body;

    // Validate required fields
    if (!email || !accessToken || !username || !password) {
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
                SELECT id FROM users WHERE email = $1 OR username = $2
            `;
            const userCheckResult = await client.query(userCheckQuery, [email, username]);

            if (userCheckResult.rows.length > 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'User with this email or username already exists'
                });
            }

            // TODO: Hash the password using bcrypt before storing
            // For now, we'll store it as plain text (NOT RECOMMENDED FOR PRODUCTION)
            // Install bcrypt: npm install bcrypt @types/bcrypt
            // import bcrypt from 'bcrypt';
            // const hashedPassword = await bcrypt.hash(password, 10);

            // Create the user account
            const createUserQuery = `
                INSERT INTO users (email, username, password, created_at)
                VALUES ($1, $2, $3, NOW())
                RETURNING id, email, username, created_at
            `;
            const createUserResult = await client.query(createUserQuery, [
                email,
                username,
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
                    id: createUserResult.rows[0].id,
                    email: createUserResult.rows[0].email,
                    username: createUserResult.rows[0].username,
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

export default router;
