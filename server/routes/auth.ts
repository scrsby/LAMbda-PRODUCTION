import { Router } from 'express';
import db from '../config/db.js';
import bcrypt from 'bcrypt'; 

const router = Router();
const SESSION_COOKIE_NAME = 'connect.sid';

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
                SELECT email, expires_at, user_type
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
            message: 'Internal server error while creating account'
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

            req.session.user = {
                id: user.user_id,
                email: user.email,
                userType: user.user_type,
                firstName: user.first_name,
                lastName: user.last_name,
                phone: user.phone
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
                    phone: user.phone
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
            message: 'Internal server error while creating account'
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

export default router;
