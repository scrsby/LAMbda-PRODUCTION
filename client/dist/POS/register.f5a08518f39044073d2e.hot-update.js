"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdatelambda"]("POS/register",{

/***/ "./client/src/ts/POS/register.ts"
/*!***************************************!*\
  !*** ./client/src/ts/POS/register.ts ***!
  \***************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utilities_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utilities/api.js */ \"./client/src/ts/utilities/api.ts\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n \n Name: Register POS Transaction\n File: register.ts\n Description: Handles all client-side logic for registering a POS transaction, including form handling and API communication.\n Last Edited: 29 May 2026\n*/\n\nlet ticket_items = [];\nlet unsynced_items = [];\n/// BUTTON HANDLERS\nconst createTicketBtn = document.getElementById('create-ticket-btn');\ncreateTicketBtn?.addEventListener('click', async () => {\n    const ticketId = await createTicket();\n    if (ticketId) {\n        // Store the ticket ID for later use when adding items\n        localStorage.setItem('currentTicketId', ticketId);\n        // Fill the ticket ID field with the current id and disable it to prevent changes\n        const ticketIdField = document.getElementById('ticket-id');\n        if (ticketIdField) {\n            ticketIdField.value = ticketId;\n            ticketIdField.disabled = true;\n            console.log('Ticket ID field updated with:', ticketId);\n        }\n        else {\n            console.warn('Ticket ID field not found in the DOM.');\n        }\n        alert(`Ticket created with ID: ${ticketId}`);\n    }\n});\n/*  CREATE TICKET\n*/\nasync function createTicket() {\n    try {\n        const response = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.apiAxios)('/POS/create-ticket', { method: 'POST' });\n        const { ticketId } = response;\n        console.log('Created ticket with ID:', ticketId);\n        return ticketId;\n    }\n    catch (error) {\n        console.error('Error creating ticket:', error);\n        alert('Failed to create ticket. Please try again.');\n    }\n}\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/POS/register.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("e4ae086fe50037e17bfc")
/******/ })();
/******/ 
/******/ }
);