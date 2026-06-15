/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Register POS Transaction
 File: register.ts
 Description: Handles all client-side logic for registering a POS transaction, including form handling and API communication.
 Last Edited: 10 June 2026
*/

import { apiAxios } from '../utilities/api.js';
import { getCurrentUser } from '../utilities/api.js';
import { showSuccessMessage, showErrorMessage } from '../utilities/messages.js';

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
const searchForm = document.getElementById('input_box') as HTMLFormElement | null;
const vendorIdInput = document.getElementById('vendor-id') as HTMLInputElement | null;
const vendorInventoryIdInput = document.getElementById('vendor-inventory-id') as HTMLInputElement | null;
const itemNameInput = document.getElementById('item-name') as HTMLInputElement | null;
const vendorPriceInput = document.getElementById('vendor-price') as HTMLInputElement | null;

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
    localStorage.setItem('currentTicketId', ticketId);

    if (ticketIdField) {
        ticketIdField.value = ticketId;
        ticketIdField.disabled = true;
    }

    primaryBtn!.textContent = 'Update Ticket';
    secondaryBtn!.textContent = 'Clear Ticket';
    primaryOption = 'update';
    secondaryOption = 'clear';
    
    setTicketActionButtons(true);
}

function setIdleTicketState() {
    ticketActive = false;
    editingItemIndex = null;

    if (ticketIdField) {
        ticketIdField.value = '';
        ticketIdField.disabled = false;
    }

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
        if (isNaN(vendor_id) || !vendor_inventory_id || !name || isNaN(vendor_price)) {
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

/* UPDATE TICKET
* Sends ticket_items (previously synced) and unsynced_items (new) to the backend.
* On success, moves unsynced items (now with ticket_item_ids) into ticket_items and shows a success message.
* Params: None
* Returns: Promise<boolean> — true if update succeeded
*/
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
        updateItemTable();
        showSuccessMessage('Ticket updated successfully.');
        return true;
    } catch (error) {
        console.error('Error updating ticket:', error);
        showErrorMessage('Failed to update ticket. Please try again.');
        return false;
    }
}

/* UPDATE ITEM TABLE
* Takes both the ticket_items array and the unsynced_items array, and updates the item table in the UI to reflect the current state of the ticket. It ensures that all items are displayed correctly, including any new items that have been added but not yet synced with the backend.
* Params: None
* Returns: None
*/
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
                <td><input class="cart-edit-input" data-field="vendor_id" type="number" value="${item.vendor_id}" min="1"></td>
                <td><input class="cart-edit-input" data-field="vendor_inventory_id" type="text" value="${escapeHtmlAttribute(item.vendor_inventory_id)}"></td>
                <td><input class="cart-edit-input" data-field="name" type="text" value="${escapeHtmlAttribute(item.name)}"></td>
                <td><input class="cart-edit-input" data-field="quantity" type="number" value="${item.quantity}" min="1" step="1"></td>
                <td><input class="cart-edit-input" data-field="subtotal" type="number" value="${subtotal.toFixed(2)}" min="0" step="0.01"></td>
                <td><input class="cart-edit-input" data-field="discount_percent" type="number" value="${item.discount_percent > 0 ? item.discount_percent : ''}" min="0" step="0.01" placeholder="optional"></td>
                <td><input class="cart-edit-input" data-field="discount_amount" type="number" value="${item.discount_amount.toFixed(2)}" min="0" step="0.01"></td>
                <td><input class="cart-edit-input" data-field="final_price" type="number" value="${item.final_price.toFixed(2)}" min="0" step="0.01"></td>
                <td style="display:flex;gap:0.25rem;align-items:center;">
                    <button type="button" class="btn btn-edit btn-edit-saving" data-action="edit" data-index="${index}">
                        <span class="material-symbols-outlined">check</span>
                    </button>
                </td>
            `;
        } else {
            row.innerHTML = `
                <td>${item.vendor_id}</td>
                <td>${item.vendor_inventory_id}</td>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>$${subtotal.toFixed(2)}</td>
                <td>${item.discount_percent > 0 ? `${item.discount_percent}%` : ''}</td>
                <td>$${item.discount_amount.toFixed(2)}</td>
                <td>$${item.final_price.toFixed(2)}</td>
                <td style="display:flex;gap:0.25rem;align-items:center;">
                    <button type="button" class="btn btn-edit" data-action="edit" data-index="${index}">
                        <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button type="button" class="btn btn-danger" data-action="delete" data-index="${index}">
                        <span class="material-symbols-outlined">delete</span>
                    </button>
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
        discountAmountInput.disabled = hasDiscountPercent();
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

    if (isNaN(vendor_id) || vendor_id <= 0 || !vendor_inventory_id || !name || isNaN(quantity) || quantity <= 0 || isNaN(subtotal) || subtotal < 0) {
        showErrorMessage('Please enter valid values for all editable fields.');
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
    return Math.round((value + Number.EPSILON) * 100) / 100;
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
    updateItemTable();
}

/* CREATE ITEM LOCALLY
* This function creates a new item object based on the provided parameters and adds it to the unsynced_items array. It also calls the updateItemTable function to refresh the UI and display the new item in the item table.
* Params: id (string), name (string), price (number), quantity (number)
* Returns: None
*/
function createItemLocally(vendor_id: number, vendor_inventory_id: string, name: string, vendor_price: number, quantity: number) {
    const subtotal = vendor_price * quantity;
    const newItem: TicketItem = { vendor_id, vendor_inventory_id, name, quantity, vendor_price, discount_percent: 0, discount_amount: 0, final_price: roundCurrency(subtotal) };
    unsynced_items.push(newItem);
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

/* SEARCH TICKET
* Fetches an existing ticket by ID from the backend, populates ticket_items with the
* returned items, and puts the register into active ticket state.
* Params: None (reads ticket-id input field)
* Returns: None
*/
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
        editingItemIndex = null;
        updateItemTable();
        setActiveTicketState(ticketId);
        showSuccessMessage(`Ticket #${ticketId} loaded.`);
    } catch (error: any) {
        if (error.response?.status === 404) {
            showErrorMessage(`Ticket #${ticketId} not found.`);
        } else {
            showErrorMessage('Failed to load ticket. Please try again.');
        }
    }
}

/* CLEAR TICKET
* Saves any pending items via updateTicket, then resets the register to idle state.
* Params: None
* Returns: None
*/
async function clearTicket() {
    if (ticket_items.length > 0 || unsynced_items.length > 0) {
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
const checkoutGoBackBtn = document.getElementById('checkout-go-back-btn') as HTMLButtonElement | null;

function openCheckoutModal() {
    if (checkoutOverlay) {
        checkoutOverlay.style.display = 'flex';
    }
}

function closeCheckoutModal() {
    if (checkoutOverlay) {
        checkoutOverlay.style.display = 'none';
    }
}

checkoutBtn?.addEventListener('click', () => {
    openCheckoutModal();
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