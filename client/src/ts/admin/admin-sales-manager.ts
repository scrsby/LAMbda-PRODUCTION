import { apiAxios, requireAuth, logout } from '../utilities/api.js';
import { updateProfileCard } from '../utilities/ui.js';

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

interface SalesResponse {
    tickets: TicketSummary[];
    dailySalesTotal: number;
    dailyCommission: number;
}

let salesDataTable: any = null;

const salesTableBody = document.getElementById('sales_list');
const filterIdInput = document.getElementById('filter-id') as HTMLInputElement | null;
const searchItemsInput = document.getElementById('search-items') as HTMLInputElement | null;
const filterStartInput = document.getElementById('filter-start') as HTMLInputElement | null;
const filterEndInput = document.getElementById('filter-end') as HTMLInputElement | null;
const filterEmployeeInput = document.getElementById('filter-employee') as HTMLInputElement | null;
const searchBtn = document.getElementById('search-btn');
const clearBtn = document.getElementById('clear-btn');
const generateReportBtn = document.getElementById('generate-report-btn') as HTMLButtonElement | null;
const dailySalesTotalEl = document.getElementById('daily-sales-total');
const dailyCommissionEl = document.getElementById('daily-commission');

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth('../auth/login.html');
    if (!user) return;

    if (user.userType !== 'admin') {
        window.location.href = '../auth/login.html';
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

    await loadSales();
});

searchBtn?.addEventListener('click', async () => {
    await loadSales();
});

clearBtn?.addEventListener('click', async () => {
    clearFilters();
    await loadSales();
});

[filterIdInput, searchItemsInput, filterStartInput, filterEndInput, filterEmployeeInput].forEach(input => {
    input?.addEventListener('keydown', async (event) => {
        if (event.key === 'Enter') {
            event.preventDefault();
            await loadSales();
        }
    });
});

async function loadSales() {
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

    const endpoint = params.size > 0 ? `/admin/sales?${params.toString()}` : '/admin/sales';

    try {
        const response = await apiAxios(endpoint, { method: 'GET' }) as SalesResponse;
        renderDailyStats(response.dailySalesTotal ?? 0, response.dailyCommission ?? 0);
        renderSales(response.tickets ?? []);
    } catch (error) {
        console.error('Error loading sales:', error);
        renderSales([]);
        renderSalesMessage('Unable to load sales data right now.');
    }
}

function generateReport() {

}

function renderDailyStats(salesTotal: number, commission: number) {
    if (dailySalesTotalEl) {
        dailySalesTotalEl.textContent = `$${salesTotal.toFixed(2)}`;
    }
    if (dailyCommissionEl) {
        dailyCommissionEl.textContent = `$${commission.toFixed(2)}`;
    }
}

function renderSales(tickets: TicketSummary[]) {
    if (!salesTableBody) return;

    destroySalesTablePagination();
    salesTableBody.innerHTML = '';

    if (tickets.length === 0) {
        renderSalesMessage('No closed tickets found.');
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
                <a class="btn btn-primary see-more-btn" href="../POS/order-detail.html?ticketId=${ticket.ticket_id}">
                    See More
                </a>
            </td>
        `;
        salesTableBody.appendChild(row);
    });

    initializeSalesTablePagination();
}

function renderSalesMessage(message: string) {
    if (!salesTableBody) return;

    destroySalesTablePagination();
    salesTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="orders-empty-state">${message}</td>
        </tr>
    `;
}

function initializeSalesTablePagination() {
    const jquery = window.$;
    const tableSelector = '#sales_table';

    if (!jquery || !jquery.fn?.DataTable) {
        return;
    }

    if (jquery.fn.DataTable.isDataTable(tableSelector)) {
        jquery(tableSelector).DataTable().destroy();
    }

    salesDataTable = jquery(tableSelector).DataTable({
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

function destroySalesTablePagination() {
    const jquery = window.$;
    const tableSelector = '#sales_table';

    if (!jquery || !jquery.fn?.DataTable) {
        return;
    }

    if (jquery.fn.DataTable.isDataTable(tableSelector)) {
        jquery(tableSelector).DataTable().destroy();
    }

    salesDataTable = null;
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
