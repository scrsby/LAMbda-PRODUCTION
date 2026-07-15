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

interface TicketDetailItem {
    vendor_id: number | string;
    vendor_inventory_id: string;
    name: string;
    vendor_price: number;
    discount_amount: number;
    quantity: number;
}

interface TicketDetailResponse {
    ticket: TicketSummary;
    items: TicketDetailItem[];
}

let salesDataTable: any = null;
let lastAppliedSearchParams = new URLSearchParams();
const COMMISSION_RATE = 0.10;
const URL_REVOKE_DELAY_MS = 60_000;

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

    updateReportButtonLabel();
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

generateReportBtn?.addEventListener('click', () => {
    void generateReport();
});

function buildSalesQueryParams() {
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

    return params;
}

async function loadSales() {
    const params = buildSalesQueryParams();
    lastAppliedSearchParams = new URLSearchParams(params.toString());
    updateReportButtonLabel();

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

async function generateReport() {
    try {
        const isQueriedReport = lastAppliedSearchParams.size > 0;
        const reportType = 'Sales Report';
        const params = isQueriedReport
            ? new URLSearchParams(lastAppliedSearchParams.toString())
            : new URLSearchParams();

        if (!isQueriedReport) {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
            params.set('startDate', startOfDay);
            params.set('endDate', endOfDay);
        }

        const salesEndpoint = `/admin/sales?${params.toString()}`;
        const salesResponse = await apiAxios(salesEndpoint, { method: 'GET' }) as SalesResponse;
        const tickets = salesResponse.tickets ?? [];

        if (tickets.length === 0) {
            alert(isQueriedReport ? 'No sales match your search criteria.' : 'No sales found for today.');
            return;
        }

        const ticketDetails = await Promise.all(
            tickets.map(async (ticket) => {
                return await apiAxios(`/POS/ticket/${ticket.ticket_id}`, { method: 'GET' }) as TicketDetailResponse;
            })
        );

        type ReportItem = {
            vendorId: string;
            vendorInventoryId: string;
            itemName: string;
            itemPrice: number;
            discount: number;
            finalPrice: number;
            commission: number;
            payout: number;
        };

        const reportItems: ReportItem[] = [];

        ticketDetails.forEach(detail => {
            (detail.items ?? []).forEach(item => {
                const quantityRaw = Number(item.quantity ?? 1);
                const hasInvalidQuantity = !Number.isFinite(quantityRaw) || quantityRaw <= 0;
                const quantity = hasInvalidQuantity ? 1 : quantityRaw;
                if (hasInvalidQuantity) {
                    console.warn('Invalid ticket item quantity. Defaulting to 1.', { item });
                }
                const itemPrice = Number(item.vendor_price ?? 0) * quantity;
                const discount = Number(item.discount_amount ?? 0) * quantity;
                const finalPrice = itemPrice - discount;
                const commission = finalPrice * COMMISSION_RATE;
                const payout = finalPrice - commission;

                reportItems.push({
                    vendorId: normalizeVendorId(item.vendor_id),
                    vendorInventoryId: String(item.vendor_inventory_id ?? ''),
                    itemName: String(item.name ?? ''),
                    itemPrice,
                    discount,
                    finalPrice,
                    commission,
                    payout
                });
            });
        });

        if (reportItems.length === 0) {
            alert('No sale items found for this report.');
            return;
        }

        const sortedItems = [...reportItems].sort((a, b) => {
            const aNum = Number(a.vendorId);
            const bNum = Number(b.vendorId);
            const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum);

            if (bothNumeric) {
                return aNum - bNum;
            }

            return a.vendorId.localeCompare(b.vendorId);
        });

        const groupedByVendor = new Map<string, ReportItem[]>();
        sortedItems.forEach(item => {
            const existing = groupedByVendor.get(item.vendorId) ?? [];
            existing.push(item);
            groupedByVendor.set(item.vendorId, existing);
        });

        const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

        const rows: string[] = [];

        Array.from(groupedByVendor.entries()).forEach(([vendorId, items]) => {
            let vendorFinalTotal = 0;
            let vendorCommissionTotal = 0;
            let vendorPayoutTotal = 0;

            items.forEach((item, index) => {
                vendorFinalTotal += item.finalPrice;
                vendorCommissionTotal += item.commission;
                vendorPayoutTotal += item.payout;

                rows.push(`
                    <tr>
                        <td>${index === 0 ? escapeHtml(vendorId) : ''}</td>
                        <td>${escapeHtml(item.vendorInventoryId)}</td>
                        <td>${escapeHtml(item.itemName)}</td>
                        <td>${formatCurrency(item.itemPrice)}</td>
                        <td>${formatCurrency(item.discount)}</td>
                        <td>${formatCurrency(item.finalPrice)}</td>
                        <td>${formatCurrency(item.commission)}</td>
                        <td>${formatCurrency(item.payout)}</td>
                    </tr>
                `);
            });

            rows.push(`
                <tr class="vendor-total-row">
                    <td colspan="5"></td>
                    <td><strong>${formatCurrency(vendorFinalTotal)}</strong></td>
                    <td><strong>${formatCurrency(vendorCommissionTotal)}</strong></td>
                    <td><strong>${formatCurrency(vendorPayoutTotal)}</strong></td>
                </tr>
            `);
        });

        const generatedAt = new Date().toLocaleString();

        const reportHtml = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${reportType}</title>
                    <style>
                        body {
                            font-family: Arial, sans-serif;
                            margin: 0;
                            padding: 0.25in;
                            color: #111;
                            background: #fff;
                        }
                        .report-container {
                            width: 100%;
                            max-width: 8.5in;
                            margin: 0 auto;
                        }
                        h1 {
                            margin: 0 0 0.125in;
                            font-size: 1.3rem;
                        }
                        p {
                            margin: 0 0 0.2in;
                            color: #444;
                            font-size: 0.9rem;
                        }
                        table {
                            width: 100%;
                            border-collapse: collapse;
                            table-layout: fixed;
                            border: none;
                            background: transparent;
                        }
                        th, td {
                            border: none;
                            background: transparent;
                            padding: 6px 8px;
                            text-align: left;
                            font-size: 0.82rem;
                            vertical-align: top;
                            word-break: break-word;
                        }
                        th:nth-child(4),
                        th:nth-child(5),
                        th:nth-child(6),
                        th:nth-child(7),
                        th:nth-child(8),
                        td:nth-child(4),
                        td:nth-child(5),
                        td:nth-child(6),
                        td:nth-child(7),
                        td:nth-child(8) {
                            padding-left: 4px;
                            padding-right: 4px;
                            white-space: nowrap;
                        }
                        @media print {
                            body {
                                padding: 0.1in;
                            }
                            .report-container {
                                max-width: none;
                            }
                        }
                    </style>
                </head>
                <body>
                    <div class="report-container">
                        <h1>${reportType}</h1>
                        <p>Generated ${escapeHtml(generatedAt)}</p>
                        <table>
                            <colgroup>
                                <col style="width: 8%;">
                                <col style="width: 14%;">
                                <col style="width: 30%;">
                                <col style="width: 9.6%;">
                                <col style="width: 9.6%;">
                                <col style="width: 9.6%;">
                                <col style="width: 9.6%;">
                                <col style="width: 9.6%;">
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>Vendor ID</th>
                                    <th>Inventory ID</th>
                                    <th>Item</th>
                                    <th>Price</th>
                                    <th>Disc.</th>
                                    <th>Final Price</th>
                                    <th>Comm.</th>
                                    <th>Payout</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${rows.join('')}
                            </tbody>
                        </table>
                    </div>
                </body>
                </html>
        `;

        const reportBlob = new Blob([reportHtml], { type: 'text/html' });
        const reportUrl = URL.createObjectURL(reportBlob);
        const reportWindow = window.open(reportUrl, '_blank', 'noopener,noreferrer');
        if (!reportWindow) {
            URL.revokeObjectURL(reportUrl);
            alert('Unable to open report window. Please allow pop-ups and try again.');
            return;
        }

        const revokeBlobUrl = () => URL.revokeObjectURL(reportUrl);
        const windowClosedCheck = window.setInterval(() => {
            if (reportWindow.closed) {
                window.clearInterval(windowClosedCheck);
                revokeBlobUrl();
            }
        }, 1000);

        window.setTimeout(() => {
            window.clearInterval(windowClosedCheck);
            revokeBlobUrl();
        }, URL_REVOKE_DELAY_MS);
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Unable to generate report right now. Please check your connection and try again.');
    }
}

function updateReportButtonLabel() {
    if (!generateReportBtn) return;
    generateReportBtn.textContent = lastAppliedSearchParams.size > 0 ? 'Generate Queried Report' : 'Generate Daily Report';
}

function normalizeVendorId(value: number | string | null | undefined) {
    if (value === null || value === undefined) {
        return 'UNKNOWN';
    }

    const normalized = String(value).trim();
    return normalized === '' ? 'UNKNOWN' : normalized;
}

function escapeHtml(value: string) {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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
