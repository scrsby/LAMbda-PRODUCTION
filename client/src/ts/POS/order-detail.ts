import { apiAxios, getCurrentUser, logout } from '../utilities/api.js';
import { escapeHtml, getDisplayItemName, getLineBasePrice, getLineFinalPrice, openItemizedReceipt, type ReceiptTicketItem } from '../utilities/receipt.js';
import { updateProfileCard } from "../utilities/ui.js";
import { ADMIN_LIKE_USER_TYPES, POS_ACCESS_USER_TYPES, VENDOR_LIKE_USER_TYPES } from "../utilities/redirect.js";

interface TicketDetail {
    ticket_id: number;
    cashier_id: number;
    created_at: string;
    ticket_status: string;
    total: number;
    cash_payment: boolean;
    employee_name: string;
}

interface TicketItem {
    ticket_item_id: number;
    ticket_id: number;
    vendor_id: number;
    vendor_inventory_id: string;
    name: string;
    vendor_price: number;
    discount_percent: number;
    discount_amount: number;
    final_price: number;
    commission: number;
    payout: number;
    quantity: number;
    refunded?: boolean;
}

const deleteTicketButton = document.getElementById('delete-ticket-btn') as HTMLButtonElement | null;
const generateReceiptButton = document.getElementById('generate-receipt-btn') as HTMLButtonElement | null;
const openInRegisterButton = document.getElementById('open-in-register-btn') as HTMLAnchorElement | null;
let activeTicket: TicketDetail | null = null;
let isAdminUser = false;

document.addEventListener('DOMContentLoaded', async () => {
    const ticketId = new URLSearchParams(window.location.search).get('ticketId');

    if (!ticketId) {
        showOrderError('No ticket ID was provided.');
        return;
    }

    if (openInRegisterButton) {
        openInRegisterButton.href = `register.html?ticketId=${encodeURIComponent(ticketId)}`;
        openInRegisterButton.style.display = '';
    }

    const user = await getCurrentUser();
    isAdminUser = !!user && ADMIN_LIKE_USER_TYPES.includes(user.userType);

    if (!user) {
        window.location.href = '/auth/login.html';
        return;
    }
    if (!POS_ACCESS_USER_TYPES.includes(user.userType)) {
        window.location.href = '/auth/login.html';
        return;
    }
    if (isAdminUser) {
        showAdminControls();
    }
    if (VENDOR_LIKE_USER_TYPES.includes(user.userType)) {
        showVendorControls();
    }

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

    updateProfileCard(user);
    deleteTicketButton?.addEventListener('click', handleDeleteTicket);
    generateReceiptButton?.addEventListener('click', () => {
        void generateOrderReceipt(ticketId, generateReceiptButton);
    });
    await loadOrderDetail(ticketId);
});

async function loadOrderDetail(ticketId: string) {
    try {
        const response = await apiAxios(`/POS/ticket/${ticketId}`, { method: 'GET' });
        renderTicketSummary(response.ticket as TicketDetail);
        renderTicketItems((response.items ?? []) as TicketItem[]);
    } catch (error: any) {
        if (error.response?.status === 404) {
            showOrderError(`Ticket #${ticketId} was not found.`);
            return;
        }

        console.error('Error loading ticket detail:', error);
        showOrderError('Unable to load this ticket right now.');
    }
}

function renderTicketSummary(ticket: TicketDetail) {
    activeTicket = ticket;
    setText('ticket-detail-title', `Ticket #${ticket.ticket_id}`);
    setText('detail-ticket-id', String(ticket.ticket_id));
    setText('detail-created-at', formatDateTime(ticket.created_at));
    setText('detail-employee', ticket.employee_name);
    renderStatusField(ticket.ticket_status);
    setText('detail-total', `$${Number(ticket.total ?? 0).toFixed(2)}`);
    setText('detail-payment-type', ticket.cash_payment ? 'Cash' : 'Card');
    updateClosedTicketControls();
    updateDeleteTicketButton();
}

function renderStatusField(status: string) {
    const container = document.getElementById('detail-status');
    if (!container) return;

    if (isAdminUser) {
        const ticketId = activeTicket?.ticket_id;
        const options: { value: string; label: string }[] = [
            { value: 'open', label: 'Open' },
            { value: 'closed', label: 'Closed' },
            { value: 'partially_refunded', label: 'Partially Refunded' },
            { value: 'refunded', label: 'Refunded' }
        ];
        const normalized = String(status ?? '').trim().toLowerCase();
        const pillClass = getStatusPillClass(normalized);
        container.innerHTML = `
            <select id="status-select" class="ticket-status-pill ${pillClass}" aria-label="Change ticket status">
                ${options.map(o => `<option value="${o.value}"${o.value === normalized ? ' selected' : ''}>${o.label}</option>`).join('')}
            </select>
        `;
        const select = document.getElementById('status-select') as HTMLSelectElement | null;
        select?.addEventListener('change', async () => {
            const newStatus = select.value;
            if (!ticketId) return;
            try {
                await apiAxios(`/POS/ticket/${ticketId}/status`, { method: 'PATCH', data: { status: newStatus } });
                if (activeTicket) {
                    activeTicket.ticket_status = newStatus;
                }
                // Update pill class on the select itself
                select.className = `ticket-status-pill ${getStatusPillClass(newStatus)}`;
                updateClosedTicketControls();
                updateDeleteTicketButton();
                // Re-render items to show/hide Refund column
                const response = await apiAxios(`/POS/ticket/${ticketId}`, { method: 'GET' });
                renderTicketItems((response.items ?? []) as TicketItem[]);
            } catch (error: any) {
                window.alert(error.response?.data?.error ?? 'Failed to update status. Please try again.');
                // Revert select back
                select.value = activeTicket?.ticket_status ?? status;
                select.className = `ticket-status-pill ${getStatusPillClass(activeTicket?.ticket_status ?? status)}`;
            }
        });
    } else {
        setStatusPill('detail-status', status);
    }
}

function renderTicketItems(items: TicketItem[]) {
    const tableBody = document.getElementById('ticket-items-list');
    if (!tableBody) return;

    const isPartiallyRefunded = activeTicket?.ticket_status === 'partially_refunded';
    const isFullyRefunded = activeTicket?.ticket_status === 'refunded';

    // Update table header to add/remove the Refund column
    const thead = document.querySelector('#ticket_items_table thead tr');
    if (thead) {
        const existingRefundTh = thead.querySelector('.refund-col-header');
        if (isPartiallyRefunded && isAdminUser) {
            if (!existingRefundTh) {
                const th = document.createElement('th');
                th.className = 'refund-col-header';
                th.textContent = 'Refund';
                thead.appendChild(th);
            }
        } else {
            existingRefundTh?.remove();
        }
    }

    tableBody.innerHTML = '';

    if (items.length === 0) {
        const colspan = (isPartiallyRefunded && isAdminUser) ? 9 : 8;
        tableBody.innerHTML = `
            <tr>
                <td colspan="${colspan}" class="orders-empty-state">No ticket items found.</td>
            </tr>
        `;
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        const displayName = getDisplayItemName(item);
        const basePrice = getLineBasePrice(item);
        const finalPrice = getLineFinalPrice(item);
        if (item.refunded || isFullyRefunded) {
            row.classList.add('refunded-item');
        }
        row.innerHTML = `
            <td>${item.ticket_item_id}</td>
            <td>${item.vendor_id}</td>
            <td>${escapeHtml(String(item.vendor_inventory_id ?? ''))}</td>
            <td>${escapeHtml(displayName)}</td>
            <td>$${basePrice.toFixed(2)}</td>
            <td>${Number(item.discount_percent ?? 0).toFixed(2)}%</td>
            <td>$${Number(item.discount_amount ?? 0).toFixed(2)}</td>
            <td>$${finalPrice.toFixed(2)}</td>
            ${isPartiallyRefunded && isAdminUser ? `<td>${item.refunded ? '<em>Refunded</em>' : `<button type="button" class="btn btn-secondary refund-btn" data-item-id="${item.ticket_item_id}">Refund</button>`}</td>` : ''}
        `;
        if (isPartiallyRefunded && isAdminUser && !item.refunded) {
            row.querySelector('.refund-btn')?.addEventListener('click', async () => {
                if (!window.confirm(`Mark item #${item.ticket_item_id} (${item.name}) as refunded?`)) return;
                try {
                    await apiAxios(`/POS/ticket-item/${item.ticket_item_id}/refund`, { method: 'PATCH' });
                    await loadOrderDetail(String(activeTicket!.ticket_id));
                } catch (error: any) {
                    window.alert(error.response?.data?.error ?? 'Failed to refund item. Please try again.');
                }
            });
        }
        tableBody.appendChild(row);
    });
}

async function handleDeleteTicket() {
    if (!activeTicket || !isAdminUser) {
        return;
    }

    if (activeTicket.ticket_status !== 'open') {
        window.alert('Only open tickets can be deleted.');
        return;
    }

    if (!window.confirm(`Delete ticket #${activeTicket.ticket_id}? This will also remove all ticket items.`)) {
        return;
    }

    if (deleteTicketButton) {
        deleteTicketButton.disabled = true;
        deleteTicketButton.textContent = 'Deleting...';
    }

    try {
        await apiAxios(`/POS/ticket/${activeTicket.ticket_id}`, { method: 'DELETE' });
        window.location.href = 'orders.html';
    } catch (error: any) {
        console.error('Error deleting ticket:', error);
        window.alert(error.response?.data?.error ?? 'Failed to delete ticket. Please try again.');
        updateDeleteTicketButton();
    }
}

function updateDeleteTicketButton() {
    if (!deleteTicketButton) {
        return;
    }

    const canDelete = isAdminUser && activeTicket?.ticket_status === 'open';
    deleteTicketButton.style.display = canDelete ? '' : 'none';
    deleteTicketButton.disabled = false;
    deleteTicketButton.textContent = 'Delete Ticket';
}

function updateClosedTicketControls() {
    const isOpen = activeTicket?.ticket_status === 'open';
    const paymentTypeField = document.getElementById('detail-payment-type-field');

    if (paymentTypeField) {
        paymentTypeField.style.display = isOpen ? 'none' : '';
    }

    if (generateReceiptButton) {
        generateReceiptButton.style.display = isOpen ? 'none' : '';
        generateReceiptButton.disabled = false;
        generateReceiptButton.textContent = 'Receipt';
    }
}

function showOrderError(message: string) {
    const errorMessage = document.getElementById('order-detail-error');
    const content = document.getElementById('order-detail-content');

    if (content) {
        content.style.display = 'none';
    }

    if (errorMessage) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
    }
}

function setText(elementId: string, value: string) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}

function getStatusPillClass(normalizedStatus: string): string {
    if (normalizedStatus === 'open') return 'ticket-status-pill--open';
    if (normalizedStatus === 'closed') return 'ticket-status-pill--closed';
    if (normalizedStatus === 'partially_refunded') return 'ticket-status-pill--partially-refunded';
    if (normalizedStatus === 'refunded') return 'ticket-status-pill--refunded';
    return 'ticket-status-pill--default';
}

function setStatusPill(elementId: string, status: string) {
    const element = document.getElementById(elementId);
    if (!element) {
        return;
    }

    const normalizedStatus = String(status ?? '').trim().toLowerCase();
    let statusText = status || 'Unknown';

    if (normalizedStatus === 'open') {
        statusText = 'Open';
    } else if (normalizedStatus === 'closed') {
        statusText = 'Closed';
    } else if (normalizedStatus === 'partially_refunded') {
        statusText = 'Partially Refunded';
    } else if (normalizedStatus === 'refunded') {
        statusText = 'Refunded';
    }

    const span = document.createElement('span');
    span.className = `ticket-status-pill ${getStatusPillClass(normalizedStatus)}`;
    span.textContent = statusText;
    element.innerHTML = '';
    element.appendChild(span);
}

function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

function showAdminControls() {
    const btn = document.getElementById('admin-controls-btn');
    const btnMobile = document.getElementById('admin-controls-btn-mobile');
    if (btn) btn.style.display = '';
    if (btnMobile) btnMobile.style.display = '';
}

function showVendorControls() {
    const btn = document.getElementById('vendor-controls-btn');
    const btnMobile = document.getElementById('vendor-controls-btn-mobile');
    if (btn) btn.style.display = '';
    if (btnMobile) btnMobile.style.display = '';
}



async function generateOrderReceipt(ticketId: string, button: HTMLButtonElement): Promise<void> {
    if (!activeTicket || activeTicket.ticket_status === 'open') {
        window.alert('Receipts are only available for non-open tickets.');
        return;
    }

    button.disabled = true;
    button.textContent = 'Loading...';
    try {
        const response = await apiAxios(`/POS/ticket/${ticketId}`, { method: 'GET' });
        const items = (response.items ?? []) as ReceiptTicketItem[];
        const cashPayment = activeTicket?.cash_payment === true;
        openItemizedReceipt(cashPayment, items, ` — Ticket #${ticketId}`);
    } catch (error) {
        console.error('Error fetching ticket for receipt:', error);
        alert('Unable to generate receipt. Please try again.');
    } finally {
        button.disabled = false;
        button.textContent = 'Receipt';
    }
}
