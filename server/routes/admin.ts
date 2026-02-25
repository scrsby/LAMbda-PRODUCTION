/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 PREFIX: admin/
 Name: Authentication Routes
 File: auth.ts
 Description: Handles the admin routes for creating new users and regenerating access tokens. This file is imported into app.js and mounted at the /admin path.
 Functions: 
 Last Edited: 10 February 2026
*/ 

import express from 'express';
import db from '../config/db.js'; // Import your database connection
import { sendEmail } from '../services/mailer.js'

const router = express.Router();

/// HELPER FUNCTIONS

/* CREATE MAGIC LINK
*  Params: email, access_token
*  Returns: magic_link
*  Desc: Creates a magic link URL for the user to click in their email, which will direct them to the account creation page with their access token as a query parameter
*/
function createMagicLink(email: string, access_token: string, baseUrl: string) {
    const magicLink = `${baseUrl}/auth/create-account?token=${access_token}&email=${encodeURIComponent(email)}`;
    return magicLink;
}


/* SEND ACCESS TOKEN EMAIL
*  Params: email, access_token
*  Returns: void
*  Desc: Sends an email to the user with their access token and a link to create their account. This function is called after a new access token is generated in the database.
*/
async function sendAccessTokenEmail(email: string, accessToken: string, baseUrl: string) {
    const mailOptions = {
        from: '"LAMbda Team" <no-reply@terminalvelocitydevelopment.com>',
        to: email,
        subject: "Welcome to LAMbda - Create Your Account",
        text: `Welcome to LAMbda! Click the following link to create your account: ${createMagicLink(email, accessToken, baseUrl)} Your access token is: ${accessToken}`,
        html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8f9fa;">
            <div style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); padding: 40px; text-align: center;">
                <h1 style="color: #2c3e50; margin-bottom: 30px; font-size: 28px; font-weight: 600;">Welcome to LAMbda</h1>
                
                <p style="color: #555; font-size: 16px; margin-bottom: 30px;">
                    You're just one step away from accessing your account. Click the button below to complete your registration.
                </p>
                
                <div style="margin: 40px 0;">
                    <a href="${createMagicLink(email, accessToken, baseUrl)}" 
                       style="display: inline-block; 
                              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                              color: white; 
                              text-decoration: none; 
                              padding: 16px 32px; 
                              border-radius: 8px; 
                              font-weight: 600; 
                              font-size: 16px; 
                              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
                              transition: transform 0.2s ease;">
                        Create Your Account
                    </a>
                </div>
                
                <div style="background-color: #f1f3f4; 
                           border: 1px solid #e0e0e0; 
                           border-radius: 8px; 
                           padding: 20px; 
                           margin: 30px 0; 
                           text-align: center;">
                    <p style="color: #666; font-size: 14px; margin-bottom: 10px;">Your Access Token:</p>
                    <p style="color: #333; font-weight: bold; font-size: 16px; font-family: 'Courier New', monospace; margin: 0; word-break: break-all;">
                        ${accessToken}
                    </p>
                </div>
                
                <p style="color: #888; font-size: 14px; margin-top: 30px;">
                    If you didn't request this account, please ignore this email.
                </p>
            </div>
            
            <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
                © 2026 LAMbda Team - Terminal Velocity Development
            </div>
        </div>
        `
    }

    try {
        await sendEmail(mailOptions);
        console.log('Access token email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending access token email to', email, ':', error);
        throw error; // Re-throw so transaction can be rolled back
    }

}

/* GET ALL ACCESS TOKENS
*  Route to fetch all users with access tokens from the database
*  PARAMETERS: None
*  RETURNS: Array of access token records
*/
router.get('/getAllAccessTokens', async (req: any, res: any) => {
    try {
        // Query to get all access tokens with their status
        const query = `
            SELECT
                email,
                access_token,
                created_by,
                created_at,
                expires_at,
                CASE
                    WHEN expires_at > NOW() THEN 'active'
                    ELSE 'inactive'
                END as status
            FROM access_tokens
            ORDER BY created_at DESC
        `;

        const result = await db.query(query);

        res.status(200).json({
            success: true,
            data: result.rows
        });

    } catch (error) {
        console.error('Error fetching access tokens:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error while fetching access tokens'
        });
    }
});

/// USER CREATION SEQUENCE
//  Route handling the insertion of new users into the database, generation of access keys, and inital email to user containing access key
//  PARAMETERS: email
//  RETURNS: 
router.post('/createNewUser', async (req: any, res: any) => {
    const { email, baseUrl, user_type, vendor_id } = req.body;
    console.log('Received request to create new user with email:', email, 'user_type:', user_type, 'vendor_id:', vendor_id);

    // Wrap sequence in try statement to catch any miscelaneous errors
    try {

        // Duplicate Entry Check: Search access_token table for entries with the current email
        const existingToken: any = await db.query('SELECT expires_at FROM access_tokens WHERE email = $1', [email]);

        // If the existingToken query returns a row, then there is already an access token in the database that needs to be deleted before a new one is created
        if (existingToken.rows.length > 0) {
        
            // Check to see if the access token has expired yet
            const isExpired = new Date(existingToken.rows[0].expires_at) < new Date();
            
            // If the token has expired, try to delete it from the table
            // If it has not expired, send a message to the user
            if (isExpired) {
                const deleteTokenQuery = 'DELETE FROM access_tokens WHERE email = $1';
                await db.query(deleteTokenQuery, [email]);
                // Proceed to create a new access token below
            } else {
                // Token exists and is still valid
                return res.status(400).json({ message: 'User already has a valid access token' }); // Exit the function
            }
        }

        // Check if user already exists in users table
        const userCheckQuery = `SELECT user_id FROM users WHERE email = $1`;
        const userCheckResult = await db.query(userCheckQuery, [email]);

        if (userCheckResult.rows.length > 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'User with this email already exists' 
            });
        }

    // USER CREATION SEQUENCE - Start transaction
    await db.query('BEGIN');

    try {        
            const createAccessToken = 'INSERT INTO access_tokens(created_by, email, user_type) VALUES ($1, $2, $3) RETURNING access_token';
            const tokenResult = await db.query(createAccessToken, ['001', email, user_type]);

            // Send email BEFORE committing the transaction
            try {
                await sendAccessTokenEmail(email, tokenResult.rows[0].access_token, baseUrl);
                console.log('Email sent successfully to:', email);
            } catch (emailError) {
                console.error('Failed to send email:', emailError);
                throw new Error('Failed to send access token email');
            }
            
            // Only commit if email was sent successfully
            await db.query('COMMIT');
            
            // Return success response
            res.status(201).json({ 
                message: 'User created successfully and email sent',
                access_token: tokenResult.rows[0].access_token,
            });
            
        } catch (transactionError: any) {
            await db.query('ROLLBACK'); // Rollback on any transaction error
            
            // Handle specific database constraint errors
            if (transactionError.code === '23505') {
                if (transactionError.constraint === 'unique_email') {
                    return res.status(400).json({ message: 'Email already has an access token' });
                }
                return res.status(400).json({ message: 'Duplicate entry error' });
            }
            
            // Handle email sending errors
            if (transactionError.message?.includes('Failed to send access token email')) {
                return res.status(500).json({ message: 'User creation failed: Could not send access token email' });
            }
            
            throw transactionError; // Re-throw to be caught by outer catch
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

/* REGENERATE ACCESS TOKEN
*  The Regenerate Access Token flow consists of two distinct transactions: 1) Deletion of the old token, and 2) Creation of the new token and email sending.
*  The first transaction handles the deletion of the old token. If this transaction fails, the whole process fails and a new token shouldn't be generated.
*  The second transactio handles the creation of the new token and emailing to the user. If this transaction fails due to an insertion or STMP error, just rollback the creation of the new token and notify the admin that the new token could not be sent.
*  PARAMETERS: email, baseUrl
*  RETURNS: New access token and email send status
*/
router.post('/regenerateAccessToken', async (req: any, res: any) => {
    const { email, baseUrl } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required'
        });
    }

    // DELETE OLD TOKEN
    await db.query('BEGIN');

    try {
        // Check if access token exists for this email
        const checkQuery = 'SELECT * FROM access_tokens WHERE email = $1';
        const checkResult = await db.query(checkQuery, [email]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No access token found for this email'
            });
        }

        // Delete the old access token (always delete it regardless of outcome)
        const deleteQuery = 'DELETE FROM access_tokens WHERE email = $1';
        await db.query(deleteQuery, [email]);

        // Only commit if email was sent successfully
        await db.query('COMMIT');

        // GENERATE NEW TOKEN AND SEND EMAIL
        await db.query('BEGIN');

            // Create new access token by inserting a new record into the access_tokens table and returning the token
            const createAccessToken = 'INSERT INTO access_tokens(created_by, email) VALUES ($1, $2) RETURNING access_token';
            const tokenResult = await db.query(createAccessToken, ['001', email]); // TODO: Replace '001' with actual admin user ID when auth is implemented
            const newAccessToken = tokenResult.rows[0].access_token;
    
            // Try to send email - if it fails, delete the new token and return error
            try {
                await sendAccessTokenEmail(email, newAccessToken, baseUrl);
                console.log('Regenerated token email sent successfully to:', email);

                // Email sent successfully
                res.status(200).json({
                    success: true,
                    message: 'Access token regenerated and email sent successfully',
                    emailSent: true
                });

            } catch (emailError) {
                console.error('Failed to send regenerated token email:', emailError);

                await db.query('ROLLBACK'); // Rollback the transaction to delete the new token

                return res.status(500).json({
                    success: false,
                    message: 'Failed to send access token email. Both old and new tokens have been deleted. Please try again.',
                    emailSent: false
                });
            }
        
    } catch (error) {
        console.error('Error regenerating access token:', error);
        
        await db.query('ROLLBACK');

        res.status(500).json({
            success: false,
            message: 'Internal server error while regenerating access token'
        });
    }
});


export default router;