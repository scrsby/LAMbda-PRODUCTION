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

/***/ "./client/src/ts/utilities/api.ts"
/*!****************************************!*\
  !*** ./client/src/ts/utilities/api.ts ***!
  \****************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony export */ __webpack_require__.d(__webpack_exports__, {\n/* harmony export */   apiAxios: () => (/* binding */ apiAxios),\n/* harmony export */   getCurrentUser: () => (/* binding */ getCurrentUser),\n/* harmony export */   isAuthenticated: () => (/* binding */ isAuthenticated),\n/* harmony export */   logout: () => (/* binding */ logout),\n/* harmony export */   requireAuth: () => (/* binding */ requireAuth)\n/* harmony export */ });\n/* harmony import */ var axios__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! axios */ \"./node_modules/axios/lib/axios.js\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n \n Name: API Send Utility\n File: api.ts\n Description: Handles interaction with the backend with Axios, including session management\n Last Edited: 24 February 2026\n*/\n\nconst SERVER_LOCATION = \"localhost:3000\";\nasync function apiAxios(endpoint, options = {}) {\n    const url = `http://${SERVER_LOCATION}${endpoint}`;\n    try {\n        const response = await (0,axios__WEBPACK_IMPORTED_MODULE_0__[\"default\"])({\n            url,\n            data: options.body,\n            withCredentials: true, // Required for session cookies\n            headers: {\n                'Content-Type': 'application/json',\n                ...options.headers\n            },\n            ...options\n        });\n        // Axios automatically parses JSON, so we just return response.data\n        return response.data;\n    }\n    catch (err) {\n        // Axios throws automatically for non-2xx status codes\n        if (err.response) {\n            // Server responded with a status outside 2xx\n            console.error('API error:', err.response.data);\n            throw err; // Throw the original error to preserve the structure\n        }\n        else if (err.request) {\n            // Request was made but no response was received\n            console.error('Network error:', err.request);\n            throw new Error('Network error: No response from server');\n        }\n        else {\n            console.error('Config error:', err.message);\n            throw err;\n        }\n    }\n}\n/* LOGOUT\n* Ends the user's session on the server and clears the session cookie\n* Returns: Promise<boolean> - true if logout was successful\n*/\nasync function logout() {\n    try {\n        const response = await apiAxios('/auth/logout', {\n            method: 'POST'\n        });\n        return response.success === true;\n    }\n    catch (error) {\n        console.error('Logout error:', error);\n        return false;\n    }\n}\n/* GET CURRENT USER\n* Retrieves the currently logged in user's session data\n* Returns: Promise<SessionUser | null> - user data if authenticated, null otherwise\n*/\nasync function getCurrentUser() {\n    try {\n        const response = await apiAxios('/auth/me', {\n            method: 'GET'\n        });\n        if (response.success && response.user) {\n            return response.user;\n        }\n        return null;\n    }\n    catch (error) {\n        // User is not authenticated\n        return null;\n    }\n}\n/* IS AUTHENTICATED\n* Quick check if user has an active session\n* Returns: Promise<boolean> - true if user is logged in\n*/\nasync function isAuthenticated() {\n    const user = await getCurrentUser();\n    return user !== null;\n}\n/* REQUIRE AUTH\n* Checks if user is authenticated, redirects to login if not\n* @param redirectUrl - URL to redirect to if not authenticated (default: login page)\n* Returns: Promise<SessionUser | null> - user data if authenticated\n*/\nasync function requireAuth(redirectUrl = '/auth/login.html') {\n    const user = await getCurrentUser();\n    if (!user) {\n        window.location.href = redirectUrl;\n        return null;\n    }\n    return user;\n}\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/utilities/api.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("8c9ca5998937d0305018")
/******/ })();
/******/ 
/******/ }
);