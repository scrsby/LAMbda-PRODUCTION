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

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utilities_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utilities/api.js */ \"./client/src/ts/utilities/api.ts\");\n/* harmony import */ var _utilities_form_validation_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ../utilities/form-validation.js */ \"./client/src/ts/utilities/form-validation.ts\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n\n Name: Login\n File: login.ts\n Description: Handles user login and redirects to appropriate page\n Last Edited: 21 February 2026\n*/\n\n\n// Check if already logged in on page load\ndocument.addEventListener('DOMContentLoaded', async () => {\n    const user = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.getCurrentUser)();\n    if (user) {\n        // Already logged in, redirect to appropriate page\n        redirectUser(user.userType);\n    }\n});\n// Form submission handler\nconst form = document.getElementById('login-form');\nconsole.log(form);\nform?.addEventListener('submit', function (event) {\n    console.log(\"Login started\");\n    event.preventDefault();\n    credentialAuthorization();\n});\n/* CREDENTIAL AUTHORIZATION\n* Validates credentials and then calls the /auth/login/ route to authenticate user\n* Returns the user's user type for redirect.\n* PARAMS -\n* RETURNS - user_type: string\n*/\nasync function credentialAuthorization() {\n    const email = document.getElementById('email')?.value.trim();\n    const password = document.getElementById('password')?.value.trim();\n    console.log('Form values:', { email, password });\n    // Validation checks\n    if (!email || !password) {\n        // showError('Please fill in all fields');\n        console.log('Field missing');\n        return;\n    }\n    if (!(0,_utilities_form_validation_js__WEBPACK_IMPORTED_MODULE_1__.isValidEmail)(email)) {\n        // showError('Please enter a valid email address');\n        console.log('Field missing');\n        return;\n    }\n    console.log();\n    try {\n        const response = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.apiAxios)('/auth/login', {\n            method: 'POST',\n            body: {\n                email,\n                password\n            }\n        });\n        if (response.success) {\n            // Redirect to login page or dashboard\n            alert('Login successful! Redirecting to dashboard...');\n            redirectUser(response.user.user_type);\n        }\n        console.log(response);\n    }\n    catch (error) {\n        console.error('Login error:', error);\n        if (error.response?.data?.message) {\n            // showError(error.response.data.message);\n        }\n        else if (error.message) {\n            // showError(error.message);\n        }\n        else {\n            // showError('An error occurred while creating your account. Please try again.');\n        }\n    }\n}\nfunction redirectUser(userType) {\n    switch (userType) {\n        case 'admin':\n            window.location.href = '../admin/admin-index.html';\n            break;\n        case 'user':\n            window.location.href = 'user-dashboard.html';\n            break;\n        default:\n            console.error('Unknown user type:', userType);\n        // Optionally show an error message to the user\n    }\n}\n;\n// Login functionality - TODO: implement\n\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/auth/login.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("5804c8fc0bfe69681051")
/******/ })();
/******/ 
/******/ }
);