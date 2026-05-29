/*
  _               __  __ _         _
 | |        /\   |  \/  | |       | |
 | |       /  \  | \  / | |__   __| | __ _
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|

 Name: Admin Inventory Settings
 File: admin-inventory-settings.ts
 Description: Manages user creation and displays all users with access tokens
 Last Edited: 27 May 2026
*/

import { apiAxios, requireAuth, logout } from '../utilities/api.js';
import { showErrorMessage, showSuccessMessage } from '../utilities/messages.js';

declare global {
    interface Window {
        $?: any;
        jQuery?: any;
    }
}

interface InventoryItem {
    itemId: number;
    itemName: string;
    vendorId: number;
    inventoryNumber: string | number;
    price: number;
    quantity: number;
}

let inventoryDataTable: any = null;

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    if (!user) return; // Will redirect to login
    
    // Only allow admin users
    if (user.userType !== 'admin') {
        window.location.href = '/auth/login.html';
        return;
    }

    hideSearchQueryMessage();
    loadInventoryTable();
});

// Item form handler
const inventoryForm = document.getElementById('inventory-form');
inventoryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    const submitter = (event as SubmitEvent).submitter as HTMLButtonElement | null;
    if (!submitter) {
        return;
    }

    const itemName = (document.getElementById('item-name') as HTMLInputElement)?.value.trim();
    const vendorIdValue = (document.getElementById('vendor-id') as HTMLInputElement)?.value.trim();
    const inventoryNumberValue = (document.getElementById('vendor-inventory-number') as HTMLInputElement)?.value.trim();
    const itemPriceValue = (document.getElementById('item-price') as HTMLInputElement)?.value.trim();
    const quantityValue = (document.getElementById('item-quantity') as HTMLInputElement)?.value.trim();

    const vendorId = parseInt(vendorIdValue, 10);
    const inventoryNumber = parseInt(inventoryNumberValue, 10);
    const itemPrice = parseFloat(itemPriceValue);
    const qty = parseInt(quantityValue, 10);
    const quantity = !qty || qty <= 0 ? 1 : qty; // Default to 1 if invalid quantity

    if (submitter.id === 'search-item-btn') {
        console.log('Search Item button clicked');
        await searchItems({
            itemName,
            vendorId: vendorIdValue,
            inventoryNumber: inventoryNumberValue,
            price: itemPriceValue,
            quantity: quantityValue
        });
        return;
    } else if (submitter.id === 'add-item-btn') {
        console.log("Add Item button clicked");
         if (!itemPrice || itemPrice <= 0 || !itemName || !vendorId ) {
            alert("Please fill in all required fields with valid values.");
            return;
        }
        try {
            await addItem(itemName, vendorId, inventoryNumber, itemPrice, quantity);
            showSuccessMessage('Item added successfully!');
            hideSearchQueryMessage();
            loadInventoryTable();
        } catch (error: any) {
            if (error.response?.data?.message) {
                showErrorMessage(error.response.data.message);
            } else if (error.message) {
                showErrorMessage(error.message);
            } else {
                showErrorMessage('An error occurred while adding the item');
            }
        }
    } else {
        return;
    }
});

// Logout button handler
const logoutBtn = document.getElementById('logout-btn');
logoutBtn?.addEventListener('click', async () => {
    const success = await logout();
    if (success) {
        window.location.href = '/auth/login.html';
    }
});


/* ADD ITEM
* Handles form submission for creating new inventory items with an admin account
* PARAMS - name: string, description: string, price: number, quantity: number
* RETURNS - void
*/
async function addItem(itemName: string, vendorId: number, inventoryNumber: number, price: number, quantity: number): Promise<void> {

    // Call the addItem route with the form data
    const response = await apiAxios('/inventory/add', {
            method: 'POST',
            body: {
                itemName: itemName,
                vendorId: vendorId,
                inventoryNumber: inventoryNumber,
                price: price,
                quantity: quantity
            }
        });
    
    console.log("Add Item Response: ", response);
};

async function loadInventoryTable(): Promise<void> {
    try {
        const response = await apiAxios('/inventory/all', {
            method: 'GET'
        });

        renderInventoryTable(response.items, 'No inventory items found');
    } catch (error) {
        console.error('Error loading inventory table:', error);
        renderInventoryTableError('Error loading inventory. Please refresh the page.');
    }
}

function renderInventoryTable(items: InventoryItem[], emptyMessage: string): void {
    const tableBody = document.getElementById('inventory-table-body');

    if (!tableBody) {
        return;
    }

    destroyInventoryTablePagination();

    if (!Array.isArray(items) || items.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 20px; color: #9ca3af;">${emptyMessage}</td>
            </tr>
        `;
        return;
    }

    tableBody.innerHTML = '';

    items.forEach((item: InventoryItem) => {
        const row = document.createElement('tr');
        row.style.borderBottom = '1px solid #e5e7eb';

        const formattedPrice = Number(item.price).toLocaleString('en-US', {
            style: 'currency',
            currency: 'USD'
        });

        row.innerHTML = `
            <td style="padding: 12px; color: #374151;">${item.itemName}</td>
            <td style="padding: 12px; color: #6b7280;">${item.vendorId}</td>
            <td style="padding: 12px; color: #6b7280;">${item.inventoryNumber}</td>
            <td style="padding: 12px; color: #6b7280;">${formattedPrice}</td>
            <td style="padding: 12px; color: #6b7280;">${item.quantity}</td>
            <td style="padding: 12px; text-align: center; color: #9ca3af;">Edit/Delete coming soon</td>
        `;

        tableBody.appendChild(row);
    });

    initializeInventoryTablePagination();
}

function renderInventoryTableError(message: string): void {
    const tableBody = document.getElementById('inventory-table-body');

    if (!tableBody) {
        return;
    }

    destroyInventoryTablePagination();

    tableBody.innerHTML = `
        <tr>
            <td colspan="6" style="text-align: center; padding: 20px; color: #ef4444;">${message}</td>
        </tr>
    `;
}

function initializeInventoryTablePagination(): void {
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

function destroyInventoryTablePagination(): void {
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

/* SEARCH ITEMS
* Handles searching for inventory items based on the form fields
* PARAMS - criteria: object
* RETURNS - returned_items: items[]
*/
async function searchItems(criteria: { itemName?: string; vendorId?: string; inventoryNumber?: string; price?: string; quantity?: string }): Promise<void> {
    console.log('Search criteria:', criteria);

    const searchParams = new URLSearchParams();

    Object.entries(criteria).forEach(([key, value]) => {
        if (value && value.trim() !== '') {
            searchParams.set(key, value.trim());
        }
    });

    showSearchQueryMessage(criteria);

    if (searchParams.size === 0) {
        await loadInventoryTable();
        return;
    }

    try {
        const response = await apiAxios(`/inventory/search?${searchParams.toString()}`, {
            method: 'GET'
        });

        renderInventoryTable(response.items, 'No matching inventory items found');
    } catch (error: any) {
        console.error('Error searching inventory:', error);
        const message = error.response?.data?.message || error.message || 'Error searching inventory. Please try again.';
        showErrorMessage(message);
        renderInventoryTableError('Error searching inventory. Please try again.');
    }
};

function showSearchQueryMessage(criteria: { itemName?: string; vendorId?: string; inventoryNumber?: string }): void {
    const searchMessageDiv = document.getElementById('search-query-message');

    if (!searchMessageDiv) {
        return;
    }

    const itemNameValue = formatSearchValue(criteria.itemName);
    const vendorIdValue = formatSearchValue(criteria.vendorId);
    const inventoryNumberValue = formatSearchValue(criteria.inventoryNumber);

    searchMessageDiv.textContent = `Showing results for query: Item Name = ${itemNameValue}, Vendor Id = ${vendorIdValue}, Inventory Number = ${inventoryNumberValue}`;
    searchMessageDiv.style.display = 'block';
}

function hideSearchQueryMessage(): void {
    const searchMessageDiv = document.getElementById('search-query-message');

    if (!searchMessageDiv) {
        return;
    }

    searchMessageDiv.style.display = 'none';
    searchMessageDiv.textContent = '';
}

function formatSearchValue(value?: string): string {
    if (!value || value.trim() === '') {
        return 'any';
    }

    return `"${value.trim()}"`;
}


