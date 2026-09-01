/*
  _               __  __ _         _
 | |        /\   |  \/  | |       | |
 | |       /  \  | \  / | |__   __| | __ _
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|

 Name: Authentication Middleware
 File: auth-middleware.ts
 Description: Middleware functions for protecting routes and checking user authentication
 Last Edited: 24 February 2026
*/

import type { Request, Response, NextFunction } from 'express';

/**
 * User types that carry vendor-booth access (in addition to any other role
 * they may hold). Used to decide when a `vendorId` should be associated with
 * an account.
 */
export const VENDOR_LIKE_USER_TYPES = ['vendor', 'vendor-employee', 'vendor-admin'];

/**
 * Fixed palette of colors a user may choose from to personalize their
 * profile avatar. Must stay in sync with the CHECK constraint on
 * users.color (see migrations/008_add_color_to_users.sql) and the
 * PROFILE_COLORS list in client/src/ts/utilities/ui.ts.
 */
export const PROFILE_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E'
];

/**
 * Middleware to require authentication for a route
 * Returns 401 if user is not logged in
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
    if (!req.session.user) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    next();
};

/**
 * Middleware to require a specific user type
 * @param allowedTypes - Array of user types that can access the route
 */
export const requireUserType = (...allowedTypes: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        if (!req.session.user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        if (!allowedTypes.includes(req.session.user.userType)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }
        next();
    };
};
