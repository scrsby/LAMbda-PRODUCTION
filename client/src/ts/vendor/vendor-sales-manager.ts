import { apiAxios, requireAuth, logout } from '../utilities/api.js';
import { escapeHtml, getDisplayItemName, getLineBasePrice, getLineFinalPrice, roundCurrency, COMMISSION_RATE } from '../utilities/receipt.js';
import { updateProfileCard } from '../utilities/ui.js';

declare global {
    interface Window {
        $?: any;
        jQuery?: any;
    }
}

interface VendorSaleItem {
    ticket_item_id: number;
    ticket_id: number;
    vendor_inventory_id: string;
    name: string;
    vendor_price: number;
    discount_amount: number;
    final_price: number;
    quantity: number;
    created_at: string;
}

interface VendorSalesResponse {
    items: VendorSaleItem[];
    dailySalesTotal: number;
    dailyEarnings: number;
}

const EARNINGS_RATE = 1 - COMMISSION_RATE;

let salesDataTable: any = null;
let lastAppliedSearchParams = new URLSearchParams();
const salesTableBody = document.getElementById('sales_list');
const searchItemsInput   = document.getElementById('search-items') as HTMLInputElement | null;
const filterStartInput   = document.getElementById('filter-start') as HTMLInputElement | null;
const filterEndInput     = document.getElementById('filter-end') as HTMLInputElement | null;
const filterPriceMinInput = document.getElementById('filter-price-min') as HTMLInputElement | null;
const filterPriceMaxInput = document.getElementById('filter-price-max') as HTMLInputElement | null;
const filterInventoryIdInput = document.getElementById('filter-inventory-id') as HTMLInputElement | null;
const searchBtn = document.getElementById('search-btn');
const clearBtn  = document.getElementById('clear-btn');
const generateReportBtn = document.getElementById('generate-report-btn') as HTMLButtonElement | null;
const dailySalesTotalEl = document.getElementById('daily-sales-total');
const dailyEarningsEl   = document.getElementById('daily-earnings');

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth('../auth/login.html');
    if (!user) return;

    if (user.userType !== 'vendor') {
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

[searchItemsInput, filterStartInput, filterEndInput, filterPriceMinInput, filterPriceMaxInput, filterInventoryIdInput].forEach(input => {
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

    if (searchItemsInput?.value.trim()) {
        params.set('itemSearch', searchItemsInput.value.trim());
    }

    if (filterStartInput?.value) {
        params.set('startDate', new Date(filterStartInput.value).toISOString());
    }

    if (filterEndInput?.value) {
        params.set('endDate', new Date(filterEndInput.value).toISOString());
    }

    if (filterPriceMinInput?.value.trim()) {
        params.set('priceMin', filterPriceMinInput.value.trim());
    }

    if (filterPriceMaxInput?.value.trim()) {
        params.set('priceMax', filterPriceMaxInput.value.trim());
    }

    if (filterInventoryIdInput?.value.trim()) {
        params.set('inventoryId', filterInventoryIdInput.value.trim());
    }

    return params;
}

async function loadSales() {
    const params = buildSalesQueryParams();
    lastAppliedSearchParams = new URLSearchParams(params.toString());
    updateReportButtonLabel();

    const endpoint = params.size > 0 ? `/vendor/sales?${params.toString()}` : '/vendor/sales';

    try {
        const response = await apiAxios(endpoint, { method: 'GET' }) as VendorSalesResponse;
        renderDailyStats(response.dailySalesTotal ?? 0, response.dailyEarnings ?? 0);
        renderSales(response.items ?? []);
    } catch (error) {
        console.error('Error loading sales:', error);
        renderSales([]);
        renderSalesMessage('Unable to load sales data right now.');
    }
}

async function generateReport() {
    try {
        const isQueriedReport = lastAppliedSearchParams.size > 0;
        const reportType = 'Vendor Sales Report';
        const params = isQueriedReport
            ? new URLSearchParams(lastAppliedSearchParams.toString())
            : new URLSearchParams();

        if (!isQueriedReport) {
            const now = new Date();
            const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
            const endOfDay   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();
            params.set('startDate', startOfDay);
            params.set('endDate', endOfDay);
        }

        const salesResponse = await apiAxios(`/vendor/sales?${params.toString()}`, { method: 'GET' }) as VendorSalesResponse;
        const items = salesResponse.items ?? [];

        if (items.length === 0) {
            alert(isQueriedReport ? 'No sales match your search criteria.' : 'No sales found for today.');
            return;
        }

        const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

        let totalFinalPrice = 0;
        let totalEarnings   = 0;

        const rows: string[] = [];

        items.forEach(item => {
            const itemPrice  = getLineBasePrice(item);
            const discount   = roundCurrency(Number(item.discount_amount ?? 0));
            const finalPrice = getLineFinalPrice(item);
            const earnings   = roundCurrency(finalPrice * EARNINGS_RATE);

            totalFinalPrice = roundCurrency(totalFinalPrice + finalPrice);
            totalEarnings   = roundCurrency(totalEarnings + earnings);

            rows.push(`
                <tr>
                    <td>${escapeHtml(String(item.vendor_inventory_id ?? ''))}</td>
                    <td>${escapeHtml(getDisplayItemName(item))}</td>
                    <td>${escapeHtml(formatDateTime(item.created_at))}</td>
                    <td>${formatCurrency(itemPrice)}</td>
                    <td>${formatCurrency(discount)}</td>
                    <td>${formatCurrency(finalPrice)}</td>
                    <td>${formatCurrency(earnings)}</td>
                </tr>
            `);
        });

        rows.push(`
            <tr class="vendor-total-row">
                <td colspan="5" style="text-align: right;"><strong>Total:</strong></td>
                <td><strong>${formatCurrency(totalFinalPrice)}</strong></td>
                <td><strong>${formatCurrency(totalEarnings)}</strong></td>
            </tr>
        `);

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
                        padding: 0.2in;
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
                    td:nth-child(4),
                    td:nth-child(5),
                    td:nth-child(6),
                    td:nth-child(7) {
                        padding-left: 4px;
                        padding-right: 4px;
                        white-space: nowrap;
                    }
                    .vendor-total-row td {
                        border-top: 1px solid #ccc;
                    }
                    @media print {
                        body { padding: 0.1in; }
                        .report-container { max-width: none; }
                    }
                </style>
            </head>
            <body>
                <div class="report-container">
                    <h1>${reportType}</h1>
                    <p>Generated ${escapeHtml(generatedAt)}</p>
                    <table>
                        <colgroup>
                            <col style="width: 14%;">
                            <col style="width: 32%;">
                            <col style="width: 18%;">
                            <col style="width: 9%;">
                            <col style="width: 9%;">
                            <col style="width: 9%;">
                            <col style="width: 9%;">
                        </colgroup>
                        <thead>
                            <tr>
                                <th>Inventory ID</th>
                                <th>Item</th>
                                <th>Date / Time</th>
                                <th>Price</th>
                                <th>Disc.</th>
                                <th>Final Price</th>
                                <th>Earnings</th>
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

        const reportWindow = window.open('', '_blank');
        if (!reportWindow) {
            alert('Unable to open report window. Please allow pop-ups and try again.');
            return;
        }
        reportWindow.document.write(reportHtml);
        reportWindow.document.close();
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Unable to generate report right now. Please check your connection and try again.');
    }
}

function updateReportButtonLabel() {
    if (!generateReportBtn) return;
    generateReportBtn.textContent = lastAppliedSearchParams.size > 0 ? 'Generate Queried Report' : 'Generate Daily Report';
}

function renderDailyStats(salesTotal: number, earnings: number) {
    if (dailySalesTotalEl) {
        dailySalesTotalEl.textContent = `$${salesTotal.toFixed(2)}`;
    }
    if (dailyEarningsEl) {
        dailyEarningsEl.textContent = `$${earnings.toFixed(2)}`;
    }
}

function renderSales(items: VendorSaleItem[]) {
    if (!salesTableBody) return;

    destroySalesTablePagination();
    salesTableBody.innerHTML = '';

    if (items.length === 0) {
        renderSalesMessage('No sales found.');
        return;
    }

    items.forEach(item => {
        const itemPrice  = getLineBasePrice(item);
        const discount   = roundCurrency(Number(item.discount_amount ?? 0));
        const finalPrice = getLineFinalPrice(item);

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${escapeHtml(String(item.vendor_inventory_id ?? ''))}</td>
            <td>${escapeHtml(getDisplayItemName(item))}</td>
            <td>${escapeHtml(formatDateTime(item.created_at))}</td>
            <td>$${itemPrice.toFixed(2)}</td>
            <td>$${discount.toFixed(2)}</td>
            <td>$${finalPrice.toFixed(2)}</td>
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
            <td colspan="6" class="orders-empty-state">${message}</td>
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
        order: [[2, 'desc']],
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
    if (searchItemsInput)    searchItemsInput.value = '';
    if (filterStartInput)    filterStartInput.value = '';
    if (filterEndInput)      filterEndInput.value = '';
    if (filterPriceMinInput) filterPriceMinInput.value = '';
    if (filterPriceMaxInput) filterPriceMaxInput.value = '';
    if (filterInventoryIdInput) filterInventoryIdInput.value = '';
}

function formatDateTime(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleString();
}
