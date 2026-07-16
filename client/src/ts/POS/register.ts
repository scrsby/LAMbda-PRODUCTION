import { apiAxios } from '../utilities/api.js';
import { getCurrentUser } from '../utilities/api.js';
import { showSuccessMessage, showErrorMessage } from '../utilities/messages.js';
import { updateProfileCard } from "../utilities/ui.js";

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = '/auth/login.html';
        return;
    }
    if (user.userType !== 'employee' && user.userType !== 'admin' ) {
        window.location.href = '/auth/login.html';
        return;
    }

    updateProfileCard(user);
});

declare global {
    interface Window {
        $?: any;
        jQuery?: any;
    }
}

type TicketItem = {
    ticket_item_id?: number;
    vendor_id: number;
    vendor_inventory_id: string;
    name: string;
    quantity: number;
    vendor_price: number;
    discount_percent: number;
    discount_amount: number;
    final_price: number;
};

type InventorySearchItem = {
    itemId: number;
    itemName: string;
    vendorId: number;
    inventoryCode: string | number | null;
    price: number;
    quantity: number;
};

let ticket_items: TicketItem[] = [];
let unsynced_items: TicketItem[] = [];
let ticketActive: boolean = false;
let ticketReadOnly: boolean = false;
let ticketDirty: boolean = false;
let searchResultsDataTable: any = null;
let itemSearchDebounceId: number | undefined;
let latestSearchRequestId = 0;
let editingItemIndex: number | null = null;

/// BUTTON HANDLERS
const ticketIdField = document.getElementById('ticket-id') as HTMLInputElement | null;
const primaryBtn = document.getElementById('primary-btn');
var primaryOption = 'create';
const secondaryBtn = document.getElementById('secondary-btn');
var secondaryOption = 'search';
const createItemBtn = document.getElementById('create-item-btn') as HTMLButtonElement | null;
const searchItemBtn = document.getElementById('search-item-btn') as HTMLButtonElement | null;
const checkoutBtn = document.getElementById('checkout-btn') as HTMLButtonElement | null;
const createReceiptBtn = document.getElementById('create-receipt-btn') as HTMLButtonElement | null;
const searchForm = document.getElementById('input_box') as HTMLFormElement | null;
const vendorIdInput = document.getElementById('vendor-id') as HTMLInputElement | null;
const vendorInventoryIdInput = document.getElementById('vendor-inventory-id') as HTMLInputElement | null;
const itemNameInput = document.getElementById('item-name') as HTMLInputElement | null;
const vendorPriceInput = document.getElementById('vendor-price') as HTMLInputElement | null;
const searchAndAddSection = document.getElementById('search-and-add') as HTMLDivElement | null;

function setTicketActionButtons(enabled: boolean) {
    if (createItemBtn) {
        createItemBtn.disabled = !enabled;
    }
    if (checkoutBtn) {
        checkoutBtn.disabled = !enabled;
    }
}

function setActiveTicketState(ticketId: string) {
    ticketActive = true;
    ticketReadOnly = false;
    ticketDirty = false;
    localStorage.setItem('currentTicketId', ticketId);

    if (ticketIdField) {
        ticketIdField.value = ticketId;
        ticketIdField.disabled = true;
    }

    searchAndAddSection!.style = '';
    primaryBtn!.textContent = 'Update Ticket';
    secondaryBtn!.textContent = 'Clear Ticket';
    primaryOption = 'update';
    secondaryOption = 'clear';
    
    setTicketActionButtons(true);
}

function setIdleTicketState() {
    ticketActive = false;
    ticketReadOnly = false;
    ticketDirty = false;
    editingItemIndex = null;

    if (ticketIdField) {
        ticketIdField.value = '';
        ticketIdField.disabled = false;
    }

    searchAndAddSection!.style = 'opacity: 0.6; pointer-events: none;';
    primaryBtn!.textContent = 'Create New';
    secondaryBtn!.textContent = 'Search Ticket';
    primaryOption = 'create';
    secondaryOption = 'search';

    setTicketActionButtons(false);
}

function setClosedTicketState(ticketId: string) {
    ticketActive = false;
    ticketReadOnly = true;
    ticketDirty = false;
    editingItemIndex = null;
    localStorage.removeItem('currentTicketId');

    if (ticketIdField) {
        ticketIdField.value = ticketId;
        ticketIdField.disabled = true;
    }

    searchAndAddSection!.style = 'opacity: 0.6; pointer-events: none;';
    primaryBtn!.textContent = 'Create New';
    secondaryBtn!.textContent = 'Search Ticket';
    primaryOption = 'create';
    secondaryOption = 'search';

    setTicketActionButtons(false);
}

primaryBtn?.addEventListener('click', async () => {
    if (primaryOption === 'create') {
        const ticketId = await createTicket();
        if (ticketId) {
            setActiveTicketState(ticketId);
        }
    } else if (primaryOption === 'update') {
        await updateTicket();
    }
});

secondaryBtn?.addEventListener('click', async () => {
    if (secondaryOption === 'search') {
        await searchTicket();
    } else if (secondaryOption === 'clear') {
        await clearTicket();
    }
});

createItemBtn?.addEventListener('click', () => {
    if (!vendorIdInput || !vendorInventoryIdInput || !itemNameInput || !vendorPriceInput ) {
        alert('Please provide vendor ID, vendor inventory ID, item name, and tag price.');
        return;
    } else {
        const quantityInput = document.getElementById('quantity') as HTMLInputElement | null;
        const quantity = quantityInput ? parseInt(quantityInput.value): 1;
        const vendor_id = parseInt(vendorIdInput.value);
        const vendor_inventory_id = vendorInventoryIdInput.value.trim();
        const name = itemNameInput.value.trim();
        const vendor_price = parseFloat(vendorPriceInput.value);
        if (isNaN(vendor_id) || !name || isNaN(vendor_price)) {
            alert('Please provide valid values for all item fields.');
            return;
        } else {
            createItemLocally(vendor_id, vendor_inventory_id, name, vendor_price, quantity);
            vendorIdInput.value = '';
            vendorInventoryIdInput.value = '';
            itemNameInput.value = '';
            vendorPriceInput.value = '';
            if (quantityInput) quantityInput.value = '1';
        }
    }
});

searchItemBtn?.addEventListener('click', async () => {
    await searchInventory(true);
});

searchForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    await searchInventory(true);
});

itemNameInput?.addEventListener('input', () => {
    window.clearTimeout(itemSearchDebounceId);

    const itemName = itemNameInput.value.trim();
    if (itemName.length < 4) {
        latestSearchRequestId++;
        renderSearchResultsMessage('Type at least 4 characters in Description to search inventory.');
        return;
    }

    itemSearchDebounceId = window.setTimeout(() => {
        void searchInventory(false);
    }, 300);
});

setIdleTicketState();
renderSearchResultsMessage('Type at least 4 characters in Description to search inventory.');

// Show Admin Controls button if the logged-in user is an admin
getCurrentUser().then(user => {
    if (user?.userType === 'admin') {
        const btn = document.getElementById('admin-controls-btn');
        const btnMobile = document.getElementById('admin-controls-btn-mobile');
        if (btn) btn.style.display = '';
        if (btnMobile) btnMobile.style.display = '';
    }
});

/*  CREATE TICKET
* This function sends a request to the backend to create a new ticket and returns the generated ticket ID. It also handles any errors that may occur during the process.
* Params: None
* Returns: The ID of the newly created ticket, or undefined if there was an error.
*/
async function createTicket() {
    try {
        const response = await apiAxios('/POS/create-ticket', { method: 'POST' });
        const { ticketId } = response;
        console.log('Created ticket with ID:', ticketId);
        return ticketId;
    } catch (error) {
        console.error('Error creating ticket:', error);
        alert('Failed to create ticket. Please try again.');
    }
}

async function updateTicket(): Promise<boolean> {
    const ticketId = localStorage.getItem('currentTicketId');
    if (!ticketId) {
        showErrorMessage('No active ticket to update.');
        return false;
    }
    try {
        const response = await apiAxios('/POS/update-ticket', {
            method: 'POST',
            data: {
                ticketId,
                ticket_items,
                unsynced_items
            }
        });
        ticket_items = [...ticket_items, ...(response.insertedItems as TicketItem[])];
        unsynced_items = [];
        ticketDirty = false;
        updateItemTable();
        showSuccessMessage('Ticket updated successfully.');
        return true;
    } catch (error) {
        console.error('Error updating ticket:', error);
        const message = (error as any)?.response?.data?.error ?? 'Failed to update ticket. Please try again.';
        showErrorMessage(message);
        return false;
    }
}

function updateItemTable() {
    const itemTableBody = document.getElementById('cart_list');
    if (!itemTableBody) return;
    itemTableBody.innerHTML = '';
    const allItems = [...ticket_items, ...unsynced_items];
    allItems.forEach((item, index) => {
        const subtotal = item.vendor_price * item.quantity;
        const isEditing = editingItemIndex === index;
        const row = document.createElement('tr');

        if (isEditing) {
            row.innerHTML = `
                <td><input class="cart-edit-input" data-field="vendor_id" type="number" value="${item.vendor_id}" min="1" aria-label="Vendor ID"></td>
                <td><input class="cart-edit-input" data-field="vendor_inventory_id" type="text" value="${escapeHtmlAttribute(item.vendor_inventory_id)}" aria-label="Vendor inventory ID"></td>
                <td><input class="cart-edit-input" data-field="name" type="text" value="${escapeHtmlAttribute(item.name)}" aria-label="Item name"></td>
                <td><input class="cart-edit-input" data-field="quantity" type="number" value="${item.quantity}" min="1" step="1" aria-label="Quantity"></td>
                <td><input class="cart-edit-input" data-field="subtotal" type="number" value="${subtotal.toFixed(2)}" min="0" step="0.01" aria-label="Subtotal"></td>
                <td><input class="cart-edit-input" data-field="discount_percent" type="number" value="${item.discount_percent > 0 ? item.discount_percent : ''}" min="0" step="0.01" placeholder="optional" aria-label="Discount percentage"></td>
                <td><input class="cart-edit-input" data-field="discount_amount" type="number" value="${item.discount_amount.toFixed(2)}" min="0" step="0.01" aria-label="Discount amount"></td>
                <td><input class="cart-edit-input" data-field="final_price" type="number" value="${item.final_price.toFixed(2)}" min="0" step="0.01" aria-label="Total"></td>
                <td style="display:flex;gap:0.25rem;align-items:center;">
                    <button type="button" class="btn btn-edit btn-edit-saving" data-action="edit" data-index="${index}">
                        <span class="material-symbols-outlined">check</span>
                    </button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>${item.vendor_id}</td>
                <td>${escapeHtmlAttribute(item.vendor_inventory_id)}</td>
                <td>${escapeHtmlAttribute(item.name)}</td>
                <td>${item.quantity}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td>${item.discount_percent > 0 ? `${item.discount_percent}%` : ''}</td>
                <td>$${item.discount_amount.toFixed(2)}</td>
                <td>$${item.final_price.toFixed(2)}</td>
                <td style="display:flex;gap:0.25rem;align-items:center;">
                    ${ticketReadOnly ? '' : `
                    <button type="button" class="btn btn-edit" data-action="edit" data-index="${index}">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button type="button" class="btn btn-danger" data-action="delete" data-index="${index}">
                        <span class="material-symbols-outlined">delete</span>
                    </button>`}
                </td>
            `;
        }

        row.querySelector('[data-action="edit"]')?.addEventListener('click', () => toggleItemEditMode(index, row));
        row.querySelector('[data-action="delete"]')?.addEventListener('click', () => removeItem(index));
        if (isEditing) {
            bindDiscountCalculationInputs(row);
        }
        itemTableBody.appendChild(row);
    });

    const total = allItems.reduce((sum, item) => sum + item.final_price, 0);
    const totalValueEl = document.getElementById('cart_total_value');
    if (totalValueEl) totalValueEl.textContent = total.toFixed(2);

    if (createReceiptBtn) {
        createReceiptBtn.disabled = allItems.length === 0;
    }
}

function bindDiscountCalculationInputs(row: HTMLTableRowElement) {
    const subtotalInput = row.querySelector('[data-field="subtotal"]') as HTMLInputElement | null;
    const discountPercentInput = row.querySelector('[data-field="discount_percent"]') as HTMLInputElement | null;
    const discountAmountInput = row.querySelector('[data-field="discount_amount"]') as HTMLInputElement | null;
    const finalPriceInput = row.querySelector('[data-field="final_price"]') as HTMLInputElement | null;
    if (!subtotalInput || !discountPercentInput || !discountAmountInput || !finalPriceInput) return;

    const hasDiscountPercent = () => discountPercentInput.value.trim() !== '';

    const recalcFromPercent = () => {
        const subtotal = parseFloat(subtotalInput.value);
        const discountPercent = parseFloat(discountPercentInput.value);
        if (isNaN(subtotal) || isNaN(discountPercent)) return;
        const discountAmount = roundCurrency((subtotal * discountPercent) / 100);
        discountAmountInput.value = discountAmount.toFixed(2);
        finalPriceInput.value = roundCurrency(subtotal - discountAmount).toFixed(2);
    };

    const recalcFromDiscountAmount = () => {
        const subtotal = parseFloat(subtotalInput.value);
        const discountAmount = parseFloat(discountAmountInput.value);
        if (isNaN(subtotal) || isNaN(discountAmount)) return;
        finalPriceInput.value = roundCurrency(subtotal - discountAmount).toFixed(2);
    };

    const recalcFromFinalPrice = () => {
        const subtotal = parseFloat(subtotalInput.value);
        const finalPrice = parseFloat(finalPriceInput.value);
        if (isNaN(subtotal) || isNaN(finalPrice)) return;
        discountAmountInput.value = roundCurrency(subtotal - finalPrice).toFixed(2);
    };

    const syncDiscountMode = () => {
        discountAmountInput.readOnly = hasDiscountPercent();
        if (hasDiscountPercent()) {
            recalcFromPercent();
        } else {
            recalcFromDiscountAmount();
        }
    };

    subtotalInput.addEventListener('input', () => {
        if (hasDiscountPercent()) {
            recalcFromPercent();
        } else {
            recalcFromDiscountAmount();
        }
    });
    discountPercentInput.addEventListener('input', syncDiscountMode);
    discountAmountInput.addEventListener('input', () => {
        if (!hasDiscountPercent()) {
            recalcFromDiscountAmount();
        }
    });
    finalPriceInput.addEventListener('input', () => {
        if (!hasDiscountPercent()) {
            recalcFromFinalPrice();
        }
    });

    syncDiscountMode();
}

function toggleItemEditMode(index: number, row: HTMLTableRowElement) {
    if (editingItemIndex === null) {
        editingItemIndex = index;
        updateItemTable();
        return;
    }

    if (editingItemIndex !== index) {
        showErrorMessage('Save the row currently being edited before editing another row.');
        return;
    }

    saveEditedItem(index, row);
}

function saveEditedItem(index: number, row: HTMLTableRowElement) {
    const currentItem = getCombinedItem(index);
    if (!currentItem) {
        editingItemIndex = null;
        updateItemTable();
        return;
    }

    const vendorIdInput = row.querySelector('[data-field="vendor_id"]') as HTMLInputElement | null;
    const vendorInventoryIdInput = row.querySelector('[data-field="vendor_inventory_id"]') as HTMLInputElement | null;
    const nameInput = row.querySelector('[data-field="name"]') as HTMLInputElement | null;
    const quantityInput = row.querySelector('[data-field="quantity"]') as HTMLInputElement | null;
    const subtotalInput = row.querySelector('[data-field="subtotal"]') as HTMLInputElement | null;
    const discountPercentInput = row.querySelector('[data-field="discount_percent"]') as HTMLInputElement | null;
    const discountAmountInput = row.querySelector('[data-field="discount_amount"]') as HTMLInputElement | null;
    const finalPriceInput = row.querySelector('[data-field="final_price"]') as HTMLInputElement | null;

    if (!vendorIdInput || !vendorInventoryIdInput || !nameInput || !quantityInput || !subtotalInput || !discountPercentInput || !discountAmountInput || !finalPriceInput) {
        showErrorMessage('Could not save item due to missing edit fields.');
        return;
    }

    const vendor_id = parseInt(vendorIdInput.value, 10);
    const vendor_inventory_id = vendorInventoryIdInput.value.trim();
    const name = nameInput.value.trim();
    const quantity = parseInt(quantityInput.value, 10);
    const subtotal = parseFloat(subtotalInput.value);
    const discountPercentRaw = discountPercentInput.value.trim();

    if (isNaN(vendor_id) || vendor_id <= 0 || !name || isNaN(quantity) || quantity <= 0 || isNaN(subtotal) || subtotal < 0) {
        alert('Please enter valid values for all editable fields.');
        return;
    }

    let discount_percent = 0;
    let discount_amount: number;
    let final_price: number;

    if (discountPercentRaw !== '') {
        discount_percent = parseFloat(discountPercentRaw);
        if (isNaN(discount_percent) || discount_percent < 0) {
            showErrorMessage('Discount percentage must be a valid non-negative number.');
            return;
        }
        discount_amount = roundCurrency((subtotal * discount_percent) / 100);
        final_price = roundCurrency(subtotal - discount_amount);
    } else {
        const typedDiscountAmount = parseFloat(discountAmountInput.value);
        const typedFinalPrice = parseFloat(finalPriceInput.value);

        if (isNaN(typedDiscountAmount) || typedDiscountAmount < 0 || isNaN(typedFinalPrice) || typedFinalPrice < 0) {
            showErrorMessage('Discount amount and total must be valid non-negative numbers.');
            return;
        }

        final_price = roundCurrency(typedFinalPrice);
        discount_amount = roundCurrency(subtotal - final_price);
    }

    if (discount_amount < 0 || final_price < 0) {
        showErrorMessage('Discount and total values cannot be negative.');
        return;
    }

    const vendor_price = quantity > 0 ? roundCurrency(subtotal / quantity) : 0;

    const updatedItem: TicketItem = {
        ...currentItem,
        vendor_id,
        vendor_inventory_id,
        name,
        quantity,
        vendor_price,
        discount_percent,
        discount_amount,
        final_price
    };

    setCombinedItem(index, updatedItem);
    ticketDirty = true;
    editingItemIndex = null;
    updateItemTable();
    showSuccessMessage('Item updated.');
}

function getCombinedItem(index: number): TicketItem | null {
    if (index < ticket_items.length) {
        return ticket_items[index] ?? null;
    }
    const unsyncedIndex = index - ticket_items.length;
    return unsynced_items[unsyncedIndex] ?? null;
}

function setCombinedItem(index: number, item: TicketItem): void {
    if (index < ticket_items.length) {
        ticket_items[index] = item;
        return;
    }
    const unsyncedIndex = index - ticket_items.length;
    unsynced_items[unsyncedIndex] = item;
}

function roundCurrency(value: number): number {
    return Math.round(value * 100) / 100;
}

function escapeHtmlAttribute(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/* REMOVE ITEM
* Removes an item from the combined list by index. Items within the ticket_items range
* are removed from ticket_items; items beyond that range are removed from unsynced_items.
* Params: index (number) — index within the allItems combined array
* Returns: None
*/
function removeItem(index: number) {
    if (editingItemIndex === index) {
        editingItemIndex = null;
    } else if (editingItemIndex !== null && editingItemIndex > index) {
        editingItemIndex -= 1;
    }

    if (index < ticket_items.length) {
        ticket_items.splice(index, 1);
    } else {
        unsynced_items.splice(index - ticket_items.length, 1);
    }
    ticketDirty = true;
    updateItemTable();
}

function createItemLocally(vendor_id: number, vendor_inventory_id: string, name: string, vendor_price: number, quantity: number) {
    const subtotal = vendor_price * quantity;
    const newItem: TicketItem = { vendor_id, vendor_inventory_id, name, quantity, vendor_price, discount_percent: 0, discount_amount: 0, final_price: roundCurrency(subtotal) };
    unsynced_items.push(newItem);
    ticketDirty = true;
    updateItemTable();
}

function initializeSearchResultsPagination() {
    const jquery = window.$;
    const tableSelector = '#search_table';

    if (!jquery || !jquery.fn?.DataTable) {
        return;
    }

    if (jquery.fn.DataTable.isDataTable(tableSelector)) {
        jquery(tableSelector).DataTable().destroy();
    }

    searchResultsDataTable = jquery(tableSelector).DataTable({
        pageLength: 5,
        lengthChange: false,
        searching: false,
        ordering: false,
        responsive: true,
        info: true,
        autoWidth: false,
        language: {
            paginate: {
                previous: 'Prev',
                next: 'Next'
            }
        }
    });
}

function destroySearchResultsPagination() {
    const jquery = window.$;
    const tableSelector = '#search_table';

    if (!jquery || !jquery.fn?.DataTable) {
        return;
    }

    if (jquery.fn.DataTable.isDataTable(tableSelector)) {
        jquery(tableSelector).DataTable().destroy();
    }

    searchResultsDataTable = null;
}

function renderSearchResultsMessage(message: string) {
    const itemTableBody = document.getElementById('item_list');
    if (!itemTableBody) {
        return;
    }

    destroySearchResultsPagination();
    itemTableBody.innerHTML = `
        <tr>
            <td colspan="5" class="search-empty-state">${message}</td>
        </tr>
    `;
}

function renderSearchResults(items: InventorySearchItem[]) {
    const itemTableBody = document.getElementById('item_list');
    if (!itemTableBody) {
        return;
    }

    destroySearchResultsPagination();
    itemTableBody.innerHTML = '';

    items.forEach((item) => {
        const row = document.createElement('tr');
        const inventoryCode = normalizeInventoryCode(item.inventoryCode);

        row.innerHTML = `
            <td>${item.vendorId}</td>
            <td>${inventoryCode}</td>
            <td>${item.itemName}</td>
            <td>$${Number(item.price).toFixed(2)}</td>
            <td>
                <button type="button" class="btn btn-primary search-add-btn">Add Item</button>
            </td>
        `;

        row.querySelector('button')?.addEventListener('click', () => {
            createItemLocally(item.vendorId, inventoryCode, item.itemName, Number(item.price), 1);
            clearItemEntryFields();

            showSuccessMessage(`${item.itemName} added to cart.`);
        });

        itemTableBody.appendChild(row);
    });

    initializeSearchResultsPagination();
}

function normalizeInventoryCode(value: string | number | null): string {
    if (value === null || value === undefined) {
        return '';
    }

    const normalizedValue = String(value).trim();
    if (!normalizedValue || normalizedValue.toLowerCase() === 'null') {
        return '';
    }

    return normalizedValue;
}

function clearItemEntryFields(): void {
    if (searchForm) {
        searchForm.reset();
    }
}

async function searchInventory(manualSearch: boolean) {
    const itemName = itemNameInput?.value.trim() ?? '';
    const vendorInventoryId = vendorInventoryIdInput?.value.trim() ?? '';
    const vendorIdValue = vendorIdInput?.value.trim() ?? '';

    if (!manualSearch && itemName.length < 4) {
        latestSearchRequestId++;
        renderSearchResultsMessage('Type at least 4 characters in Description to search inventory.');
        return;
    }

    if (!itemName && !vendorInventoryId && !vendorIdValue) {
        latestSearchRequestId++;
        renderSearchResultsMessage('Enter a vendor ID, vendor inventory ID, or description to search inventory.');
        return;
    }

    const params = new URLSearchParams();

    if (itemName) {
        params.set('itemName', itemName);
    }

    if (vendorInventoryId) {
        params.set('inventoryCode', vendorInventoryId);
    }

    if (vendorIdValue) {
        const parsedVendorId = parseInt(vendorIdValue, 10);
        if (isNaN(parsedVendorId) || parsedVendorId <= 0) {
            latestSearchRequestId++;
            showErrorMessage('Vendor ID must be a valid positive number.');
            return;
        }
        params.set('vendorId', String(parsedVendorId));
    }

    const searchRequestId = ++latestSearchRequestId;

    try {
        const response = await apiAxios(`/POS/inventory-search?${params.toString()}`, {
            method: 'GET'
        });

        if (searchRequestId !== latestSearchRequestId) {
            return;
        }

        const items = (response.items ?? []) as InventorySearchItem[];

        if (items.length === 0) {
            renderSearchResultsMessage('No inventory items matched your search.');
            return;
        }

        renderSearchResults(items);
    } catch (error: any) {
        if (searchRequestId !== latestSearchRequestId) {
            return;
        }

        if (error.response?.data?.message) {
            showErrorMessage(error.response.data.message);
        } else {
            showErrorMessage('Failed to search inventory. Please try again.');
        }
    }
}

async function searchTicket() {
    const ticketId = ticketIdField?.value.trim();
    if (!ticketId) {
        showErrorMessage('Please enter a ticket ID to search.');
        return;
    }
    try {
        const response = await apiAxios(`/POS/ticket/${ticketId}`, { method: 'GET' });
        if (!response.items) {
            showErrorMessage(`Ticket #${ticketId} found but returned no items array.`);
            return;
        }
        ticket_items = response.items as TicketItem[];
        unsynced_items = [];
        ticketDirty = false;
        editingItemIndex = null;
        updateItemTable();
        if (response.ticket?.ticket_status === 'closed') {
            setClosedTicketState(ticketId);
            showSuccessMessage(`Successfully retrieved CLOSED Ticket #${ticketId}.`);
        } else {
            setActiveTicketState(ticketId);
            showSuccessMessage(`Ticket #${ticketId} loaded.`);
        }
    } catch (error: any) {
        if (error.response?.status === 404) {
            showErrorMessage(`Ticket #${ticketId} not found.`);
        } else {
            showErrorMessage('Failed to load ticket. Please try again.');
        }
    }
}

async function clearTicket() {
    if (ticketDirty) {
        if (!ticketActive) {
            console.warn('Resetting unsaved ticket state because no active ticket is available.');
            ticketDirty = false;
            showErrorMessage('Cannot clear unsaved changes without an active ticket.');
            return;
        }

        const success = await updateTicket();
        if (!success) return;
    }
    ticket_items = [];
    unsynced_items = [];
    editingItemIndex = null;
    localStorage.removeItem('currentTicketId');
    setIdleTicketState();
    updateItemTable();
}

/// CHECKOUT MODAL
const checkoutOverlay = document.getElementById('checkout-overlay') as HTMLDivElement | null;
const checkoutTotal = document.getElementById('checkout-modal-total') as HTMLSpanElement | null;
const checkoutGoBackBtn = document.getElementById('checkout-go-back-btn') as HTMLButtonElement | null;
const markPaidBtn = document.getElementById('mark-paid-btn') as HTMLButtonElement | null;

function openCheckoutModal() {
    if (checkoutOverlay) {
        checkoutOverlay.style.display = 'flex';
        const allItems = [...ticket_items, ...unsynced_items];
        checkoutTotal!.textContent = '$' + allItems.reduce((sum, item) => sum + item.final_price, 0).toFixed(2);
        if (markPaidBtn) markPaidBtn.disabled = false;
    }
}

function closeCheckoutModal() {
    if (checkoutOverlay) {
        checkoutOverlay.style.display = 'none';
        if (markPaidBtn) markPaidBtn.disabled = true;
    }
}

/* CLOSE TICKET
* Syncs any pending items then marks the active ticket as closed (paid).
*/
async function closeTicket() {
    const ticketId = localStorage.getItem('currentTicketId');
    if (!ticketId) {
        showErrorMessage('No active ticket to close.');
        return;
    }

    if (markPaidBtn) markPaidBtn.disabled = true;

    if (ticketDirty) {
        const updated = await updateTicket();
        if (!updated) {
            if (markPaidBtn) markPaidBtn.disabled = false;
            return;
        }
    }

    try {
        await apiAxios('/POS/close-ticket', {
            method: 'POST',
            data: { ticketId }
        });
        closeCheckoutModal();
        ticket_items = [];
        unsynced_items = [];
        editingItemIndex = null;
        localStorage.removeItem('currentTicketId');
        setIdleTicketState();
        updateItemTable();
        showSuccessMessage(`Ticket #${ticketId} marked as paid and closed.`);
    } catch (error: any) {
        if (markPaidBtn) markPaidBtn.disabled = false;
        showErrorMessage(error.response?.data?.error ?? 'Failed to close ticket. Please try again.');
    }
}

checkoutBtn?.addEventListener('click', () => {
    openCheckoutModal();
});

markPaidBtn?.addEventListener('click', () => {
    void closeTicket();
});

checkoutGoBackBtn?.addEventListener('click', () => {
    closeCheckoutModal();
});

// Close modal when clicking the overlay background
checkoutOverlay?.addEventListener('click', (e) => {
    if (e.target === checkoutOverlay) {
        closeCheckoutModal();
    }
});

// Warn before closing tab / navigating away when there are unsaved items on an active ticket
window.addEventListener('beforeunload', (e) => {
    if (ticketActive && ticketDirty) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// Intercept nav-link clicks to prompt the user to save before leaving
document.querySelectorAll<HTMLAnchorElement>('a.nav-link, .mobile-menu-nav a').forEach((link) => {
    link.addEventListener('click', (e) => {
        if (ticketActive && ticketDirty) {
            const confirmed = window.confirm(
                'You have unsaved items on this ticket. Do you want to save before leaving?'
            );
            if (confirmed) {
                e.preventDefault();
                const href = link.href;
                void updateTicket().then((success) => {
                    if (success) {
                        window.location.href = href;
                    }
                });
            }
            // If not confirmed, navigation continues normally
        }
    });
});

createReceiptBtn?.addEventListener('click', () => {
    createItemizedReceipt();
});

const URL_REVOKE_DELAY_MS = 60_000;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function normalizeVendorId(value: number | string | null | undefined): string {
    if (value === null || value === undefined) {
        return 'UNKNOWN';
    }
    const normalized = String(value).trim();
    return normalized === '' ? 'UNKNOWN' : normalized;
}

function createItemizedReceipt() {
    const allItems = [...ticket_items, ...unsynced_items];

    if (allItems.length === 0) {
        alert('No items in the cart to generate a receipt.');
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

    const receiptItems: ReceiptItem[] = allItems.map(item => {
        const quantityRaw = Number(item.quantity ?? 1);
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

    Array.from(groupedByVendor.entries()).forEach(([vendorId, items]) => {
        let vendorFinalTotal = 0;

        items.forEach(item => {
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
    const ticketId = localStorage.getItem('currentTicketId');
    const ticketLabel = ticketId ? ` — Ticket #${escapeHtml(ticketId)}` : '';

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
                <h1>Itemized Receipt${ticketLabel}</h1>
                <p>Generated ${escapeHtml(generatedAt)}</p>
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
                            <td colspan="5" style="text-align: right;"><strong>Grand Total:</strong></td>
                            <td><strong>${formatCurrency(grandTotal)}</strong></td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </body>
        </html>
    `;

    const receiptBlob = new Blob([receiptHtml], { type: 'text/html' });
    const receiptUrl = URL.createObjectURL(receiptBlob);
    const receiptWindow = window.open(receiptUrl, '_blank', 'noopener,noreferrer');
    if (!receiptWindow) {
        URL.revokeObjectURL(receiptUrl);
        alert('Unable to open receipt window. Please allow pop-ups and try again.');
        return;
    }

    const revokeBlobUrl = () => URL.revokeObjectURL(receiptUrl);
    const windowClosedCheck = window.setInterval(() => {
        if (receiptWindow.closed) {
            window.clearInterval(windowClosedCheck);
            revokeBlobUrl();
        }
    }, 1000);

    window.setTimeout(() => {
        window.clearInterval(windowClosedCheck);
        revokeBlobUrl();
    }, URL_REVOKE_DELAY_MS);
}