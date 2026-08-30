import express from 'express';
import rateLimit from 'express-rate-limit';
import { randomInt } from 'crypto';
import db from '../config/db.js';
import { sendEmail } from '../services/mailer.js'
import { requireAuth, requireUserType } from '../utils/auth-middleware.js';

const router = express.Router();

const adminRouteRateLimit = rateLimit({
    windowMs: 60 * 1000,
    limit: 120,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req: express.Request, res: express.Response) => {
        res.status(429).json({ error: 'Too many admin requests. Please wait a moment and try again.' });
    }
});

function generateAccessToken(): number {
    return randomInt(100000, 1000000);
}

function createMagicLink(email: string, access_token: number, baseUrl: string) {
    const magicLink = `${baseUrl}/auth/create-account?token=${access_token}&email=${encodeURIComponent(email)}`;
    return magicLink;
}

async function sendAccessTokenEmail(email: string, accessToken: number, baseUrl: string) {
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

router.post('/createNewUser', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (req: any, res: any) => {
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
                const insertQuery = `
                    INSERT INTO access_tokens(created_by, email, user_type, expires_at, access_token, vendor_id)
                    VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, $5)
                `;
                const vendorIdValue = (user_type === 'vendor' && vendor_id != null) ? parseInt(vendor_id, 10) : null;
                let accessToken: number = 0;
                const maxRetries = 5;
                for (let attempt = 0; attempt < maxRetries; attempt++) {
                    accessToken = generateAccessToken();
                    try {
                        await client.query(insertQuery, [req.session.user.id, email, user_type, accessToken, vendorIdValue]);
                        break;
                    } catch (insertError: any) {
                        if (insertError.code === '23505' && attempt < maxRetries - 1) {
                            continue; // Retry with a new token
                        }
                        throw insertError;
                    }
                }

                // Send email BEFORE committing the transaction
                try {
                    await sendAccessTokenEmail(email, accessToken, baseUrl);
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
                    access_token: accessToken,
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

router.post('/regenerateAccessToken', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (req: any, res: any) => {
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

        // Check if access token exists for this email and retrieve user_type and vendor_id for re-use
        const checkQuery = 'SELECT user_type, vendor_id FROM access_tokens WHERE email = $1';
        const checkResult = await client.query(checkQuery, [email]);

        if (checkResult.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({
                success: false,
                message: 'No access token found for this email'
            });
        }

        const userType = checkResult.rows[0].user_type;
        const existingVendorId = checkResult.rows[0].vendor_id ?? null;

        // Delete the old access token
        await client.query('DELETE FROM access_tokens WHERE email = $1', [email]);

        await client.query('COMMIT');

        // GENERATE NEW TOKEN AND SEND EMAIL
        await client.query('BEGIN');

        // Create new access token, preserving user_type, vendor_id, and setting a fresh expiry
        const insertQuery = `
            INSERT INTO access_tokens(created_by, email, user_type, expires_at, access_token, vendor_id)
            VALUES ($1, $2, $3, NOW() + INTERVAL '7 days', $4, $5)
        `;
        let newAccessToken: number = 0;
        const maxRetries = 5;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            newAccessToken = generateAccessToken();
            try {
                await client.query(insertQuery, [req.session.user.id, email, userType, newAccessToken, existingVendorId]);
                break;
            } catch (insertError: any) {
                if (insertError.code === '23505' && attempt < maxRetries - 1) {
                    continue; // Retry with a new token
                }
                throw insertError;
            }
        }

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


/* GET ALL USERS
 * Returns all existing users from the users table.
 */
router.get('/getUsers', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (_req, res) => {
    try {
        const result = await db.query(`
            SELECT user_id, last_name, first_name, vendor_id, email, phone, user_type
            FROM users
            ORDER BY last_name ASC, first_name ASC
        `);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching users' });
    }
});

/* DELETE USER
 * Deletes a user by user_id. Prevents an admin from deleting their own account.
 */
router.delete('/deleteUser/:userId', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (req: any, res: any) => {
    const { userId } = req.params;

    if (!userId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    if (req.session?.user?.id?.toString() === userId.toString()) {
        return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    try {
        const result = await db.query('DELETE FROM users WHERE user_id = $1 RETURNING user_id', [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        res.status(200).json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ success: false, message: 'Internal server error while deleting user' });
    }
});

/* GET ALL VENDORS
 * Returns all vendors from the vendors table.
 */
router.get('/getVendors', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (_req, res) => {
    try {
        const result = await db.query(`
            SELECT vendor_id, created_at
            FROM vendors
            ORDER BY vendor_id ASC
        `);
        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching vendors:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching vendors' });
    }
});

/* CREATE VENDOR
 * Creates a new vendor entry. Optionally accepts a specific vendor_id;
 * if omitted the SERIAL default is used.
 */
router.post('/createVendor', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (req: any, res: any) => {
    const { vendor_id } = req.body;

    try {
        let result;
        if (vendor_id !== undefined && vendor_id !== null && vendor_id !== '') {
            const id = parseInt(vendor_id, 10);
            if (isNaN(id) || id <= 0) {
                return res.status(400).json({ success: false, message: 'Vendor ID must be a positive integer' });
            }
            result = await db.query(
                'INSERT INTO vendors (vendor_id) VALUES ($1) RETURNING vendor_id, created_at',
                [id]
            );
        } else {
            result = await db.query(
                'INSERT INTO vendors DEFAULT VALUES RETURNING vendor_id, created_at'
            );
        }
        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error creating vendor:', error);
        if (error.code === '23505') {
            return res.status(409).json({ success: false, message: 'A vendor with this ID already exists' });
        }
        res.status(500).json({ success: false, message: 'Internal server error while creating vendor' });
    }
});

router.get('/discounts', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (_req, res) => {
    try {
        const result = await db.query(`
            SELECT discount_id, vendor_id, description, start_time, end_time, created_at
            FROM discounts
            ORDER BY start_time DESC, end_time DESC, discount_id DESC
        `);

        res.status(200).json({ success: true, data: result.rows });
    } catch (error) {
        console.error('Error fetching discounts:', error);
        res.status(500).json({ success: false, message: 'Internal server error while fetching discounts' });
    }
});

router.post('/discounts', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (req: any, res: any) => {
    const vendorId = parseInt(req.body?.vendor_id, 10);
    const description = typeof req.body?.description === 'string' ? req.body.description.trim() : '';
    const startTimeValue = typeof req.body?.start_time === 'string' ? req.body.start_time.trim() : '';
    const endTimeValue = typeof req.body?.end_time === 'string' ? req.body.end_time.trim() : '';
    const startTime = new Date(startTimeValue);
    const endTime = new Date(endTimeValue);

    if (!Number.isInteger(vendorId) || vendorId <= 0) {
        return res.status(400).json({ success: false, message: 'Vendor ID must be a positive integer' });
    }
    if (!description) {
        return res.status(400).json({ success: false, message: 'Description is required' });
    }
    if (!startTimeValue || !endTimeValue) {
        return res.status(400).json({ success: false, message: 'Start time and end time are required' });
    }
    if (Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
        return res.status(400).json({ success: false, message: 'Start time and end time must be valid dates' });
    }
    if (endTime <= startTime) {
        return res.status(400).json({ success: false, message: 'End time must be after start time' });
    }

    try {
        const result = await db.query(
            `INSERT INTO discounts (vendor_id, description, start_time, end_time)
             VALUES ($1, $2, $3, $4)
             RETURNING discount_id, vendor_id, description, start_time, end_time, created_at`,
            [vendorId, description, startTime.toISOString(), endTime.toISOString()]
        );

        res.status(201).json({ success: true, data: result.rows[0] });
    } catch (error: any) {
        console.error('Error creating discount:', error);
        if (error.code === '23503') {
            return res.status(400).json({ success: false, message: 'Vendor ID does not exist' });
        }
        if (error.code === '23514') {
            return res.status(400).json({ success: false, message: 'End time must be after start time' });
        }
        res.status(500).json({ success: false, message: 'Internal server error while creating discount' });
    }
});

router.delete('/discounts/:discountId', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (req: any, res: any) => {
    const discountId = parseInt(req.params?.discountId, 10);

    if (!Number.isInteger(discountId) || discountId <= 0) {
        return res.status(400).json({ success: false, message: 'Discount ID must be a positive integer' });
    }

    try {
        const result = await db.query(
            'DELETE FROM discounts WHERE discount_id = $1 RETURNING discount_id',
            [discountId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Discount not found' });
        }

        res.status(200).json({ success: true, message: 'Discount deleted successfully' });
    } catch (error) {
        console.error('Error deleting discount:', error);
        res.status(500).json({ success: false, message: 'Internal server error while deleting discount' });
    }
});

/* DELETE VENDOR
 * Deletes a vendor by vendor_id.
 */
router.delete('/deleteVendor/:vendorId', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (req: any, res: any) => {
    const { vendorId } = req.params;

    if (!vendorId) {
        return res.status(400).json({ success: false, message: 'Vendor ID is required' });
    }

    try {
        const result = await db.query('DELETE FROM vendors WHERE vendor_id = $1 RETURNING vendor_id', [vendorId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Vendor not found' });
        }

        res.status(200).json({ success: true, message: 'Vendor deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting vendor:', error);
        if (error.code === '23503') {
            return res.status(409).json({
                success: false,
                message: 'You must delete all associated users before deleting this vendor'
            });
        }
        res.status(500).json({ success: false, message: 'Internal server error while deleting vendor' });
    }
});

/* GET CLOSED TICKETS (SALES)
 * Returns all closed tickets for the admin sales report, with optional filters.
 * Also returns today's daily sales total and commission.
 */
router.get('/sales', requireAuth, requireUserType('admin'), adminRouteRateLimit, async (req, res) => {
    const orderId = req.query.orderId?.toString().trim();
    const itemSearch = req.query.itemSearch?.toString().trim();
    const startDate = req.query.startDate?.toString().trim();
    const endDate = req.query.endDate?.toString().trim();
    const employee = req.query.employee?.toString().trim();

    const conditions: string[] = [`t.ticket_status IN ('closed', 'partially_refunded', 'refunded')`];
    const values: string[] = [];

    if (orderId) {
        values.push(`%${orderId}%`);
        conditions.push(`CAST(t.ticket_id AS TEXT) ILIKE $${values.length}`);
    }

    if (itemSearch) {
        values.push(`%${itemSearch}%`);
        conditions.push(
            `EXISTS (
                SELECT 1
                FROM ticket_items ti
                WHERE ti.ticket_id = t.ticket_id
                  AND ti.item_name ILIKE $${values.length}
            )`
        );
    }

    if (startDate) {
        values.push(startDate);
        conditions.push(`t.created_at >= $${values.length}`);
    }

    if (endDate) {
        values.push(endDate);
        conditions.push(`t.created_at <= $${values.length}`);
    }

    if (employee) {
        values.push(`%${employee}%`);
        conditions.push(
            `COALESCE(
                NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
                u.email,
                CONCAT('Employee #', t.cashier_id::text)
            ) ILIKE $${values.length}`
        );
    }

    try {
        const ticketsResult = await db.query(
            `SELECT t.ticket_id,
                    t.cashier_id,
                    t.created_at,
                    t.ticket_status,
                    COALESCE(t.total, 0)::float AS total,
                    COALESCE(
                        NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
                        u.email,
                        CONCAT('Employee #', t.cashier_id::text)
                    ) AS employee_name
             FROM tickets t
             LEFT JOIN users u ON u.user_id = t.cashier_id
             WHERE ${conditions.join(' AND ')}
             ORDER BY t.created_at DESC`,
            values
        );

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

        const dailyResult = await db.query(
            `SELECT COALESCE(SUM(total), 0)::float AS daily_total
             FROM tickets
             WHERE ticket_status IN ('closed', 'partially_refunded', 'refunded')
               AND created_at >= $1
               AND created_at <= $2`,
            [startOfDay, endOfDay]
        );

        const dailySalesTotal = dailyResult.rows[0].daily_total as number;
        const dailyCommission = parseFloat((dailySalesTotal * 0.10).toFixed(2));

        res.status(200).json({
            tickets: ticketsResult.rows,
            dailySalesTotal,
            dailyCommission
        });
    } catch (error) {
        console.error('Error fetching sales data:', error);
        res.status(500).json({ error: 'Failed to fetch sales data' });
    }
});

export default router;