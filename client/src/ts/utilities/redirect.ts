const REDIRECTS_ENABLED = false;

export async function requireUserType(group: string, user: any) {
    if (REDIRECTS_ENABLED) {
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