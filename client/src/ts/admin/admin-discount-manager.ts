import { apiAxios, requireAuth, logout } from '../utilities/api.js';
import { showErrorMessage, showSuccessMessage } from '../utilities/messages.js';
import { updateProfileCard } from '../utilities/ui.js';

interface Discount {
    discount_id: number;
    vendor_id: number;
    description: string;
    start_time: string;
    end_time: string;
    created_at: string;
}

let allDiscounts: Discount[] = [];

const discountForm = document.getElementById('discount-form') as HTMLFormElement | null;
const tableBody = document.getElementById('discounts-table-body');

function formatDateTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
        return '—';
    }

    return parsed.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function renderDiscounts(discounts: Discount[]) {
    if (!tableBody) return;

    if (!Array.isArray(discounts) || discounts.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #9ca3af;">No discounts found</td></tr>';
        return;
    }

    tableBody.innerHTML = '';

    discounts.forEach((discount) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${discount.vendor_id}</td>
            <td>${escapeHtml(discount.description)}</td>
            <td>${formatDateTime(discount.start_time)}</td>
            <td>${formatDateTime(discount.end_time)}</td>
        `;
        tableBody.appendChild(row);
    });
}

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

async function loadDiscounts() {
    if (!tableBody) return;

    try {
        const response = await apiAxios('/admin/discounts', { method: 'GET' });
        allDiscounts = Array.isArray(response.data) ? response.data as Discount[] : [];
        renderDiscounts(allDiscounts);
    } catch (error) {
        console.error('Error loading discounts:', error);
        tableBody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #ef4444;">Error loading discounts. Please refresh the page.</td></tr>';
    }
}

async function createDiscount() {
    const vendorIdValue = (document.getElementById('discount-vendor-id') as HTMLInputElement | null)?.value.trim() ?? '';
    const description = (document.getElementById('discount-description') as HTMLInputElement | null)?.value.trim() ?? '';
    const startTimeValue = (document.getElementById('discount-start-time') as HTMLInputElement | null)?.value ?? '';
    const endTimeValue = (document.getElementById('discount-end-time') as HTMLInputElement | null)?.value ?? '';

    const vendorId = Number.parseInt(vendorIdValue, 10);

    if (!Number.isInteger(vendorId) || vendorId <= 0) {
        showErrorMessage('Vendor ID must be a positive integer.');
        return;
    }
    if (!description) {
        showErrorMessage('Description is required.');
        return;
    }
    if (!startTimeValue || !endTimeValue) {
        showErrorMessage('Start time and end time are required.');
        return;
    }

    try {
        await apiAxios('/admin/discounts', {
            method: 'POST',
            body: {
                vendor_id: vendorId,
                description,
                start_time: new Date(startTimeValue).toISOString(),
                end_time: new Date(endTimeValue).toISOString()
            }
        });

        showSuccessMessage('Discount created successfully.');
        discountForm?.reset();
        await loadDiscounts();
    } catch (error: any) {
        if (error.response?.data?.message) {
            showErrorMessage(error.response.data.message);
        } else {
            showErrorMessage('An error occurred while creating the discount.');
        }
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    if (!user) return;

    if (user.userType !== 'admin') {
        window.location.href = '/auth/login.html';
        return;
    }

    updateProfileCard(user);
    await loadDiscounts();

    discountForm?.addEventListener('submit', async (event) => {
        event.preventDefault();
        await createDiscount();
    });

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
