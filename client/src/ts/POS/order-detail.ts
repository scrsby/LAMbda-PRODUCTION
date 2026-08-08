import { apiAxios, getCurrentUser, logout } from '../utilities/api.js';
import { openItemizedReceipt, type ReceiptTicketItem } from '../utilities/receipt.js';
import { updateProfileCard } from "../utilities/ui.js";

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
}

const deleteTicketButton = document.getElementById('delete-ticket-btn') as HTMLButtonElement | null;
const generateReceiptButton = document.getElementById('generate-receipt-btn') as HTMLButtonElement | null;
let activeTicket: TicketDetail | null = null;
let isAdminUser = false;

document.addEventListener('DOMContentLoaded', async () => {
    const ticketId = new URLSearchParams(window.location.search).get('ticketId');

    if (!ticketId) {
        showOrderError('No ticket ID was provided.');
        return;
    }

    const user = await getCurrentUser();
    isAdminUser = user?.userType === 'admin';

    if (!user) {
        window.location.href = '/auth/login.html';
        return;
    }
    if (user.userType !== 'employee' && user.userType !== 'admin' ) {
        window.location.href = '/auth/login.html';
        return;
    }
    if (isAdminUser) {
        showAdminControls();
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
        renderTicketItems(response.items as TicketItem[] ?? []);
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
    setText('detail-cashier-id', String(ticket.cashier_id));
    setText('detail-status', ticket.ticket_status);
    setText('detail-total', `$${Number(ticket.total ?? 0).toFixed(2)}`);
    setText('detail-payment-type', ticket.cash_payment ? 'Cash' : 'Card');
    updateClosedTicketControls();
    updateDeleteTicketButton();
}

function renderTicketItems(items: TicketItem[]) {
    const tableBody = document.getElementById('ticket-items-list');
    if (!tableBody) return;

    tableBody.innerHTML = '';

    if (items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="orders-empty-state">No ticket items found.</td>
            </tr>
        `;
        return;
    }

    items.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${item.ticket_item_id}</td>
            <td>${item.vendor_id}</td>
            <td>${item.vendor_inventory_id}</td>
            <td>${item.name}</td>
            <td>${item.quantity}</td>
            <td>$${Number(item.vendor_price ?? 0).toFixed(2)}</td>
            <td>${Number(item.discount_percent ?? 0).toFixed(2)}%</td>
            <td>$${Number(item.discount_amount ?? 0).toFixed(2)}</td>
            <td>$${Number(item.final_price ?? 0).toFixed(2)}</td>
            <td>$${Number((item.final_price ?? 0) * (item.quantity ?? 0)).toFixed(2)}</td>
        `;
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
    const isClosed = activeTicket?.ticket_status === 'closed';
    const paymentTypeField = document.getElementById('detail-payment-type-field');

    if (paymentTypeField) {
        paymentTypeField.style.display = isClosed ? '' : 'none';
    }

    if (generateReceiptButton) {
        generateReceiptButton.style.display = isClosed ? '' : 'none';
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



async function generateOrderReceipt(ticketId: string, button: HTMLButtonElement): Promise<void> {
    if (activeTicket?.ticket_status !== 'closed') {
        window.alert('Receipts are only available for closed tickets.');
        return;
    }

    button.disabled = true;
    button.textContent = 'Loading...';
    try {
        const response = await apiAxios(`/POS/ticket/${ticketId}`, { method: 'GET' });
        const items = (response.items ?? []) as ReceiptTicketItem[];
        const cashPayment = response.ticket?.cash_payment === true;
        openItemizedReceipt(cashPayment, items, ` — Ticket #${ticketId}`);
    } catch (error) {
        console.error('Error fetching ticket for receipt:', error);
        alert('Unable to generate receipt. Please try again.');
    } finally {
        button.disabled = false;
        button.textContent = 'Receipt';
    }
}
