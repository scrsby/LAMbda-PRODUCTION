export const UNKNOWN_VENDOR_ID = 'UNKNOWN';
export const TAX_RATE = 0.0935;
export const CREDIT_CARD_FEE_RATE = 0.04;
export const COMMISSION_RATE = 0.10;

export interface ReceiptTicketItem {
    vendor_id: number | string | null | undefined;
    vendor_inventory_id: string;
    name: string;
    quantity?: number | null;
    vendor_price?: number | null;
    discount_amount?: number | null;
    final_price?: number | null;
}

export interface ReceiptSummary {
    subtotal: number;
    taxCollected: number;
    feesCollected: number;
    totalCollectedCash: number;
    totalCollectedRegister: number;
    totalCollected: number;
    totalCommission: number;
}

export function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}

function calculateSummary(
    subtotal: number,
    options: { cashPayment: boolean; taxExempt: boolean },
    includeFeesInTaxBase: boolean
): ReceiptSummary {
    const normalizedSubtotal = roundCurrency(subtotal);
    const feesCollected = options.cashPayment ? 0 : roundCurrency(normalizedSubtotal * CREDIT_CARD_FEE_RATE);
    const taxableSubtotal = includeFeesInTaxBase
        ? roundCurrency(normalizedSubtotal + feesCollected)
        : normalizedSubtotal;
    const taxCollected = options.taxExempt ? 0 : roundCurrency(taxableSubtotal * TAX_RATE);
    const totalCollected = roundCurrency(normalizedSubtotal + taxCollected + feesCollected);
    const totalCollectedCash = options.cashPayment ? totalCollected : 0;
    const totalCollectedRegister = options.cashPayment ? 0 : totalCollected;
    const totalCommission = roundCurrency(normalizedSubtotal * COMMISSION_RATE);

    return {
        subtotal: normalizedSubtotal,
        taxCollected,
        feesCollected,
        totalCollectedCash,
        totalCollectedRegister,
        totalCollected,
        totalCommission
    };
}

export function calculateReceiptSummary(subtotal: number, options: { cashPayment: boolean; taxExempt: boolean }): ReceiptSummary {
    return calculateSummary(subtotal, options, false);
}

export function calculateSalesReportSummary(subtotal: number, options: { cashPayment: boolean; taxExempt: boolean }): ReceiptSummary {
    return calculateSummary(subtotal, options, true);
}

export function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

export function normalizeVendorId(value: number | string | null | undefined): string {
    if (value === null || value === undefined) {
        return UNKNOWN_VENDOR_ID;
    }
    const normalized = String(value).trim();
    return normalized === '' ? UNKNOWN_VENDOR_ID : normalized;
}

export function openItemizedReceipt(cashPayment: boolean, items: ReceiptTicketItem[], ticketLabel: string): void {
    if (items.length === 0) {
        alert('No items to generate a receipt.');
        return;
    }

    type ReceiptItem = {
        vendorId: string;
        vendorInventoryId: string;
        itemName: string;
        itemPrice: number;
        cashDiscount: number;
        discount: number;
        finalPrice: number;
    };

    const receiptItems: ReceiptItem[] = items.map(item => {
        const quantityRaw = Number(item.quantity ?? 1);
        const hasInvalidQuantity = !Number.isFinite(quantityRaw) || quantityRaw <= 0;
        const quantity = hasInvalidQuantity ? 1 : quantityRaw;
        if (hasInvalidQuantity) {
            console.warn('Invalid ticket item quantity. Defaulting to 1.', { item });
        }

        const baseItemPrice = Number(item.vendor_price ?? 0) * quantity;
        const baseDiscount = Number(item.discount_amount ?? 0);
        const itemPrice = roundCurrency(baseItemPrice * 1.04);
        const cashDiscount = cashPayment ? itemPrice - baseItemPrice : 0;
        const discount = roundCurrency(cashPayment ? baseDiscount : baseDiscount * 1.04);
        const finalPrice = roundCurrency(itemPrice - cashDiscount - discount);

        return {
            vendorId: normalizeVendorId(item.vendor_id),
            vendorInventoryId: String(item.vendor_inventory_id ?? ''),
            itemName: String(item.name ?? ''),
            itemPrice,
            cashDiscount,
            discount,
            finalPrice
        };
    });

    const sortedItems = [...receiptItems].sort((a, b) => {
        const aNum = Number(a.vendorId);
        const bNum = Number(b.vendorId);
        const bothNumeric = Number.isFinite(aNum) && Number.isFinite(bNum);
        if (bothNumeric) {
            return aNum - bNum;
        }
        return a.vendorId.localeCompare(b.vendorId);
    });

    const groupedByVendor = new Map<string, ReceiptItem[]>();
    sortedItems.forEach(item => {
        const existing = groupedByVendor.get(item.vendorId) ?? [];
        existing.push(item);
        groupedByVendor.set(item.vendorId, existing);
    });

    const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
    const hasCashDiscountColumn = cashPayment;
    const rowColSpan = hasCashDiscountColumn ? 6 : 5;
    const totalColSpan = hasCashDiscountColumn ? 7 : 6;
    const columnWidths = hasCashDiscountColumn
        ? ['8%', '14%', '32%', '11%', '11%', '12%', '12%']
        : ['8%', '14%', '40%', '12%', '12%', '14%'];

    const rows: string[] = [];

    Array.from(groupedByVendor.entries()).forEach(([vendorId, vendorItems]) => {
        vendorItems.forEach(item => {
            rows.push(`
                <tr>
                    <td>${escapeHtml(vendorId)}</td>
                    <td>${escapeHtml(item.vendorInventoryId)}</td>
                    <td>${escapeHtml(item.itemName)}</td>
                    <td>${formatCurrency(item.itemPrice)}</td>
                    ${hasCashDiscountColumn ? `<td class="money-column">${formatCurrency(item.cashDiscount)}</td>` : ''}
                    <td>${formatCurrency(item.discount)}</td>
                    <td>${formatCurrency(item.finalPrice)}</td>
                </tr>
            `);
        });

        rows.push(`
            <tr><td colspan="${totalColSpan}" style="height: 0.25in;"></td></tr>
        `);
    });

    const subtotal = roundCurrency(receiptItems.reduce((sum, item) => sum + item.finalPrice, 0));
    const tax = roundCurrency(subtotal * TAX_RATE);
    const grandTotal = roundCurrency(subtotal + tax);
    const generatedAt = new Date().toLocaleString();
    const logoUrl = '../../assets/logo.svg';

    const receiptHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <base href="${escapeHtml(window.location.href)}">
            <title>Itemized Receipt</title>
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
                .receipt-header {
                    display: flex;
                    flex-direction: row;
                    align-items: center;
                    justify-content: space-between;
                    gap: 12px;
                    margin-bottom: 0.2in;
                }
                .receipt-header img {
                    width: 42%;
                    max-width: 260px;
                    height: auto;
                    object-fit: contain;
                }
                .receipt-header-meta {
                    flex: 1;
                    text-align: right;
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
                    border: solid;
                    background: transparent;
                }
                th {
                    border: solid;
                }
                th, td {
                    padding: 6px 8px;
                    text-align: left;
                    font-size: 0.82rem;
                    vertical-align: top;
                    word-break: break-word;
                }
                tbody tr:nth-child(odd) {
                    background: lightgray;
                }
                th.money-column,
                td.money-column {
                    padding-left: 4px;
                    padding-right: 4px;
                    white-space: nowrap;
                }
                .grand-total-row td {
                    font-size: 0.9rem;
                    padding-top: 0.15in;
                }
                @media print {
                    html,
                    body,
                    table,
                    th,
                    td,
                    tr {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    tbody tr:nth-child(odd) {
                        background: #bfbfbf !important;
                    }
                    .receipt-header img {
                        filter: grayscale(100%);
                    }
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
                <div class="receipt-header">
                    <img src="${escapeHtml(logoUrl)}" alt="LAMbda logo">
                    <div class="receipt-header-meta">
                        <h1>Receipt</h1>
                        <p>${escapeHtml(generatedAt)}</p>
                    </div>
                </div>
                <table>
                    <colgroup>
                        ${columnWidths.map(width => `<col style="width: ${width};">`).join('')}
                    </colgroup>
                    <thead>
                        <tr>
                            <th style="white-space: nowrap">Vendor</th>
                            <th>Inventory ID</th>
                            <th>Item</th>
                            <th class="money-column">Price</th>
                            ${hasCashDiscountColumn ? '<th class="money-column">Cash Disc.</th>' : ''}
                            <th class="money-column">Disc.</th>
                            <th class="money-column">Final Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colspan="${rowColSpan}" style="text-align: right;"><strong>Subtotal:</strong></td>
                            <td><strong>${formatCurrency(subtotal)}</strong></td>
                        </tr>
                        <tr>
                            <td colspan="${rowColSpan}" style="text-align: right;"><strong>Tax:</strong></td>
                            <td><strong>${formatCurrency(tax)}</strong></td>
                        </tr>
                        <tr class="grand-total-row">
                            <td colspan="${rowColSpan}" style="text-align: right;"><strong>Total:</strong></td>
                            <td><strong>${formatCurrency(grandTotal)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </body>
        </html>
    `;

    const receiptWindow = window.open('', '_blank');
    if (!receiptWindow) {
        alert('Unable to open receipt window. Please allow pop-ups and try again.');
        return;
    }
    receiptWindow.document.write(receiptHtml);
    receiptWindow.document.close();
}
