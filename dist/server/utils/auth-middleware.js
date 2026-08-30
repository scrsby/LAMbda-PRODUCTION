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
/**
 * Middleware to require authentication for a route
 * Returns 401 if user is not logged in
 */
export const requireAuth = (req, res, next) => {
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
export const requireUserType = (...allowedTypes) => {
    return (req, res, next) => {
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
//# sourceMappingURL=auth-middleware.js.map