"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdatelambda"]("admin/admin-inventory-settings",{

/***/ "./client/src/ts/admin/admin-inventory-settings.ts"
/*!*********************************************************!*\
  !*** ./client/src/ts/admin/admin-inventory-settings.ts ***!
  \*********************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utilities_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utilities/api.js */ \"./client/src/ts/utilities/api.ts\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n\n Name: Admin Inventory Settings\n File: admin-inventory-settings.ts\n Description: Manages user creation and displays all users with access tokens\n Last Edited: 27 May 2026\n*/\n\n// Check authentication on page load\ndocument.addEventListener('DOMContentLoaded', async () => {\n    const user = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.requireAuth)();\n    if (!user)\n        return; // Will redirect to login\n    // Only allow admin users\n    if (user.userType !== 'admin') {\n        window.location.href = '/auth/login.html';\n        return;\n    }\n});\n// Add Item button handler\nconst addItemBtn = document.getElementById('add-item-btn');\naddItemBtn?.addEventListener('click', async () => {\n    console.log(\"Add Item button clicked\");\n    const itemName = document.getElementById('item-name')?.value;\n    const vendorId = document.getElementById('vendor-id')?.value;\n    const inventoryNumber = document.getElementById('inventory-number')?.value;\n    const itemPrice = parseFloat(document.getElementById('item-price')?.value);\n    const qty = parseInt(document.getElementById('item-quantity')?.value, 10);\n    const itemQuantity = !qty || qty <= 0 ? 1 : qty; // Default to 1 if invalid quantity\n    console.log(\"Form values - Name: \", itemName, \" Vendor ID: \", vendorId, \" Inventory Number: \", inventoryNumber, \" Price: \", itemPrice, \" Quantity: \", itemQuantity);\n    if (!itemPrice || itemPrice <= 0 || !itemName || !vendorId) {\n        alert(\"Please fill in all required fields with valid values.\");\n        return;\n    }\n    // Call the addItem route with the form data\n    const response = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.apiAxios)('/inventory/add', {\n        method: 'POST',\n        body: {\n            itemName: itemName,\n            vendorId: vendorId,\n            inventoryNumber: inventoryNumber,\n            itemPrice: itemPrice,\n            itemQuantity: itemQuantity\n        }\n    });\n    console.log(\"Add Item Response: \", response);\n});\n// Logout button handler\nconst logoutBtn = document.getElementById('logout-btn');\nlogoutBtn?.addEventListener('click', async () => {\n    const success = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.logout)();\n    if (success) {\n        window.location.href = '/auth/login.html';\n    }\n});\n/* ADD ITEM\n* Handles form submission for creating new inventory items with an admin account\n* PARAMS - name: string, description: string, price: number, quantity: number\n* RETURNS - void\n*/\nasync function addItem(name, description, price, quantity) {\n}\n;\n/* SEARCH ITEMS\n* Handles searching for inventory items based on a query string\n* PARAMS - query: string\n* RETURNS - returned_items: items[]\n*/\nasync function searchItems(query) {\n}\n;\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/admin/admin-inventory-settings.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("cdc3d444b250f5e53f02")
/******/ })();
/******/ 
/******/ }
);