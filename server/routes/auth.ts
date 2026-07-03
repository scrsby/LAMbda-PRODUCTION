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
                SELECT email, expires_at, user_type
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

            // Hash the password using bcrypt before storing
            const hashedPassword = await bcrypt.hash(password, 10);

            // Create the user account
            const createUserQuery = `
                INSERT INTO users (email, password_hash, user_type)
                VALUES ($1, $2, $3)
                RETURNING user_id, email, created_at
            `;
            const createUserResult = await client.query(createUserQuery, [
                email,
                hashedPassword,
                tokenData.user_type
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
            // Fetch user by email (include profile fields for completeness check)
            const loginQuery = `
                SELECT user_id, email, password_hash, user_type, first_name, last_name, phone
                FROM users
                WHERE email = $1
            `;
            const loginResult = await client.query(loginQuery, [email]);

            if (loginResult.rows.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            const user = loginResult.rows[0];

            // Verify password using bcrypt
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            // Store user data in session
            req.session.user = {
                id: user.user_id,
                email: user.email,
                userType: user.user_type,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone
            };

            res.status(200).json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.user_id,
                    email: user.email,
                    user_type: user.user_type,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    phone: user.phone
                }
            });

        } catch(error) {
            // Query error
            console.error('Error authenticating user:', error);
            throw error;
        }
     } catch(error) {
        // Connection error
        console.error('Error authenticating user:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while creating account'
        });
     };

});

/* LOGOUT
*  Params: none
*  Returns: Success message or error
*  Desc: Destroys the user's session and clears the session cookie
*/
router.post('/logout', (req: any, res: any) => {
    req.session.destroy((err: Error) => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).json({
                success: false,
                message: 'Error logging out'
            });
        }
        res.clearCookie('connect.sid'); // Default session cookie name
        res.status(200).json({
            success: true,
            message: 'Logged out successfully'
        });
    });
});

/* GET CURRENT USER
*  Params: none
*  Returns: Current session user data or unauthorized error
*  Desc: Returns the currently logged in user's information from their session
*/
router.get('/me', (req: any, res: any) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }
    res.status(200).json({
        success: true,
        user: req.session.user
    });
});

/* UPDATE PROFILE
*  Params: firstName, lastName, phone (all optional)
*  Returns: Success message or error
*  Desc: Updates the user's profile information (first name, last name, phone)
*/
router.post('/update-profile', async (req: any, res: any) => {
    // Check if user is authenticated
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }

    const { firstName, lastName, phone } = req.body;
    const userId = req.session.user.id;

    // Validate that at least one field is provided
    if (!firstName && !lastName && !phone) {
        return res.status(400).json({
            success: false,
            message: 'At least one field (firstName, lastName, or phone) is required'
        });
    }

    try {
        const client = await db.connect();

        try {
            // Build dynamic update query based on provided fields
            const updates: string[] = [];
            const values: any[] = [];
            let paramIndex = 1;

            if (firstName !== undefined && firstName !== null) {
                updates.push(`first_name = $${paramIndex}`);
                values.push(firstName);
                paramIndex++;
            }

            if (lastName !== undefined && lastName !== null) {
                updates.push(`last_name = $${paramIndex}`);
                values.push(lastName);
                paramIndex++;
            }

            if (phone !== undefined && phone !== null) {
                updates.push(`phone = $${paramIndex}`);
                values.push(phone);
                paramIndex++;
            }

            // Add user_id as the last parameter
            values.push(userId);

            const updateQuery = `
                UPDATE users
                SET ${updates.join(', ')}
                WHERE user_id = $${paramIndex}
                RETURNING user_id, email, first_name, last_name, phone
            `;

            const result = await client.query(updateQuery, values);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const updatedUser = result.rows[0];

            // Update session with new info
            req.session.user = {
                ...req.session.user,
                firstName: updatedUser.first_name,
                lastName: updatedUser.last_name,
                phone: updatedUser.phone
            };

            res.status(200).json({
                success: true,
                message: 'Profile updated successfully',
                user: {
                    id: updatedUser.user_id,
                    email: updatedUser.email,
                    firstName: updatedUser.first_name,
                    lastName: updatedUser.last_name,
                    phone: updatedUser.phone
                }
            });

        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error updating profile:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while updating profile'
        });
    }
});

export default router;
