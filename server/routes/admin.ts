import express from 'express';
import db from '../config/db.js';
import { sendEmail } from '../services/mailer.js'

const router = express.Router();

function createMagicLink(email: string, access_token: string, baseUrl: string) {
    const magicLink = `${baseUrl}/auth/create-account?token=${access_token}&email=${encodeURIComponent(email)}`;
    return magicLink;
}

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
        throw error;
    }

}

router.get('/getAllAccessTokens', async (req: any, res: any) => {
    try {
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

router.post('/createNewUser', async (req: any, res: any) => {
    const { email, baseUrl, user_type, vendor_id } = req.body;
    console.log('Received request to create new user with email:', email, 'user_type:', user_type, 'vendor_id:', vendor_id);

    // Wrap sequence in try statement to catch any miscelaneous errors
    try {
        const client = await db.connect();

        try {
            // Duplicate Entry Check: Search access_token table for entries with the current email
            const existingToken: any = await client.query('SELECT expires_at FROM access_tokens WHERE email = $1', [email]);

            // If the existingToken query returns a row, then there is already an access token in the database that needs to be deleted before a new one is created
            if (existingToken.rows.length > 0) {
            
                // Check to see if the access token has expired yet
                // The null check handles legacy rows that may have been created before expires_at was explicitly set
                const isExpired = existingToken.rows[0].expires_at === null || new Date(existingToken.rows[0].expires_at) < new Date();
                
                // If the token has expired, try to delete it from the table
                // If it has not expired, send a message to the user
                if (isExpired) {
                    await client.query('DELETE FROM access_tokens WHERE email = $1', [email]);
                    // Proceed to create a new access token below
                } else {
                    // Token exists and is still valid
                    return res.status(400).json({ message: 'User already has a valid access token' }); // Exit the function
                }
            }

            // Check if user already exists in users table
            const userCheckResult = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);

            if (userCheckResult.rows.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'User with this email already exists' 
                });
            }

            // USER CREATION SEQUENCE - Start transaction
            await client.query('BEGIN');

            try {        
                const createAccessToken = `
                    INSERT INTO access_tokens(created_by, email, user_type, expires_at)
                    VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')
                    RETURNING access_token
                `;
                const tokenResult = await client.query(createAccessToken, ['001', email, user_type]);

                // Send email BEFORE committing the transaction
                try {
                    await sendAccessTokenEmail(email, tokenResult.rows[0].access_token, baseUrl);
                    console.log('Email sent successfully to:', email);
                } catch (emailError) {
                    console.error('Failed to send email:', emailError);
                    throw new Error('Failed to send access token email');
                }
                
                // Only commit if email was sent successfully
                await client.query('COMMIT');
                
                // Return success response
                res.status(201).json({ 
                    message: 'User created successfully and email sent',
                    access_token: tokenResult.rows[0].access_token,
                });
                
            } catch (transactionError: any) {
                await client.query('ROLLBACK'); // Rollback on any transaction error
                
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
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/regenerateAccessToken', async (req: any, res: any) => {
    const { email, baseUrl } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Email is required'
        });
    }

    let client;
    try {
        client = await db.connect();
    } catch (connError) {
        console.error('Error connecting to database:', connError);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while regenerating access token'
        });
    }

    try {
        // DELETE OLD TOKEN
        await client.query('BEGIN');

        // Check if access token exists for this email and retrieve user_type for re-use
        const checkQuery = 'SELECT user_type FROM access_tokens WHERE email = $1';
        const checkResult = await client.query(checkQuery, [email]);

        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'No access token found for this email'
            });
        }

        const userType = checkResult.rows[0].user_type;

        // Delete the old access token
        await client.query('DELETE FROM access_tokens WHERE email = $1', [email]);

        await client.query('COMMIT');

        // GENERATE NEW TOKEN AND SEND EMAIL
        await client.query('BEGIN');

        // Create new access token, preserving user_type and setting a fresh expiry
        const createAccessToken = `
            INSERT INTO access_tokens(created_by, email, user_type, expires_at)
            VALUES ($1, $2, $3, NOW() + INTERVAL '7 days')
            RETURNING access_token
        `;
        const tokenResult = await client.query(createAccessToken, ['001', email, userType]); // TODO: Replace '001' with actual admin user ID when auth is implemented
        const newAccessToken = tokenResult.rows[0].access_token;

        // Try to send email - if it fails, rollback the new token insertion and return error
        try {
            await sendAccessTokenEmail(email, newAccessToken, baseUrl);
            console.log('Regenerated token email sent successfully to:', email);

            await client.query('COMMIT');

            res.status(200).json({
                success: true,
                message: 'Access token regenerated and email sent successfully',
                emailSent: true
            });

        } catch (emailError) {
            console.error('Failed to send regenerated token email:', emailError);

            await client.query('ROLLBACK');

            return res.status(500).json({
                success: false,
                message: 'Failed to send access token email. Both old and new tokens have been deleted. Please try again.',
                emailSent: false
            });
        }
        
    } catch (error) {
        console.error('Error regenerating access token:', error);
        
        try { await client.query('ROLLBACK'); } catch (rollbackErr) { console.error('Rollback failed:', rollbackErr); }

        res.status(500).json({
            success: false,
            message: 'Internal server error while regenerating access token'
        });
    } finally {
        client.release();
    }
});


export default router;