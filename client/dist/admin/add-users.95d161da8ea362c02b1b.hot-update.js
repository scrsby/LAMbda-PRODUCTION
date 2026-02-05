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

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utilities_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utilities/api.js */ \"./client/src/ts/utilities/api.ts\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n \n Name: Add Users\n File: add-users.ts\n Description: Handles user creation and the initial access code email\n Last Edited: 28 January 2026\n*/\n\nconst form = document.getElementById('add-user-form');\nform?.addEventListener('submit', function (event) {\n    event.preventDefault();\n    formSumbit();\n});\nfunction formSumbit() {\n    const email = document.getElementById('email-field')?.value;\n    console.log(\"Submitted email: \", email);\n    (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.apiAxios)('/admin/createNewUser', {\n        method: 'POST',\n        body: { email }\n    })\n        .then((response) => {\n        // Handle successful response\n        console.log('User created successfully:', response);\n    })\n        .catch((error) => {\n        // Handle error\n        console.error('Error creating user:', error);\n    });\n}\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/admin/add-users.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("f4e8cec364c55618b0a3")
/******/ })();
/******/ 
/******/ }
);