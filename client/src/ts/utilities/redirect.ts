import { requireAuth } from "../utilities/api.js";

const REDIRECTS_ENABLED = false;

export async function redirectUser(group: string) {
    if (REDIRECTS_ENABLED) {
        const user = await requireAuth();
        if (!user) {
            window.location.href = '/auth/login.html';
            return;
        }


        if (group === 'admin' && user.userType !== 'admin') {

            if (user.userType === 'vendor') {
                window.location.href = '/vendor/vendor-index.html';
                return;
            }
            if (user.userType === 'employee') {
                window.location.href = '/POS/register.html';
                return;
            }
        }

        if (group === 'vendor' && user.userType !== 'vendor') {

            if (user.userType === 'admin') {
                window.location.href = '/admin/admin-index.html';
                return;
            }
            if (user.userType === 'employee') {
                window.location.href = '/POS/register.html';
                return;
            }
        }

        if (group === 'employee' && user.userType !== 'employee') {

            if (user.userType === 'vendor') {
                window.location.href = '/vendor/vendor-index.html';
                return;
            }

            // Admin accounts are okay to access all employee-side pages
        }

    }
}