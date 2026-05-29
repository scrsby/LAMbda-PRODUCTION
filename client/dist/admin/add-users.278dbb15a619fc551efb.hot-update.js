"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdatelambda"]("admin/add-users",{

/***/ "./client/src/ts/admin/add-users.ts"
/*!******************************************!*\
  !*** ./client/src/ts/admin/add-users.ts ***!
  \******************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utilities_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utilities/api.js */ \"./client/src/ts/utilities/api.ts\");\nObject(function webpackMissingModule() { var e = new Error(\"Cannot find module '../utilities/messages.js'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }());\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n \n Name: Add Users\n File: add-users.ts\n Description: Handles user creation and the initial access code email\n Last Edited: 4 February 2026\n*/\n\n\n// Check authentication on page load\ndocument.addEventListener('DOMContentLoaded', async () => {\n    const user = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.requireAuth)();\n    if (!user)\n        return; // Will redirect to login\n    // Only allow admin users\n    if (user.userType !== 'admin') {\n        window.location.href = '/auth/login.html';\n        return;\n    }\n});\nconst form = document.getElementById('add-user-form');\nform?.addEventListener('submit', function (event) {\n    event.preventDefault();\n    formSumbit();\n});\n// Logout button handler\nconst logoutBtn = document.getElementById('logout-btn');\nlogoutBtn?.addEventListener('click', async () => {\n    const success = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.logout)();\n    if (success) {\n        window.location.href = '/auth/login.html';\n    }\n});\nfunction formSumbit() {\n    const email = document.getElementById('email-field')?.value;\n    const role = document.getElementById('role')?.value;\n    const vendorId = document.getElementById('vendorId')?.value;\n    console.log(\"Form values:\", { email, role, vendorId });\n    if (!email || !role) {\n        Object(function webpackMissingModule() { var e = new Error(\"Cannot find module '../utilities/messages.js'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())('Email and Role are required');\n        return;\n    }\n    createUser(email, role, vendorId);\n}\n/* CREATE USER SEQUENCE\n* Params: email\n*\n*\n*\n*\n*/\nasync function createUser(email, role, vendorId) {\n    try {\n        const baseUrl = window.location.origin;\n        const response = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.apiAxios)('/admin/createNewUser', {\n            method: 'POST',\n            body: {\n                email,\n                user_type: role,\n                vendor_id: vendorId,\n                baseUrl: baseUrl\n            }\n        });\n        // Success case - response is already the data, not response.data\n        Object(function webpackMissingModule() { var e = new Error(\"Cannot find module '../utilities/messages.js'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(`User created successfully! Access token: ${response.access_token}`);\n    }\n    catch (error) {\n        console.log('Full error object:', error); // Debug log\n        // Handle different error cases\n        if (error.response?.status === 400) {\n            Object(function webpackMissingModule() { var e = new Error(\"Cannot find module '../utilities/messages.js'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(error.response.data.message);\n        }\n        else if (error.response?.data?.message) {\n            Object(function webpackMissingModule() { var e = new Error(\"Cannot find module '../utilities/messages.js'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(error.response.data.message);\n        }\n        else if (error.message) {\n            Object(function webpackMissingModule() { var e = new Error(\"Cannot find module '../utilities/messages.js'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())(error.message);\n        }\n        else {\n            Object(function webpackMissingModule() { var e = new Error(\"Cannot find module '../utilities/messages.js'\"); e.code = 'MODULE_NOT_FOUND'; throw e; }())('An error occurred while creating the user');\n        }\n    }\n}\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/admin/add-users.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("f57e55854855bb2af7fe")
/******/ })();
/******/ 
/******/ }
);