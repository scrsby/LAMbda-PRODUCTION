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
import { sendEmail } from '../services/mailer.js'

const router = express.Router();

/// USER CREATION SEQUENCE
//  Route handling the insertion of new users into the database, generation of access keys, and inital email to user containing access key
//  PARAMETERS: email
//  RETURNS: 
router.post('/createNewUser', async (req: any, res: any) => {
    const { email } = req.body;

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

    // USER CREATION SEQUENCE - Start transaction
    await db.query('BEGIN');
        
    try {
            
            const createAccessToken = 'INSERT INTO access_tokens(created_by, email) VALUES ($1, $2) RETURNING access_token';
            const tokenResult = await db.query(createAccessToken, ['001', email]);

            // Send email BEFORE committing the transaction
            try {
                await sendAccessTokenEmail(email, tokenResult.rows[0].access_token);
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

/*
const mailOptions = {
    from: '"LAMbda Team" <no-reply@terminalvelocitydevelopment.com>',
    to: userEmail,
    subject: "Subject",
    text: `Text-Based Email body`,
    html: `HTML-Based Email body`,
  };
*/

async function sendAccessTokenEmail(email: string, accessToken: string){
    const mailOptions = {
        from: '"LAMbda Team" <no-reply@terminalvelocitydevelopment.com>',
        to: email,
        subject: "Access Token",
        text: `Your access token is: ${accessToken}`,
        html: `<p>Your access token is: <strong>${accessToken}</strong></p>`
    }

    try {
        await sendEmail(mailOptions);
        console.log('Access token email sent successfully to:', email);
    } catch (error) {
        console.error('Error sending access token email to', email, ':', error);
        throw error; // Re-throw so transaction can be rolled back
    }
    
}

export default router;