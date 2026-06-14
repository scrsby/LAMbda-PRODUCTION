"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdatelambda"]("admin/admin-index",{

/***/ "./client/src/ts/admin/admin-index.ts"
/*!********************************************!*\
  !*** ./client/src/ts/admin/admin-index.ts ***!
  \********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utilities_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utilities/api.js */ \"./client/src/ts/utilities/api.ts\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n\n Name: Admin Dashboard\n File: admin-index.ts\n Description: Handles admin dashboard initialization and user display\n Last Edited: 24 February 2026\n*/\n\n// Initialize dashboard on page load\ndocument.addEventListener('DOMContentLoaded', async () => {\n    await initializeDashboard();\n    // Logout button handlers\n    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {\n        e.preventDefault();\n        await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.logout)();\n        window.location.href = '../auth/login.html';\n    });\n    document.getElementById('logout-btn-mobile')?.addEventListener('click', async (e) => {\n        e.preventDefault();\n        await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.logout)();\n        window.location.href = '../auth/login.html';\n    });\n});\n/* INITIALIZE DASHBOARD\n* Fetches user data and updates the UI with user information\n* PARAMS - none\n* RETURNS - void\n*/\nasync function initializeDashboard() {\n    const user = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.getCurrentUser)();\n    if (!user) {\n        // Not logged in, redirect to login\n        window.location.href = '../auth/login.html';\n        return;\n    }\n    // Update the UI with the user's name\n    displayUserName(user);\n}\n/* DISPLAY USER NAME\n* Updates all UI elements that display the user's name\n* PARAMS - user: SessionUser\n* RETURNS - void\n*/\nfunction displayUserName(user) {\n    // Build display name from avfailable fields\n    const displayName = getDisplayName(user);\n    // Update greeting\n    const greetingEl = document.getElementById('greeting');\n    if (greetingEl) {\n        const timeGreeting = getTimeBasedGreeting();\n        greetingEl.textContent = `${timeGreeting}, ${displayName}`;\n    }\n    // Update user menu name\n    const userNameEl = document.querySelector('.user-name');\n    if (userNameEl) {\n        userNameEl.textContent = displayName;\n    }\n    // Update user avatar with first initial\n    const userAvatarEl = document.querySelector('.user-avatar');\n    if (userAvatarEl) {\n        userAvatarEl.textContent = displayName.charAt(0).toUpperCase();\n    }\n}\n/* GET DISPLAY NAME\n* Returns the best available name to display for the user\n* Priority: First Name > Email username\n* PARAMS - user: SessionUser\n* RETURNS - string\n*/\nfunction getDisplayName(user) {\n    // Use first name if available\n    if (user.firstName && user.firstName.trim() !== '') {\n        return user.firstName;\n    }\n    else {\n        return '';\n    }\n    // removed by dead control flow\n\n}\n/* GET TIME BASED GREETING\n* Returns an appropriate greeting based on the current time\n* PARAMS - none\n* RETURNS - string\n*/\nfunction getTimeBasedGreeting() {\n    const hour = new Date().getHours();\n    if (hour < 12) {\n        return 'Good morning';\n    }\n    else if (hour < 17) {\n        return 'Good afternoon';\n    }\n    else {\n        return 'Good evening';\n    }\n}\n\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/admin/admin-index.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("9077536c13ee03a7f329")
/******/ })();
/******/ 
/******/ }
);