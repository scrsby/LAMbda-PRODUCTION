"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdatelambda"]("auth/create-account",{

/***/ "./client/src/ts/auth/create-account.ts"
/*!**********************************************!*\
  !*** ./client/src/ts/auth/create-account.ts ***!
  \**********************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utilities_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utilities/api.js */ \"./client/src/ts/utilities/api.ts\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n\n Name: Create Account\n File: create-account.ts\n Description: Handles user account creation with access token validation\n Last Edited: 9 February 2026\n*/\n\n// Check for token in URL on page load\ndocument.addEventListener('DOMContentLoaded', () => {\n    const urlParams = new URLSearchParams(window.location.search);\n    const token = urlParams.get('token');\n    if (token) {\n        // Pre-fill and disable the access token field if token is in URL\n        const accessTokenInput = document.getElementById('access-token');\n        if (accessTokenInput) {\n            accessTokenInput.value = token;\n            accessTokenInput.disabled = true;\n            accessTokenInput.style.backgroundColor = 'var(--bg-secondary)';\n            accessTokenInput.style.cursor = 'not-allowed';\n        }\n    }\n});\n// Form submission handler\nconst form = document.getElementById('create-account-form');\nform?.addEventListener('submit', function (event) {\n    event.preventDefault();\n    handleAccountCreation();\n});\n/* HANDLE ACCOUNT CREATION\n* Validates form fields and submits account creation request to backend\n*/\nasync function handleAccountCreation() {\n    const email = document.getElementById('email')?.value.trim();\n    const accessToken = document.getElementById('access-token')?.value.trim();\n    const username = document.getElementById('username')?.value.trim();\n    const password = document.getElementById('password')?.value;\n    const repeatPassword = document.getElementById('repeat-password')?.value;\n    const errorDiv = document.getElementById('error-message');\n    console.log('Form values:', { email, accessToken, username, password, repeatPassword });\n    // Validation checks\n    if (!email || !accessToken || !username || !password || !repeatPassword) {\n        showError('Please fill in all fields');\n        return;\n    }\n    if (!isValidEmail(email)) {\n        showError('Please enter a valid email address');\n        return;\n    }\n    if (username.length < 8) {\n        showError('Username must be at least 8 characters long');\n        return;\n    }\n    if (password.length < 8) {\n        showError('Password must be at least 8 characters long');\n        return;\n    }\n    if (password !== repeatPassword) {\n        showError('Passwords do not match');\n        return;\n    }\n    // Submit to backend\n    try {\n        const response = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.apiAxios)('/auth/createAccount', {\n            method: 'POST',\n            body: {\n                email,\n                accessToken,\n                username,\n                password\n            }\n        });\n        if (response.success) {\n            // Redirect to login page or dashboard\n            alert('Account created successfully! Redirecting to login...');\n            window.location.href = 'login.html';\n        }\n    }\n    catch (error) {\n        console.error('Account creation error:', error);\n        if (error.response?.data?.message) {\n            showError(error.response.data.message);\n        }\n        else if (error.message) {\n            showError(error.message);\n        }\n        else {\n            showError('An error occurred while creating your account. Please try again.');\n        }\n    }\n}\n/* VALIDATION HELPERS */\nfunction isValidEmail(email) {\n    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;\n    return emailRegex.test(email);\n}\nfunction showError(message) {\n    const errorDiv = document.getElementById('error-message');\n    if (errorDiv) {\n        errorDiv.textContent = message;\n        errorDiv.style.display = 'block';\n        // Scroll to error message\n        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });\n    }\n}\n\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/auth/create-account.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("8a4a40df25b54800c219")
/******/ })();
/******/ 
/******/ }
);