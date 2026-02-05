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

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utilities_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utilities/api.js */ \"./client/src/ts/utilities/api.ts\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n \n Name: Add Users\n File: add-users.ts\n Description: Handles user creation and the initial access code email\n Last Edited: 4 February 2026\n*/\n\nconst form = document.getElementById('add-user-form');\nform?.addEventListener('submit', function (event) {\n    event.preventDefault();\n    formSumbit();\n});\nfunction formSumbit() {\n    const email = document.getElementById('email-field')?.value;\n    console.log(\"Submitted email: \", email);\n    createUser(email);\n}\n/* CREATE USER SEQUENCE\n* Params: email\n*\n*\n*\n*\n*/\nasync function createUser(email) {\n    (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.apiAxios)('/admin/createNewUser', {\n        method: 'POST',\n        body: { email }\n    })\n        // Success case\n        .then((response) => {\n        showSuccessMessage(`User created successfully! Access token: ${response.data.access_token}`);\n    })\n        // Handle different error cases\n        .catch((error) => {\n        if (error.response?.status === 400) {\n            showErrorMessage(error.response.data.message);\n        }\n        else {\n            showErrorMessage('An error occurred while creating the user');\n        }\n    });\n}\n/* MESSAGE DISPLAY FUNCTIONS\n* Params: Error message\n*\n*\n*/\nfunction showErrorMessage(message) {\n    const errorDiv = document.getElementById('error-message');\n    const successDiv = document.getElementById('success-message');\n    if (errorDiv) {\n        errorDiv.textContent = message;\n        errorDiv.style.display = 'block';\n    }\n    if (successDiv) {\n        successDiv.style.display = 'none';\n    }\n}\nfunction showSuccessMessage(message) {\n    const errorDiv = document.getElementById('error-message');\n    const successDiv = document.getElementById('success-message');\n    if (errorDiv) {\n        errorDiv.style.display = 'none';\n    }\n    if (successDiv) {\n        successDiv.textContent = message;\n        successDiv.style.display = 'block';\n    }\n}\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/admin/add-users.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("fafd42695471e6d7bc32")
/******/ })();
/******/ 
/******/ }
);