import { apiAxios, requireAuth, logout } from '../utilities/api.js';
import { showErrorMessage, showSuccessMessage } from '../utilities/messages.js';
import { updateProfileCard } from '../utilities/ui.js';
import { requireUserType } from '../utilities/redirect.js';
let inventoryDataTable = null;
document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    if (!user)
        return;
    await requireUserType('vendor', user);
    updateProfileCard(user);
    hideSearchQueryMessage();
    loadInventoryTable();
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
});
// Item form handler
const inventoryForm = document.getElementById('inventory-form');
inventoryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitter = event.submitter;
    if (!submitter) {
        return;
    }
    const itemName = document.getElementById('item-name')?.value.trim();
    const inventoryCodeValue = document.getElementById('vendor-inventory-code')?.value.trim();
    const itemPriceValue = document.getElementById('item-price')?.value.trim();
    const quantityValue = document.getElementById('item-quantity')?.value.trim();
    const itemPrice = parseFloat(itemPriceValue);
    const qty = parseInt(quantityValue, 10);
    const quantity = !qty || qty <= 0 ? 1 : qty;
    if (submitter.id === 'search-item-btn') {
        await searchItems({
            itemName,
            inventoryCode: inventoryCodeValue,
            price: itemPriceValue,
            quantity: quantityValue
        });
        return;
    }
    else if (submitter.id === 'add-item-btn') {
        if (!itemPrice || itemPrice <= 0 || !itemName) {
            alert("Please fill in all required fields with valid values.");
            return;
        }
        try {
            await addItem(itemName, inventoryCodeValue || null, itemPrice, quantity);
            showSuccessMessage('Item added successfully!');
            clearInventoryForm();
            hideSearchQueryMessage();
            loadInventoryTable();
        }
        catch (error) {
            if (error.response?.data?.message) {
                showErrorMessage(error.response.data.message);
            }
            else if (error.message) {
                showErrorMessage(error.message);
            }
            else {
                showErrorMessage('An error occurred while adding the item');
            }
        }
    }
    else {
        return;
    }
});
/* ADD ITEM
* Handles form submission for creating new inventory items with a vendor account
* PARAMS - name: string, inventoryCode: string | null, price: number, quantity: number
* RETURNS - void
*/
async function addItem(itemName, inventoryCode, price, quantity) {
    const response = await apiAxios('/inventory/vendor/add', {
        method: 'POST',
        body: {
            itemName: itemName,
            inventoryCode: inventoryCode,
            price: price,
            quantity: quantity
        }
    });
    console.log("Add Item Response: ", response);
}
async function loadInventoryTable() {
    try {
        const response = await apiAxios('/inventory/vendor/items', {
            method: 'GET'
        });
        renderInventoryTable(response.items, 'No inventory items found');
    }
    catch (error) {
        console.error('Error loading inventory table:', error);
        renderInventoryTableError('Error loading inventory. Please refresh the page.');
    }
}
function renderInventoryTable(items, emptyMessage) {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) {
        return;
    }
    destroyInventoryTablePagination();
    if (!Array.isArray(items) || items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #9ca3af;">${emptyMessage}</td>
            </tr>
        `;
        return;
    }
    tableBody.innerHTML = '';
    items.forEach((item) => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #e5e7eb';
        const formattedPrice = Number(item.price).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });
        row.innerHTML = `
            <td style="padding: 12px; color: #374151;">${item.itemName}</td>
            <td style="padding: 12px; color: #6b7280;">${formatInventoryCode(item.inventoryCode)}</td>
            <td style="padding: 12px; color: #6b7280;">${formattedPrice}</td>
            <td style="padding: 12px; color: #6b7280;">${item.quantity}</td>
            <td style="padding: 12px; text-align: center;">
                <button class="btn btn-danger delete-item-btn" data-item-id="${item.itemId}" title="Delete item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="pointer-events:none;">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                </button>
            </td>
        `;
        row.querySelector('.delete-item-btn')?.addEventListener('click', () => deleteItem(item.itemId));
        tableBody.appendChild(row);
    });
    initializeInventoryTablePagination();
}
function renderInventoryTableError(message) {
    const tableBody = document.getElementById('inventory-table-body');
    if (!tableBody) {
        return;
    }
    destroyInventoryTablePagination();
    tableBody.innerHTML = `
        <tr>
            <td colspan="5" style="text-align: center; padding: 20px; color: #ef4444;">${message}</td>
        </tr>
    `;
}
function initializeInventoryTablePagination() {
    const jquery = window.$;
    const tableSelector = '#inventory-table';
    if (!jquery || !jquery.fn?.DataTable) {
        return;
    }
    if (jquery.fn.DataTable.isDataTable(tableSelector)) {
        jquery(tableSelector).DataTable().destroy();
    }
    inventoryDataTable = jquery(tableSelector).DataTable({
        pageLength: 25,
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
function destroyInventoryTablePagination() {
    const jquery = window.$;
    const tableSelector = '#inventory-table';
    if (!jquery || !jquery.fn?.DataTable) {
        return;
    }
    if (jquery.fn.DataTable.isDataTable(tableSelector)) {
        jquery(tableSelector).DataTable().destroy();
    }
    inventoryDataTable = null;
}
/* DELETE ITEM
* Removes an inventory item via the remove-item route
* PARAMS - itemId: number
* RETURNS - void
*/
async function deleteItem(itemId) {
    try {
        await apiAxios('/inventory/vendor/remove-item', {
            method: 'POST',
            body: { itemId }
        });
        showSuccessMessage('Item deleted successfully.');
        loadInventoryTable();
    }
    catch (error) {
        if (error.response?.data?.message) {
            showErrorMessage(error.response.data.message);
        }
        else {
            showErrorMessage('An error occurred while deleting the item.');
        }
    }
}
/* SEARCH ITEMS
* Handles searching for vendor's own inventory items based on the form fields
* PARAMS - criteria: object
* RETURNS - void
*/
async function searchItems(criteria) {
    const searchParams = new URLSearchParams();
    Object.entries(criteria).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
            searchParams.set(key, value.trim());
        }
    });
    showSearchQueryMessage(criteria);
    try {
        const response = await apiAxios(`/inventory/vendor/search?${searchParams.toString()}`, {
            method: 'GET'
        });
        renderInventoryTable(response.items, 'No matching inventory items found');
    }
    catch (error) {
        console.error('Error searching inventory:', error);
        const message = error.response?.data?.message || error.message || 'Error searching inventory. Please try again.';
        showErrorMessage(message);
        renderInventoryTableError('Error searching inventory. Please try again.');
    }
}
function showSearchQueryMessage(criteria) {
    const searchMessageDiv = document.getElementById('search-query-message');
    if (!searchMessageDiv) {
        return;
    }
    const itemNameValue = formatSearchValue(criteria.itemName);
    const inventoryCodeValue = formatSearchValue(criteria.inventoryCode);
    searchMessageDiv.textContent = `Showing results for query: Item Name = ${itemNameValue}, Inventory Code = ${inventoryCodeValue}`;
    searchMessageDiv.style.display = 'block';
}
function hideSearchQueryMessage() {
    const searchMessageDiv = document.getElementById('search-query-message');
    if (!searchMessageDiv) {
        return;
    }
    searchMessageDiv.style.display = 'none';
    searchMessageDiv.textContent = '';
}
function formatSearchValue(value) {
    if (!value || value.trim() === '') {
        return 'any';
    }
    return `"${value.trim()}"`;
}
function clearInventoryForm() {
    const form = document.getElementById('inventory-form');
    form?.reset();
}
function formatInventoryCode(value) {
    if (value === null || value === undefined) {
        return '';
    }
    const normalizedValue = String(value).trim();
    if (!normalizedValue || normalizedValue.toLowerCase() === 'null') {
        return '';
    }
    return normalizedValue;
}
//# sourceMappingURL=vendor-inventory.js.map