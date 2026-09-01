const REDIRECTS_ENABLED = false;

// User types that should be treated as having "admin" abilities (POS + admin pages).
// vendor-admin inherits every ability of admin, plus vendor page access.
// system-admin inherits every ability of admin, plus access to the admin
// user-settings pages (Invites, Users, Vendors).
export const ADMIN_LIKE_USER_TYPES = ['admin', 'vendor-admin', 'system-admin'];

// User types allowed to access the admin user-settings pages (Invites, Users,
// Vendors). Plain 'admin' accounts are intentionally excluded — only
// system-admin and vendor-admin (which already had access to these pages
// prior to system-admin's introduction) may access these pages.
export const SETTINGS_ACCESS_USER_TYPES = ['vendor-admin', 'system-admin'];

// User types that should be treated as having "employee" abilities (POS pages only).
// vendor-employee inherits every ability of employee, plus vendor page access.
export const EMPLOYEE_LIKE_USER_TYPES = ['employee', 'vendor-employee'];

// User types that should have access to the vendor pages.
// vendor-employee and vendor-admin are vendors in addition to their other role.
export const VENDOR_LIKE_USER_TYPES = ['vendor', 'vendor-employee', 'vendor-admin'];

// User types allowed on the POS pages (employees, admins, and anyone who inherits
// employee/admin abilities).
export const POS_ACCESS_USER_TYPES = [...EMPLOYEE_LIKE_USER_TYPES, ...ADMIN_LIKE_USER_TYPES];

// Vendor-side user types that should see the POS nav link on vendor pages.
// Plain 'vendor' accounts don't inherit employee/admin abilities, so they're excluded.
export const VENDOR_POS_ACCESS_USER_TYPES = ['vendor-admin', 'vendor-employee'];

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

            // Only redirect plain vendors away — vendor-admin is intentionally excluded
            // here since it inherits admin's ability to access employee-side pages.
            if (user.userType === 'vendor') {
                window.location.href = '/vendor/vendor-index.html';
                return;
            }

            // Admin-like accounts (including vendor-admin) are okay to access all employee-side pages
        }

    }
}
