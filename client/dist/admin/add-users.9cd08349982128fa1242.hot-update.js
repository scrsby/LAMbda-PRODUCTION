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

/***/ "./client/src/ts/utilities/messages.js"
/*!*********************************************!*\
  !*** ./client/src/ts/utilities/messages.js ***!
  \*********************************************/
(__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   showErrorMessage: () => (/* binding */ showErrorMessage),\n/* harmony export */   showSuccessMessage: () => (/* binding */ showSuccessMessage)\n/* harmony export */ });\n/*\r\n  _               __  __ _         _       \r\n | |        /\\   |  \\/  | |       | |      \r\n | |       /  \\  | \\  / | |__   __| | __ _ \r\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\r\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\r\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\r\n \r\n Name: Error Message Utilities\r\n File: messages.js\r\n Description: Hides and shows errors on various pages\r\n Last Edited: 29 May 2026\r\n*/\r\n\r\nfunction showErrorMessage(message, errorId = 'error-message', successId = 'success-message') {\r\n    const errorDiv = document.getElementById(errorId);\r\n    const successDiv = document.getElementById(successId);\r\n\r\n    if (errorDiv) {\r\n        errorDiv.textContent = message;\r\n        errorDiv.style.display = 'block';\r\n    }\r\n\r\n    if (successDiv) {\r\n        successDiv.style.display = 'none';\r\n    }\r\n}\r\n\r\nfunction showSuccessMessage(message, errorId = 'error-message', successId = 'success-message') {\r\n    const errorDiv = document.getElementById(errorId);\r\n    const successDiv = document.getElementById(successId);\r\n\r\n    if (errorDiv) {\r\n        errorDiv.style.display = 'none';\r\n    }\r\n\r\n    if (successDiv) {\r\n        successDiv.textContent = message;\r\n        successDiv.style.display = 'block';\r\n    }\r\n}\n\n//# sourceURL=webpack://lambda/./client/src/ts/utilities/messages.js?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("f87f2e69cfe77087ef3a")
/******/ })();
/******/ 
/******/ }
);