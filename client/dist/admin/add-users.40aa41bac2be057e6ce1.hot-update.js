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

/***/ "./client/src/ts/utilities/api.ts"
/*!****************************************!*\
  !*** ./client/src/ts/utilities/api.ts ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   apiAxios: () => (/* binding */ apiAxios)\n/* harmony export */ });\n/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! axios */ \"./node_modules/axios/lib/axios.js\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n \n Name: API Send Utility\n File: api.ts\n Description: Handles interaction with the backend with Axios\n Last Edited: 26 January 2026\n*/\n\nconst SERVER_LOCATION = \"localhost:3000\";\nasync function apiAxios(endpoint, options = {}) {\n    const url = `http://${SERVER_LOCATION}${endpoint}`;\n    try {\n        const response = await (0,axios__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n            url,\n            data: options.body,\n            withCredentials: true,\n            headers: {\n                'Content-Type': 'application/json',\n                ...options.headers\n            },\n            ...options\n        });\n        // Axios automatically parses JSON, so we just return response.data\n        return response.data;\n    }\n    catch (err) {\n        // Axios throws automatically for non-2xx status codes\n        if (err.response) {\n            // Server responded with a status outside 2xx\n            console.error('API error:', err.response.data);\n            throw err; // Throw the original error to preserve the structure\n        }\n        else if (err.request) {\n            // Request was made but no response was received\n            console.error('Network error:', err.request);\n            throw new Error('Network error: No response from server');\n        }\n        else {\n            console.error('Config error:', err.message);\n            throw err;\n        }\n    }\n}\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/utilities/api.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("5635582e8bcc3acb7515")
/******/ })();
/******/ 
/******/ }
);