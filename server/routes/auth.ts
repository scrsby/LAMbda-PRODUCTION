import { Router } from 'express';
import { randomInt } from 'crypto';
import { sendEmail } from '../services/mailer.js'
import db from '../config/db.js';
import bcrypt from 'bcrypt'; 

const router = Router();
const SESSION_COOKIE_NAME = 'connect.sid';
const DATABASE_CONNECTION_ERROR_MESSAGE = 'Internal database connection error, please contact your admin';
const DATABASE_CONNECTION_ERROR_CODES = new Set([
    '08000',
    '08001',
    '08003',
    '08004',
    '08006',
    '08007',
    '08P01',
    '28P01',
    '3D000',
    'EAI_AGAIN',
    'ECONNREFUSED',
    'ENOTFOUND',
    'ETIMEDOUT'
]);

interface SessionAwareRequest {
    session?: {
        destroy: (callback: (err: Error) => void) => void;
        regenerate: (callback: (err: Error) => void) => void;
        user?: {
            email?: string;
            [key: string]: any;
        };
        [key: string]: any;
    };
}

function isDatabaseConnectionError(error: unknown): boolean {
    if (!(error instanceof Error)) {
        return false;
    }

    const errorWithCode = error as Error & { code?: string };
    const normalizedCode = errorWithCode.code?.toUpperCase();

    if (normalizedCode && DATABASE_CONNECTION_ERROR_CODES.has(normalizedCode)) {
        return true;
    }

    const normalizedMessage = error.message.toLowerCase();

    return [
        'database connection',
        'connection terminated unexpectedly',
        'client has encountered a connection error',
        'connect econnrefused',
        'getaddrinfo enotfound',
        'getaddrinfo eai_again',
        'timeout expired'
    ].some((fragment) => normalizedMessage.includes(fragment));
}

function getAuthFailureMessage(error: unknown, defaultMessage: string): string {
    return isDatabaseConnectionError(error)
        ? DATABASE_CONNECTION_ERROR_MESSAGE
        : defaultMessage;
}

function getSessionCookieOptions() {
    return {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' as const : 'lax' as const
    };
}

function destroySession(req: SessionAwareRequest): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!req.session) {
            resolve();
            return;
        }

        req.session.destroy((err: Error) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

function regenerateSession(req: SessionAwareRequest): Promise<void> {
    return new Promise((resolve, reject) => {
        if (!req.session) {
            reject(new Error('No session available for regeneration'));
            return;
        }

        req.session.regenerate((err: Error) => {
            if (err) {
                reject(err);
                return;
            }
            resolve();
        });
    });
}

router.post('/createAccount', async (req: any, res: any) => {
    const { email, accessToken, password } = req.body;

    if (!email || !accessToken || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

    const accessTokenInt = parseInt(accessToken, 10);
    if (isNaN(accessTokenInt)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid access token'
        });
    }

    try {
        const existingSessionEmail = req.session?.user?.email;
        if (existingSessionEmail && existingSessionEmail !== email) {
            // Prevent multiple active identities in one browser when a logged-in user opens
            // another user's setup email link.
            await regenerateSession(req);
        }
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown session reset error';
        console.error('Error resetting existing session during account setup:', message);
        return res.status(500).json({
            success: false,
            message: 'Internal server error while creating account'
        });
    }

    try {
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            const tokenQuery = `
                SELECT email, expires_at, user_type, vendor_id
                FROM access_tokens
                WHERE access_token = $1 AND email = $2
            `;
            const tokenResult = await client.query(tokenQuery, [accessTokenInt, email]);
            console.log('Token query result:', tokenResult.rows); // Debug log

            if (tokenResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid access token or email does not match'
                });
            }

            const tokenData = tokenResult.rows[0];

            if (new Date(tokenData.expires_at) < new Date()) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Access token has expired'
                });
            }

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

            const hashedPassword = await bcrypt.hash(password, 10);

            const vendorId = tokenData.user_type === 'vendor' ? (tokenData.vendor_id ?? null) : null;

            const createUserQuery = `
                INSERT INTO users (email, password_hash, user_type, vendor_id)
                VALUES ($1, $2, $3, $4)
                RETURNING user_id, email, created_at
            `;
            const createUserResult = await client.query(createUserQuery, [
                email,
                hashedPassword,
                tokenData.user_type,
                vendorId
            ]);

            const deleteTokenQuery = `
                DELETE FROM access_tokens WHERE access_token = $1
            `;
            await client.query(deleteTokenQuery, [accessTokenInt]);

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
            message: getAuthFailureMessage(error, 'Internal server error while creating account')
        });
    }
});

router.post('/login', async (req: any, res: any) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'All fields are required'
        });
    }

     try {
        const client = await db.connect();

        try {
            const loginQuery = `
                SELECT user_id, email, password_hash, user_type, first_name, last_name, phone, vendor_id
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
            const isPasswordValid = await bcrypt.compare(password, user.password_hash);

            if (!isPasswordValid) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid email or password'
                });
            }

            await regenerateSession(req);
            if (!req.session) {
                return res.status(500).json({
                    success: false,
                    message: 'Unable to initialize session'
                });
            }

            const sessionVendorId = user.user_type === 'vendor' ? (user.vendor_id ?? null) : undefined;
            req.session.user = {
                id: user.user_id,
                email: user.email,
                userType: user.user_type,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone,
                ...(sessionVendorId != null ? { vendorId: sessionVendorId } : {})
            };

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.user_id,
                    email: user.email,
                    user_type: user.user_type,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    phone: user.phone,
                    vendor_id: user.vendor_id ?? null
                }
            });

        } catch(error) {
            console.error('Error authenticating user:', error);
            throw error;
        } finally {
            client.release();
        }
     } catch(error) {
        console.error('Error authenticating user:', error);
        res.status(500).json({
            success: false,
            message: getAuthFailureMessage(error, 'Internal server error while authenticating user')
        });
     };

});

router.post('/logout', (req: any, res: any) => {
    destroySession(req)
        .then(() => {
            res.clearCookie(SESSION_COOKIE_NAME, getSessionCookieOptions());
            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });
        })
        .catch((err: Error) => {
            console.error('Error destroying session:', err);
            res.status(500).json({
                success: false,
                message: 'Error logging out'
            });
        });
});

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

router.post('/update-profile', async (req: any, res: any) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Not authenticated'
        });
    }

    const { firstName, lastName, phone } = req.body;
    const userId = req.session.user.id;

    if (!firstName && !lastName && !phone) {
        return res.status(400).json({
            success: false,
            message: 'At least one field (firstName, lastName, or phone) is required'
        });
    }

    try {
        const client = await db.connect();

        try {
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

function generateResetPasswordToken(): number {
    return randomInt(100000, 1000000);
}

function createMagicLink(email: string, resetToken: number, baseUrl: string) {
    const magicLink = `${baseUrl}/auth/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;
    return magicLink;
}

async function sendResetPasswordEmail(email: string, resetToken: number, baseUrl: string) {
    const mailOptions = {
        from: '"LAMbda Team" <no-reply@terminalvelocitydevelopment.com>',
        to: email,
        subject: "Action Required: Reset Your Password",
        text: `A password reset was requested for your account. Click the following link to reset your password: ${createMagicLink(email, resetToken, baseUrl)} Your reset code is: ${resetToken}`,
        html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 40px 20px; background-color: #f8f9fa;">
            <div style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); padding: 40px; text-align: center;">
                <h1 style="color: #2c3e50; margin-bottom: 30px; font-size: 28px; font-weight: 600;">Welcome to LAMbda</h1>
                
                <p style="color: #555; font-size: 16px; margin-bottom: 30px;">
                    A password reset was requested for your account. Click the following link to reset your password:
                </p>
                
                <div style="margin: 40px 0;">
                    <a href="${createMagicLink(email, resetToken, baseUrl)}" 
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
                        Reset Password
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
                        ${resetToken}
                    </p>
                </div>
                
                <p style="color: #888; font-size: 14px; margin-top: 30px;">
                    If you didn't request a password reset, please ignore this email.
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

router.post('/generateResetPasswordToken', async (req: any, res: any) => {
    const { email, baseUrl } = req.body;

    if (!email) {
        return res.status(400).json({
            success: false,
            message: 'Valid email is required'
        });
    }

    try {
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            const checkUserEmailQuery = `
                SELECT email
                FROM users
                WHERE email = $1
            `;
            const checkUserEmailResult = await client.query(checkUserEmailQuery, [email]);

            if (checkUserEmailResult.rows.length === 0) {
                // Return success even when email not found to avoid user enumeration
                await client.query('ROLLBACK');
                return res.status(200).json({
                    success: true,
                    message: 'If an account with this email exists, a reset password link has been sent',
                });
            }

            // Remove any existing tokens for this email before inserting a new one
            await client.query('DELETE FROM reset_password_tokens WHERE email = $1', [email]);

            const resetPasswordToken = generateResetPasswordToken();

            await client.query(
                'INSERT INTO reset_password_tokens (email, reset_password_token) VALUES ($1, $2)',
                [email, resetPasswordToken]
            );

            await sendResetPasswordEmail(email, resetPasswordToken, baseUrl);

            await client.query('COMMIT');

            res.status(200).json({
                success: true,
                message: 'If an account with this email exists, a reset password link has been sent',
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error generating reset password token:', error);
        res.status(500).json({
            success: false,
            message: getAuthFailureMessage(error, 'Internal server error while processing request')
        });
    }
});

router.post('/resetPassword', async (req: any, res: any) => {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
        return res.status(400).json({
            success: false,
            message: 'Email, token, and new password are required'
        });
    }

    if (newPassword.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long'
        });
    }

    const tokenInt = parseInt(token, 10);
    if (isNaN(tokenInt)) {
        return res.status(400).json({
            success: false,
            message: 'Invalid reset token'
        });
    }

    try {
        const client = await db.connect();

        try {
            await client.query('BEGIN');

            const tokenQuery = `
                SELECT email, reset_password_token, expires_at
                FROM reset_password_tokens
                WHERE email = $1 AND reset_password_token = $2
            `;
            const tokenResult = await client.query(tokenQuery, [email, tokenInt]);

            if (tokenResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or expired reset token'
                });
            }

            const tokenData = tokenResult.rows[0];

            if (tokenData.expires_at && new Date(tokenData.expires_at) < new Date()) {
                await client.query('DELETE FROM reset_password_tokens WHERE email = $1', [email]);
                await client.query('COMMIT');
                return res.status(400).json({
                    success: false,
                    message: 'Reset token has expired'
                });
            }

            const hashedPassword = await bcrypt.hash(newPassword, 10);

            await client.query(
                'UPDATE users SET password_hash = $1 WHERE email = $2',
                [hashedPassword, email]
            );

            await client.query('DELETE FROM reset_password_tokens WHERE email = $1', [email]);

            await client.query('COMMIT');

            res.status(200).json({
                success: true,
                message: 'Password reset successfully'
            });

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }

    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: getAuthFailureMessage(error, 'Internal server error while resetting password')
        });
    }
});

export default router;
