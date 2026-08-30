import { apiAxios, getCurrentUser, logout } from '../utilities/api.js';
import { escapeHtml, getDisplayItemName, getLineBasePrice, getLineFinalPrice, openItemizedReceipt } from '../utilities/receipt.js';
import { updateProfileCard } from "../utilities/ui.js";
const deleteTicketButton = document.getElementById('delete-ticket-btn');
const generateReceiptButton = document.getElementById('generate-receipt-btn');
let activeTicket = null;
document.addEventListener('DOMContentLoaded', async () => {
    const ticketId = new URLSearchParams(window.location.search).get('ticketId');
    if (!ticketId) {
        showOrderError('No ticket ID was provided.');
        return;
    }
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = '/auth/login.html';
        return;
    }
    if (user.userType !== 'admin') {
        window.location.href = '/auth/login.html';
        return;
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
async function loadOrderDetail(ticketId) {
    try {
        const response = await apiAxios(`/POS/ticket/${ticketId}`, { method: 'GET' });
        renderTicketSummary(response.ticket);
        renderTicketItems(response.items ?? []);
    }
    catch (error) {
        if (error.response?.status === 404) {
            showOrderError(`Ticket #${ticketId} was not found.`);
            return;
        }
        console.error('Error loading ticket detail:', error);
        showOrderError('Unable to load this ticket right now.');
    }
}
function renderTicketSummary(ticket) {
    activeTicket = ticket;
    setText('ticket-detail-title', `Ticket #${ticket.ticket_id}`);
    setText('detail-ticket-id', String(ticket.ticket_id));
    setText('detail-created-at', formatDateTime(ticket.created_at));
    setText('detail-employee', ticket.employee_name);
    setStatusPill('detail-status', ticket.ticket_status);
    setText('detail-total', `$${Number(ticket.total ?? 0).toFixed(2)}`);
    setText('detail-payment-type', ticket.cash_payment ? 'Cash' : 'Card');
    updateClosedTicketControls();
    updateDeleteTicketButton();
}
function renderTicketItems(items) {
    const tableBody = document.getElementById('ticket-items-list');
    if (!tableBody)
        return;
    const isPartiallyRefunded = activeTicket?.ticket_status === 'partially_refunded';
    const isFullyRefunded = activeTicket?.ticket_status === 'refunded';
    // Update table header to add/remove the Refund column
    const thead = document.querySelector('#ticket_items_table thead tr');
    if (thead) {
        const existingRefundTh = thead.querySelector('.refund-col-header');
        if (isPartiallyRefunded) {
            if (!existingRefundTh) {
                const th = document.createElement('th');
                th.className = 'refund-col-header';
                th.textContent = 'Refund';
                thead.appendChild(th);
            }
        }
        else {
            existingRefundTh?.remove();
        }
    }
    tableBody.innerHTML = '';
    if (items.length === 0) {
        const colspan = isPartiallyRefunded ? 10 : 9;
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
            <td>$${finalPrice.toFixed(2)}</td>
            ${isPartiallyRefunded ? `<td>${item.refunded ? '<em>Refunded</em>' : `<button type="button" class="btn btn-secondary refund-btn" data-item-id="${item.ticket_item_id}">Refund</button>`}</td>` : ''}
        `;
        if (isPartiallyRefunded && !item.refunded) {
            row.querySelector('.refund-btn')?.addEventListener('click', async () => {
                if (!window.confirm(`Mark item #${item.ticket_item_id} (${item.name}) as refunded?`))
                    return;
                try {
                    await apiAxios(`/POS/ticket-item/${item.ticket_item_id}/refund`, { method: 'PATCH' });
                    await loadOrderDetail(String(activeTicket.ticket_id));
                }
                catch (error) {
                    window.alert(error.response?.data?.error ?? 'Failed to refund item. Please try again.');
                }
            });
        }
        tableBody.appendChild(row);
    });
}
async function handleDeleteTicket() {
    if (!activeTicket) {
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
        window.location.href = 'admin-order-manager.html';
    }
    catch (error) {
        console.error('Error deleting ticket:', error);
        window.alert(error.response?.data?.error ?? 'Failed to delete ticket. Please try again.');
        updateDeleteTicketButton();
    }
}
function updateDeleteTicketButton() {
    if (!deleteTicketButton) {
        return;
    }
    const canDelete = activeTicket?.ticket_status === 'open';
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
function showOrderError(message) {
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
function setText(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value;
    }
}
function setStatusPill(elementId, status) {
    const element = document.getElementById(elementId);
    if (!element) {
        return;
    }
    const normalizedStatus = String(status ?? '').trim().toLowerCase();
    let statusClass = 'ticket-status-pill--default';
    let statusText = status || 'Unknown';
    if (normalizedStatus === 'open') {
        statusClass = 'ticket-status-pill--open';
        statusText = 'Open';
    }
    else if (normalizedStatus === 'closed') {
        statusClass = 'ticket-status-pill--closed';
        statusText = 'Closed';
    }
    else if (normalizedStatus === 'partially_refunded') {
        statusClass = 'ticket-status-pill--partially-refunded';
        statusText = 'Partially Refunded';
    }
    else if (normalizedStatus === 'refunded') {
        statusClass = 'ticket-status-pill--refunded';
        statusText = 'Refunded';
    }
    element.innerHTML = `<span class="ticket-status-pill ${statusClass}">${statusText}</span>`;
}
function formatDateTime(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}
async function generateOrderReceipt(ticketId, button) {
    if (!activeTicket || activeTicket.ticket_status === 'open') {
        window.alert('Receipts are only available for non-open tickets.');
        return;
    }
    button.disabled = true;
    button.textContent = 'Loading...';
    try {
        const response = await apiAxios(`/POS/ticket/${ticketId}`, { method: 'GET' });
        const items = (response.items ?? []);
        const cashPayment = activeTicket?.cash_payment === true;
        openItemizedReceipt(cashPayment, items, ` — Ticket #${ticketId}`);
    }
    catch (error) {
        console.error('Error fetching ticket for receipt:', error);
        alert('Unable to generate receipt. Please try again.');
    }
    finally {
        button.disabled = false;
        button.textContent = 'Receipt';
    }
}
//# sourceMappingURL=admin-order-detail.js.map