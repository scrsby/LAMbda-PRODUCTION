import { apiAxios, requireAuth, logout } from '../utilities/api.js';
import { showErrorMessage, showSuccessMessage } from '../utilities/messages.js';
import { updateProfileCard } from "../utilities/ui.js";

interface User {
    user_id: number;
    first_name: string | null;
    last_name: string | null;
    vendor_id: number | null;
    email: string;
    phone: string | null;
    user_type: string;
}

let allUsers: User[] = [];
let pendingDeleteId: number | null = null;
let deleteConfirmHandler: (() => void) | null = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();

    if (!user) return;

    if (user.userType !== 'admin') {
        window.location.href = '/auth/login.html';
        return;
    }

    updateProfileCard(user);
    loadUsersTable();

    // Search field – filter table on input
    document.getElementById('search-field')?.addEventListener('input', (e) => {
        const query = (e.target as HTMLInputElement).value.trim().toLowerCase();
        renderTable(query ? allUsers.filter(u => matchesSearch(u, query)) : allUsers);
    });

    // Delete modal buttons
    document.getElementById('delete-modal-back')?.addEventListener('click', closeDeleteModal);
    document.getElementById('delete-modal-confirm')?.addEventListener('click', () => {
        deleteConfirmHandler?.();
    });

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

function matchesSearch(user: User, query: string): boolean {
    const name = `${user.first_name ?? ''} ${user.last_name ?? ''}`.toLowerCase();
    return (
        name.includes(query) ||
        user.email.toLowerCase().includes(query) ||
        (user.phone ?? '').toLowerCase().includes(query) ||
        (user.vendor_id?.toString() ?? '').includes(query) ||
        user.user_type.toLowerCase().includes(query)
    );
}

/* LOAD USERS TABLE
 * Fetches all users from the database and stores them for filtering
 */
async function loadUsersTable() {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    try {
        const response = await apiAxios('/admin/getUsers', { method: 'GET' });

        if (response.success) {
            allUsers = response.data as User[];
            renderTable(allUsers);
        } else {
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #9ca3af;">No users found</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading users table:', error);
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #ef4444;">Error loading users. Please refresh the page.</td></tr>`;
    }
}

/* RENDER TABLE
 * Renders a list of users into the table body
 */
function renderTable(users: User[]) {
    const tableBody = document.getElementById('users-table-body');
    if (!tableBody) return;

    if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 20px; color: #9ca3af;">No users found</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';

    users.forEach((user: User) => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #e5e7eb';

        const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || '—';
        const vendorId = user.vendor_id ?? '—';
        const phone = user.phone ?? '—';

        row.innerHTML = `
            <td style="padding: 12px; color: #374151;">${name}</td>
            <td style="padding: 12px; color: #6b7280;">${vendorId}</td>
            <td style="padding: 12px; color: #374151;">${user.email}</td>
            <td style="padding: 12px; color: #6b7280;">${phone}</td>
            <td style="padding: 12px; color: #6b7280;">${user.user_type}</td>
            <td style="padding: 12px; text-align: center;">
                <button
                    class="delete-user-btn"
                    data-userid="${user.user_id}"
                    data-name="${name}"
                    style="padding: 6px 12px; background-color: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500;"
                    onmouseover="this.style.backgroundColor='#dc2626'"
                    onmouseout="this.style.backgroundColor='#ef4444'"
                >
                    Delete
                </button>
            </td>
        `;

        const deleteBtn = row.querySelector('.delete-user-btn');
        deleteBtn?.addEventListener('click', () => {
            openDeleteModal(user.user_id, name);
        });

        tableBody.appendChild(row);
    });
}

/* DELETE MODAL */
function openDeleteModal(userId: number, userName: string) {
    pendingDeleteId = userId;
    const modal = document.getElementById('delete-modal');
    const message = document.getElementById('delete-modal-message');
    if (message) message.textContent = `This will permanently delete the account for "${userName}". This action cannot be undone.`;
    if (modal) modal.style.display = 'flex';

    deleteConfirmHandler = confirmDelete;
}

function closeDeleteModal() {
    pendingDeleteId = null;
    deleteConfirmHandler = null;
    const modal = document.getElementById('delete-modal');
    if (modal) modal.style.display = 'none';
}

async function confirmDelete() {
    if (pendingDeleteId === null) return;
    const userId = pendingDeleteId;
    closeDeleteModal();

    try {
        await apiAxios(`/admin/deleteUser/${userId}`, { method: 'DELETE' });
        showSuccessMessage('User deleted successfully.');
        allUsers = allUsers.filter(u => u.user_id !== userId);
        const query = ((document.getElementById('search-field') as HTMLInputElement)?.value ?? '').trim().toLowerCase();
        renderTable(query ? allUsers.filter(u => matchesSearch(u, query)) : allUsers);
    } catch (error: any) {
        console.error('Error deleting user:', error);
        if (error.response?.data?.message) {
            showErrorMessage(error.response.data.message);
        } else {
            showErrorMessage('An error occurred while deleting the user.');
        }
    }
}

