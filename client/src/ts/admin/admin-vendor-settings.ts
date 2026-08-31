import { apiAxios, requireAuth, logout } from '../utilities/api.js';
import { showErrorMessage, showSuccessMessage } from '../utilities/messages.js';
import { updateProfileCard } from '../utilities/ui.js';
import { ADMIN_LIKE_USER_TYPES } from '../utilities/redirect.js';

declare global {
    interface Window {
        $?: any;
        jQuery?: any;
    }
}

interface Vendor {
    vendor_id: number;
    created_at: string;
}

let allVendors: Vendor[] = [];
let pendingDeleteId: number | null = null;
let deleteConfirmHandler: (() => void) | null = null;
let vendorsDataTable: any = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();

    if (!user) return;

    if (!ADMIN_LIKE_USER_TYPES.includes(user.userType)) {
        window.location.href = '/auth/login.html';
        return;
    }

    updateProfileCard(user);
    loadVendorsTable();

    // Search button – filter table by vendor ID field value
    document.getElementById('vendor-search-btn')?.addEventListener('click', () => {
        const query = (document.getElementById('vendor-id-field') as HTMLInputElement).value.trim().toLowerCase();
        renderTable(query ? allVendors.filter(v => v.vendor_id.toString().includes(query)) : allVendors);
    });

    // Add vendor form submission
    document.getElementById('add-vendor-form')?.addEventListener('submit', (e) => {
        e.preventDefault();
        const vendorIdField = document.getElementById('vendor-id-field') as HTMLInputElement;
        const vendorId = vendorIdField?.value.trim();
        createVendor(vendorId || null);
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

/* CREATE VENDOR
 * Sends a request to create a new vendor entry
 */
async function createVendor(vendorId: string | null) {
    try {
        const body: any = {};
        if (vendorId !== null) body.vendor_id = vendorId;

        const response = await apiAxios('/admin/createVendor', {
            method: 'POST',
            body
        });

        showSuccessMessage(`Vendor created successfully! Vendor ID: ${response.data.vendor_id}`);

        // Clear the form
        (document.getElementById('vendor-id-field') as HTMLInputElement).value = '';

        // Reload the vendors table
        loadVendorsTable();
    } catch (error: any) {
        if (error.response?.data?.message) {
            showErrorMessage(error.response.data.message);
        } else if (error.message) {
            showErrorMessage(error.message);
        } else {
            showErrorMessage('An error occurred while creating the vendor');
        }
    }
}

/* LOAD VENDORS TABLE
 * Fetches all vendors from the database and stores them for filtering
 */
async function loadVendorsTable() {
    const tableBody = document.getElementById('vendors-table-body');
    if (!tableBody) return;

    try {
        const response = await apiAxios('/admin/getVendors', { method: 'GET' });

        if (response.success) {
            allVendors = response.data as Vendor[];
            renderTable(allVendors);
        } else {
            destroyVendorsDataTable();
            tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #9ca3af;">No vendors found</td></tr>`;
        }
    } catch (error) {
        console.error('Error loading vendors table:', error);
        destroyVendorsDataTable();
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #ef4444;">Error loading vendors. Please refresh the page.</td></tr>`;
    }
}

/* RENDER TABLE
 * Renders a list of vendors into the table body
 */
function renderTable(vendors: Vendor[]) {
    const tableBody = document.getElementById('vendors-table-body');
    if (!tableBody) return;

    destroyVendorsDataTable();

    if (vendors.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="3" style="text-align: center; padding: 20px; color: #9ca3af;">No vendors found</td></tr>`;
        return;
    }

    tableBody.innerHTML = '';

    vendors.forEach((vendor: Vendor) => {
        const row = document.createElement('tr');

        const createdAt = new Date(vendor.created_at).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        row.innerHTML = `
            <td>${vendor.vendor_id}</td>
            <td>${createdAt}</td>
            <td style="text-align: center;">
                <button
                    class="delete-vendor-btn"
                    data-vendorid="${vendor.vendor_id}"
                    style="padding: 6px 12px; background-color: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.875rem; font-weight: 500;"
                    onmouseover="this.style.backgroundColor='#dc2626'"
                    onmouseout="this.style.backgroundColor='#ef4444'"
                >
                    Delete
                </button>
            </td>
        `;

        const deleteBtn = row.querySelector('.delete-vendor-btn');
        deleteBtn?.addEventListener('click', () => {
            openDeleteModal(vendor.vendor_id);
        });

        tableBody.appendChild(row);
    });

    initializeVendorsDataTable();
}

function initializeVendorsDataTable() {
    const jquery = window.$;
    const tableSelector = '#vendors-table';

    if (!jquery || !jquery.fn?.DataTable) return;

    if (jquery.fn.DataTable.isDataTable(tableSelector)) {
        jquery(tableSelector).DataTable().destroy();
    }

    vendorsDataTable = jquery(tableSelector).DataTable({
        pageLength: 25,
        lengthChange: false,
        searching: false,
        ordering: true,
        responsive: true,
        info: true,
        autoWidth: false,
        order: [[0, 'asc']],
        columnDefs: [
            { orderable: false, targets: 2 }
        ],
        language: {
            paginate: { previous: 'Prev', next: 'Next' }
        }
    });
}

function destroyVendorsDataTable() {
    const jquery = window.$;
    const tableSelector = '#vendors-table';

    if (!jquery || !jquery.fn?.DataTable) return;

    if (jquery.fn.DataTable.isDataTable(tableSelector)) {
        jquery(tableSelector).DataTable().destroy();
    }

    vendorsDataTable = null;
}

/* DELETE MODAL */
function openDeleteModal(vendorId: number) {
    pendingDeleteId = vendorId;
    const modal = document.getElementById('delete-modal');
    const message = document.getElementById('delete-modal-message');
    if (message) message.textContent = `This will permanently delete Vendor #${vendorId}. This action cannot be undone.`;
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
    const vendorId = pendingDeleteId;
    closeDeleteModal();

    try {
        await apiAxios(`/admin/deleteVendor/${vendorId}`, { method: 'DELETE' });
        showSuccessMessage('Vendor deleted successfully.');
        allVendors = allVendors.filter(v => v.vendor_id !== vendorId);
        const query = ((document.getElementById('vendor-id-field') as HTMLInputElement)?.value ?? '').trim().toLowerCase();
        renderTable(query ? allVendors.filter(v => v.vendor_id.toString().includes(query)) : allVendors);
    } catch (error: any) {
        console.error('Error deleting vendor:', error);
        if (error.response?.data?.message) {
            showErrorMessage(error.response.data.message);
        } else {
            showErrorMessage('An error occurred while deleting the vendor.');
        }
    }
}
