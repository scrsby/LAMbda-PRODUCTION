import { apiAxios, requireAuth, logout } from '../utilities/api.js';
import { showErrorMessage, showSuccessMessage } from '../utilities/messages.js';
import { updateProfileCard } from "../utilities/ui.js";

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();

    if (!user) return;

    if (user.userType !== 'admin') {
        window.location.href = '/auth/login.html';
        return;
    }
    
    loadUsersTable();
    updateProfileCard(user);

    // Logout button handlers
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

// Form submission for adding users
const form = document.getElementById('add-user-form');
form?.addEventListener('submit', function(event) {
    event.preventDefault();
    formSubmit();
});

/* FORM SUBMIT
* Handles form submission for creating new users
*/
function formSubmit(): void {
    const email = (document.getElementById('email-field') as HTMLInputElement)?.value;
    const role = (document.getElementById('role') as HTMLSelectElement)?.value;
    const vendorId = (document.getElementById('vendorId') as HTMLInputElement)?.value;
    
    console.log("Submitted email: ", email);
    createUser(email, role, vendorId);
}

/* CREATE USER
* Params: email
* Creates a new user and sends an access token email
*/
async function createUser(email: string, role: string, vendorId: string) {
    try {
        const baseUrl = window.location.origin;
        const response = await apiAxios('/admin/createNewUser', {
            method: 'POST',
            body: {
                email: email,
                user_type: role,
                vendor_id: vendorId,
                baseUrl: baseUrl
            }
        });

        showSuccessMessage(`User created successfully! Access token: ${response.access_token}`);

        // Clear the form
        (document.getElementById('email-field') as HTMLInputElement).value = '';
        (document.getElementById('role') as HTMLSelectElement).value = '';
        (document.getElementById('vendorId') as HTMLInputElement).value = '';

        // Reload the users table to show the new user
        loadUsersTable();

    } catch (error: any) {
        console.log('Full error object:', error);

        if (error.response?.status === 400) {
            showErrorMessage(error.response.data.message);
        } else if (error.response?.data?.message) {
            showErrorMessage(error.response.data.message);
        } else if (error.message) {
            showErrorMessage(error.message);
        } else {
            showErrorMessage('An error occurred while creating the user');
        }
    }
}

/* LOAD USERS TABLE
* Fetches all access tokens from the database and displays them in the table
*/
async function loadUsersTable() {
    const tableBody = document.getElementById('users-table-body');

    if (!tableBody) return;

    try {
        const response = await apiAxios('/admin/getAllAccessTokens', { method: 'GET' });

        if (response.success && response.data.length > 0) {
            tableBody.innerHTML = '';

            response.data.forEach((user: any) => {
                const row = document.createElement('tr');
                row.style.borderBottom = '1px solid #e5e7eb';

                // Determine status badge color
                const statusColor = user.status === 'active' ? '#10b981' : '#ef4444';
                const statusBg = user.status === 'active' ? '#d1fae5' : '#fee2e2';

                // Format dates
                const createdAt = new Date(user.created_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                const expiresAt = new Date(user.expires_at).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });

                row.innerHTML = `
                    <td style="padding: 12px; color: #374151;">${user.email}</td>
                    <td style="padding: 12px; color: #6b7280; font-family: 'Courier New', monospace; font-size: 0.875rem;">${user.access_token}</td>
                    <td style="padding: 12px;">
                        <span style="display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; color: ${statusColor}; background-color: ${statusBg};">
                            ${user.status.toUpperCase()}
                        </span>
                    </td>
                    <td style="padding: 12px; color: #6b7280;">${user.created_by}</td>
                    <td style="padding: 12px; color: #6b7280;">${createdAt}</td>
                    <td style="padding: 12px; color: #6b7280;">${expiresAt}</td>
                    <td style="padding: 12px; text-align: center;">
                        <button
                            class="regenerate-token-btn"
                            data-email="${user.email}"
                            style="padding: 6px 12px; background-color: #3b82f6; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500;"
                            onmouseover="this.style.backgroundColor='#2563eb'"
                            onmouseout="this.style.backgroundColor='#3b82f6'"
                        >
                            Regenerate Token
                        </button>
                    </td>
                `;

                // Add click event listener to the regenerate button
                const regenerateBtn = row.querySelector('.regenerate-token-btn');
                regenerateBtn?.addEventListener('click', () => {
                    regenerateToken(user.email);
                });

                tableBody.appendChild(row);
            });
        } else {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="7" style="text-align: center; padding: 20px; color: #9ca3af;">
                        No users found
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading users table:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px; color: #ef4444;">
                    Error loading users. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

/* REGENERATE TOKEN
* Deletes the existing access token and creates a new one for the user
*/
async function regenerateToken(email: string) {
    if (!confirm(`Are you sure you want to regenerate the access token for ${email}?`)) {
        return;
    }

    try {
        const baseUrl = window.location.origin;
        const response = await apiAxios('/admin/regenerateAccessToken', {
            method: 'POST',
            body: {
                email,
                baseUrl: baseUrl
            }
        });

        if (response.success) {
            showSuccessMessage(`Access token regenerated successfully for ${email}. New token email sent.`);
            // Reload the users table to show the updated token
            loadUsersTable();
        }
    } catch (error: any) {
        console.error('Token regeneration error:', error);

        if (error.response?.data?.message) {
            showErrorMessage(error.response.data.message);
        } else if (error.message) {
            showErrorMessage(error.message);
        } else {
            showErrorMessage('An error occurred while regenerating the access token');
        }

        // Reload the table even on error since tokens may have been deleted
        loadUsersTable();
    }
}
