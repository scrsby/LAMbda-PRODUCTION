const REDIRECTS_ENABLED = false;

// User types that should be treated as having "admin" abilities (POS + admin pages).
// vendor-admin inherits every ability of admin, plus vendor page access.
export const ADMIN_LIKE_USER_TYPES = ['admin', 'vendor-admin'];

// User types that should be treated as having "employee" abilities (POS pages only).
// vendor-employee inherits every ability of employee, plus vendor page access.
export const EMPLOYEE_LIKE_USER_TYPES = ['employee', 'vendor-employee'];

// User types that should have access to the vendor pages.
// vendor-employee and vendor-admin are vendors in addition to their other role.
export const VENDOR_LIKE_USER_TYPES = ['vendor', 'vendor-employee', 'vendor-admin'];

// User types allowed on the POS pages (employees, admins, and anyone who inherits
// employee/admin abilities).
export const POS_ACCESS_USER_TYPES = [...EMPLOYEE_LIKE_USER_TYPES, ...ADMIN_LIKE_USER_TYPES];

export async function requireUserType(group: string, user: any) {
    if (REDIRECTS_ENABLED) {
        if (group === 'admin' && !ADMIN_LIKE_USER_TYPES.includes(user.userType)) {

            if (VENDOR_LIKE_USER_TYPES.includes(user.userType)) {
                window.location.href = '/vendor/vendor-index.html';
                return;
            }
            if (EMPLOYEE_LIKE_USER_TYPES.includes(user.userType)) {
                window.location.href = '/POS/register.html';
                return;
            }
        }

        if (group === 'vendor' && !VENDOR_LIKE_USER_TYPES.includes(user.userType)) {

            if (ADMIN_LIKE_USER_TYPES.includes(user.userType)) {
                window.location.href = '/admin/admin-index.html';
                return;
            }
            if (EMPLOYEE_LIKE_USER_TYPES.includes(user.userType)) {
                window.location.href = '/POS/register.html';
                return;
            }
        }

        if (group === 'employee' && !EMPLOYEE_LIKE_USER_TYPES.includes(user.userType)) {

            if (user.userType === 'vendor') {
                window.location.href = '/vendor/vendor-index.html';
                return;
            }

            // Admin-like accounts are okay to access all employee-side pages
        }

    }
}
