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

eval("{__webpack_require__.r(__webpack_exports__);\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n \n Name: Create Account\n File: create-account.ts\n Description: Handles user creation and the initial access code email\n Last Edited: 4 February 2026\n*/\n// Create account functionality\nconst urlParams = new URLSearchParams(window.location.search);\n// Pull the specific 'token' value from URL\nconst myToken = urlParams.get('token');\n// Set the access token if found in URL\nif (myToken) {\n    const accessTokenInput = document.getElementById('access-token');\n    if (accessTokenInput) {\n        accessTokenInput.value = myToken;\n    }\n}\n// Add event listeners for form steps\ndocument.addEventListener('DOMContentLoaded', () => {\n    const accessNextBtn = document.getElementById('access-next');\n    const credentialsNextBtn = document.getElementById('credentials-next');\n    const detailsFinishBtn = document.getElementById('details-finish');\n    if (accessNextBtn) {\n        accessNextBtn.addEventListener('click', handleAccessCodeStep);\n    }\n    if (credentialsNextBtn) {\n        credentialsNextBtn.addEventListener('click', handleCredentialsStep);\n    }\n    if (detailsFinishBtn) {\n        detailsFinishBtn.addEventListener('click', handleAccountCreation);\n    }\n});\nfunction handleAccessCodeStep() {\n    const accessToken = document.getElementById('access-token')?.value;\n    const email = document.getElementById('email')?.value;\n    const errorDiv = document.getElementById('error-message-access');\n    if (!accessToken || !email) {\n        if (errorDiv)\n            errorDiv.textContent = 'Please fill in all fields';\n        return;\n    }\n    // TODO: Validate access token with backend\n    console.log('Access code step completed');\n}\nfunction handleCredentialsStep() {\n    const username = document.getElementById('username')?.value;\n    const password = document.getElementById('password')?.value;\n    const repeatPassword = document.getElementById('repeat-password')?.value;\n    const errorDiv = document.getElementById('error-message-credentials');\n    if (!username || !password || !repeatPassword) {\n        if (errorDiv)\n            errorDiv.textContent = 'Please fill in all fields';\n        return;\n    }\n    if (password !== repeatPassword) {\n        if (errorDiv)\n            errorDiv.textContent = 'Passwords do not match';\n        return;\n    }\n    if (username.length < 8) {\n        if (errorDiv)\n            errorDiv.textContent = 'Username must be at least 8 characters';\n        return;\n    }\n    // TODO: Add password validation\n    console.log('Credentials step completed');\n}\nfunction handleAccountCreation() {\n    const firstName = document.getElementById('first-name')?.value;\n    const lastName = document.getElementById('last-name')?.value;\n    const phone = document.getElementById('phone')?.value;\n    const errorDiv = document.getElementById('error-message-details');\n    if (!firstName || !lastName || !phone) {\n        if (errorDiv)\n            errorDiv.textContent = 'Please fill in all fields';\n        return;\n    }\n    // TODO: Submit account creation to backend\n    console.log('Account creation completed');\n}\n\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/auth/create-account.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("99243394e04871c1d6b9")
/******/ })();
/******/ 
/******/ }
);