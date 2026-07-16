export const UNKNOWN_VENDOR_ID = 'UNKNOWN';

export interface ReceiptTicketItem {
    vendor_id: number | string | null | undefined;
    vendor_inventory_id: string;
    name: string;
    quantity?: number | null;
    vendor_price?: number | null;
    discount_amount?: number | null;
    final_price?: number | null;
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

/*  OPEN ITEMIZED RECEIPT
 * Generates a printable HTML receipt in a new tab from the provided ticket items.
 * Items are sorted and grouped by vendor ID; per-vendor subtotals and a grand total
 * footer are included.
 * Params:
 *   items       — array of ticket items
 *   ticketLabel — label string appended to the receipt title (e.g. " — Ticket #42");
 *                 pass an empty string for no label
 */
export function openItemizedReceipt(items: ReceiptTicketItem[], ticketLabel: string): void {
    if (items.length === 0) {
        alert('No items to generate a receipt.');
        return;
    }

    type ReceiptItem = {
        vendorId: string;
        vendorInventoryId: string;
        itemName: string;
        itemPrice: number;
        discount: number;
        finalPrice: number;
    };

    const receiptItems: ReceiptItem[] = items.map(item => {
        const quantityRaw = Number(item.quantity ?? 1);
        // Fractional quantities are intentional — items can be priced by weight or partial unit
        const hasInvalidQuantity = !Number.isFinite(quantityRaw) || quantityRaw <= 0;
        const quantity = hasInvalidQuantity ? 1 : quantityRaw;
        if (hasInvalidQuantity) {
            console.warn('Invalid ticket item quantity. Defaulting to 1.', { item });
        }
        const itemPrice = Number(item.vendor_price ?? 0) * quantity;
        const discount = Number(item.discount_amount ?? 0);
        const finalPrice = Number(item.final_price ?? itemPrice - discount);

        return {
            vendorId: normalizeVendorId(item.vendor_id),
            vendorInventoryId: String(item.vendor_inventory_id ?? ''),
            itemName: String(item.name ?? ''),
            itemPrice,
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

    const rows: string[] = [];

    Array.from(groupedByVendor.entries()).forEach(([vendorId, vendorItems]) => {
        let vendorFinalTotal = 0;

        vendorItems.forEach(item => {
            vendorFinalTotal += item.finalPrice;

            rows.push(`
                <tr>
                    <td>${escapeHtml(vendorId)}</td>
                    <td>${escapeHtml(item.vendorInventoryId)}</td>
                    <td>${escapeHtml(item.itemName)}</td>
                    <td>${formatCurrency(item.itemPrice)}</td>
                    <td>${formatCurrency(item.discount)}</td>
                    <td>${formatCurrency(item.finalPrice)}</td>
                </tr>
            `);
        });

        rows.push(`
            <tr class="vendor-total-row">
                <td colspan="5"></td>
                <td><strong>${formatCurrency(vendorFinalTotal)}</strong></td>
            </tr>
            <tr><td colspan="6" style="height: 0.25in;"></td></tr>
        `);
    });

    const grandTotal = receiptItems.reduce((sum, item) => sum + item.finalPrice, 0);
    const generatedAt = new Date().toLocaleString();

    const receiptHtml = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
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
                td:nth-child(4),
                td:nth-child(5),
                td:nth-child(6) {
                    padding-left: 4px;
                    padding-right: 4px;
                    white-space: nowrap;
                }
                .grand-total-row td {
                    font-size: 0.9rem;
                    padding-top: 0.15in;
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
                <h1>Receipt</h1>
                <p>${escapeHtml(generatedAt)}</p>
                <table>
                    <colgroup>
                        <col style="width: 8%;">
                        <col style="width: 14%;">
                        <col style="width: 40%;">
                        <col style="width: 12%;">
                        <col style="width: 12%;">
                        <col style="width: 14%;">
                    </colgroup>
                    <thead>
                        <tr>
                            <th style="white-space: nowrap">Vendor</th>
                            <th>Inventory ID</th>
                            <th>Item</th>
                            <th>Price</th>
                            <th>Disc.</th>
                            <th>Final Price</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.join('')}
                    </tbody>
                    <tfoot>
                        <tr class="grand-total-row">
                            <td colspan="5" style="text-align: right;"><strong>Total:</strong></td>
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
