"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdatelambda"]("auth/login",{

/***/ "./client/src/ts/auth/login.ts"
/*!*************************************!*\
  !*** ./client/src/ts/auth/login.ts ***!
  \*************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utilities_form_validation_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utilities/form-validation.js */ \"./client/src/ts/utilities/form-validation.ts\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n\n Name: Login\n File: login.ts\n Description: Handles user login and redirects to appropriate page\n Last Edited: 21 February 2026\n*/\n\n// Login functionality - TODO: implement\n\n// Form submission handler\nconst form = document.getElementById('create-account-form');\nform?.addEventListener('submit', function (event) {\n    event.preventDefault();\n    credentialAuthorization();\n});\nfunction credentialAuthorization() {\n    const email = document.getElementById('email')?.value.trim();\n    const password = document.getElementById('password')?.value.trim();\n    console.log('Form values:', { email, password });\n    // Validation checks\n    if (!email || !password) {\n        // showError('Please fill in all fields');\n        return;\n    }\n    if (!(0,_utilities_form_validation_js__WEBPACK_IMPORTED_MODULE_0__.isValidEmail)(email)) {\n        // showError('Please enter a valid email address');\n        return;\n    }\n}\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/auth/login.ts?\n}");

/***/ },

/***/ "./client/src/ts/utilities/form-validation.ts"
/*!****************************************************!*\
  !*** ./client/src/ts/utilities/form-validation.ts ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   isValidEmail: () => (/* binding */ isValidEmail),\n/* harmony export */   isValidPassword: () => (/* binding */ isValidPassword),\n/* harmony export */   isValidUsername: () => (/* binding */ isValidUsername),\n/* harmony export */   isValidVendorId: () => (/* binding */ isValidVendorId)\n/* harmony export */ });\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n \n Name: Field validations\n File: form-validation.js\n Required by:\n Description: This file contains functions for validating user input in forms, such as email and password formats.\n Functions:\n Last Edited: 21 July 2024\n*/\n// Password validation\nfunction isValidPassword(password) {\n    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\\d!@#$%^&*]).{8,}$/;\n    return regex.test(password);\n}\n// Booth number validation (1-3 digits)\nfunction isValidVendorId(booth) {\n    return /^\\d{1,3}$/.test(booth.toString());\n}\n// Username validation (alphanumeric, 3-20 characters)\nfunction isValidUsername(username) {\n    // Username must be alphanumeric and 3-20 characters long\n    const regex = /^[a-zA-Z0-9]{3,20}$/;\n    return regex.test(username);\n}\n// Validate email form (must include @ and . address)\nfunction isValidEmail(email) {\n    // Basic email validation regex\n    const regex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n    return regex.test(email);\n}\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/utilities/form-validation.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("aedf12c262d16d37c49d")
/******/ })();
/******/ 
/******/ }
);