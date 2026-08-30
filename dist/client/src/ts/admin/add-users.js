import { apiAxios, requireAuth, logout } from '../utilities/api.js';
import { showErrorMessage, showSuccessMessage } from '../utilities/messages.js';
import { updateProfileCard } from "../utilities/ui.js";
document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    if (!user)
        return;
    if (user.userType !== 'admin') {
        window.location.href = '/auth/login.html';
        return;
    }
    updateProfileCard(user);
    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
        window.location.href = '../auth/login.html';
    });
    document.getElementById('logout-btn-mobile')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
        window.location.href = '../auth/login.html';
    });
});
const form = document.getElementById('add-user-form');
form?.addEventListener('submit', function (event) {
    event.preventDefault();
    formSubmit();
});
function formSubmit() {
    const email = document.getElementById('email-field')?.value;
    const role = document.getElementById('role')?.value;
    const vendorId = document.getElementById('vendorId')?.value;
    console.log("Form values:", { email, role, vendorId });
    if (!email || !role) {
        showErrorMessage('Email and Role are required');
        return;
    }
    createUser(email, role, vendorId);
}
async function createUser(email, role, vendorId) {
    try {
        const baseUrl = window.location.origin;
        const response = await apiAxios('/admin/createNewUser', {
            method: 'POST',
            body: {
                email,
                user_type: role,
                vendor_id: vendorId,
                baseUrl: baseUrl
            }
        });
        // Success case - response is already the data, not response.data
        showSuccessMessage(`User created successfully! Access token: ${response.access_token}`);
    }
    catch (error) {
        console.log('Full error object:', error); // Debug log
        // Handle different error cases
        if (error.response?.status === 400) {
            showErrorMessage(error.response.data.message);
        }
        else if (error.response?.data?.message) {
            showErrorMessage(error.response.data.message);
        }
        else if (error.message) {
            showErrorMessage(error.message);
        }
        else {
            showErrorMessage('An error occurred while creating the user');
        }
    }
}
//# sourceMappingURL=add-users.js.map