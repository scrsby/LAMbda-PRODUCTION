import { apiAxios, logoutHandler, requireAuth, getCurrentUser } from '../utilities/api.js';
import { updateProfileCard } from "../utilities/ui.js";
import { ADMIN_LIKE_USER_TYPES, requireUserType, VENDOR_LIKE_USER_TYPES } from "../utilities/redirect.js";

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    
    if (user) {
        await requireUserType('employee', user);
        await logoutHandler();
        await updateProfileCard(user);
        await loadOrders();
    }
   
});

declare global {
    interface Window {
        $?: any;
        jQuery?: any;
    }
}

interface TicketSummary {
    ticket_id: number;
    created_at: string;
    cashier_id: number;
    employee_name: string;
    total: number;
    ticket_status: string;
}

let ordersDataTable: any = null;

const ordersTableBody = document.getElementById('orders_list');
const filterIdInput = document.getElementById('filter-id') as HTMLInputElement | null;
const searchItemsInput = document.getElementById('search-items') as HTMLInputElement | null;
const filterStartInput = document.getElementById('filter-start') as HTMLInputElement | null;
const filterEndInput = document.getElementById('filter-end') as HTMLInputElement | null;
const filterEmployeeInput = document.getElementById('filter-employee') as HTMLInputElement | null;
const searchBtn = document.getElementById('search-btn');
const clearBtn = document.getElementById('clear-btn');

searchBtn?.addEventListener('click', async () => {
    await loadOrders();
});

clearBtn?.addEventListener('click', async () => {
    clearFilters();
    await loadOrders();
});

[filterIdInput, searchItemsInput, filterStartInput, filterEndInput, filterEmployeeInput].forEach(input => {
    input?.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            await loadOrders();
        }
    });
});

getCurrentUser().then(user => {
    if (user && ADMIN_LIKE_USER_TYPES.includes(user.userType)) {
        const btn = document.getElementById('admin-controls-btn');
        const btnMobile = document.getElementById('admin-controls-btn-mobile');
        if (btn) btn.style.display = '';
        if (btnMobile) btnMobile.style.display = '';
    }

    if (user && VENDOR_LIKE_USER_TYPES.includes(user.userType)) {
        const vendorBtn = document.getElementById('vendor-controls-btn');
        const vendorBtnMobile = document.getElementById('vendor-controls-btn-mobile');
        if (vendorBtn) vendorBtn.style.display = '';
        if (vendorBtnMobile) vendorBtnMobile.style.display = '';
    }
});

async function loadOrders() {
    const params = new URLSearchParams();

    if (filterIdInput?.value.trim()) {
        params.set('orderId', filterIdInput.value.trim());
    }

    if (searchItemsInput?.value.trim()) {
        params.set('itemSearch', searchItemsInput.value.trim());
    }

    if (filterStartInput?.value) {
        params.set('startDate', new Date(filterStartInput.value).toISOString());
    }

    if (filterEndInput?.value) {
        params.set('endDate', new Date(filterEndInput.value).toISOString());
    }

    if (filterEmployeeInput?.value.trim()) {
        params.set('employee', filterEmployeeInput.value.trim());
    }

    const endpoint = params.size > 0 ? `/POS/tickets?${params.toString()}` : '/POS/tickets';

    try {
        const response = await apiAxios(endpoint, { method: 'GET' });
        renderOrders(response.tickets as TicketSummary[] ?? []);
    } catch (error) {
        console.error('Error loading tickets:', error);
        renderOrders([]);
        renderOrdersMessage('Unable to load tickets right now.');
    }
}

function renderOrders(tickets: TicketSummary[]) {
    if (!ordersTableBody) return;

    destroyOrdersTablePagination();
    ordersTableBody.innerHTML = '';

    if (tickets.length === 0) {
        renderOrdersMessage('No tickets found.');
        return;
    }

    tickets.forEach(ticket => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${ticket.ticket_id}</td>
            <td>${formatDateTime(ticket.created_at)}</td>
            <td>${ticket.employee_name}</td>
            <td>$${Number(ticket.total ?? 0).toFixed(2)}</td>
            <td>
                <a class="btn btn-primary see-more-btn" href="order-detail.html?ticketId=${ticket.ticket_id}">
                    See More
                </a>
            </td>
        `;
        ordersTableBody.appendChild(row);
    });

    initializeOrdersTablePagination();
}

function renderOrdersMessage(message: string) {
    if (!ordersTableBody) return;

    destroyOrdersTablePagination();
    ordersTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="orders-empty-state">${message}</td>
        </tr>
    `;
}

function initializeOrdersTablePagination() {
    const jquery = window.$;
    const tableSelector = '#orders_table';

    if (!jquery || !jquery.fn?.DataTable) {
        return;
    }

    if (jquery.fn.DataTable.isDataTable(tableSelector)) {
        jquery(tableSelector).DataTable().destroy();
    }

    ordersDataTable = jquery(tableSelector).DataTable({
        pageLength: 25,
        lengthChange: false,
        searching: false,
        ordering: true,
        responsive: true,
        info: true,
        autoWidth: false,
        order: [[1, 'desc']],
        columnDefs: [
            { orderable: false, targets: 4 }
        ],
        language: {
            paginate: {
                previous: 'Prev',
                next: 'Next'
            }
        }
    });
}

function destroyOrdersTablePagination() {
    const jquery = window.$;
    const tableSelector = '#orders_table';

    if (!jquery || !jquery.fn?.DataTable) {
        return;
    }

    if (jquery.fn.DataTable.isDataTable(tableSelector)) {
        jquery(tableSelector).DataTable().destroy();
    }

    ordersDataTable = null;
}

function clearFilters() {
    if (filterIdInput) filterIdInput.value = '';
    if (searchItemsInput) searchItemsInput.value = '';
    if (filterStartInput) filterStartInput.value = '';
    if (filterEndInput) filterEndInput.value = '';
    if (filterEmployeeInput) filterEmployeeInput.value = '';
}

function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString();
}

