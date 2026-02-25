"use strict";
/*
 * ATTENTION: The "eval" devtool has been used (maybe by default in mode: "development").
 * This devtool is neither made for production nor for readable output files.
 * It uses "eval()" calls to create a separate source file in the browser devtools.
 * If you are trying to read the output file, select a different devtool (https://webpack.js.org/configuration/devtool/)
 * or disable the default devtool with "devtool: false".
 * If you are looking for production-ready output files, see mode: "production" (https://webpack.js.org/configuration/mode/).
 */
self["webpackHotUpdatelambda"]("auth/account-finalization",{

/***/ "./client/src/ts/auth/account-finalization.ts"
/*!****************************************************!*\
  !*** ./client/src/ts/auth/account-finalization.ts ***!
  \****************************************************/
(__unused_webpack_module, __webpack_exports__, __webpack_require__) {

eval("{__webpack_require__.r(__webpack_exports__);\n/* harmony import */ var _utilities_api_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ../utilities/api.js */ \"./client/src/ts/utilities/api.ts\");\n/*\n  _               __  __ _         _\n | |        /\\   |  \\/  | |       | |\n | |       /  \\  | \\  / | |__   __| | __ _\n | |      / /\\ \\ | |\\/| | '_ \\ / _` |/ _` |\n | |____ / ____ \\| |  | | |_) | (_| | (_| |\n |______/_/    \\_\\_|  |_|_.__/ \\__,_|\\__,_|\n\n Name: Account Finalization\n File: account-finalization.ts\n Description: Handles profile completion for new users after account creation\n Last Edited: 24 February 2026\n*/\n\n// Check if logged in and get user type on page load\nlet currentUserType = null;\ndocument.addEventListener('DOMContentLoaded', async () => {\n    const user = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.getCurrentUser)();\n    if (!user) {\n        // Not logged in, redirect to login\n        window.location.href = 'login.html';\n        return;\n    }\n    currentUserType = user.userType;\n});\n// Form submission handler\nconst form = document.getElementById('finalization-form');\nform?.addEventListener('submit', function (event) {\n    event.preventDefault();\n    submitProfile();\n});\n// Skip button handler\nconst skipBtn = document.getElementById('skip-btn');\nskipBtn?.addEventListener('click', function () {\n    redirectUser(currentUserType);\n});\n/* SUBMIT PROFILE\n* Validates and submits the profile information to update the user's account\n* PARAMS - none (reads from form inputs)\n* RETURNS - void (redirects on success)\n*/\nasync function submitProfile() {\n    const firstName = document.getElementById('first-name')?.value.trim();\n    const lastName = document.getElementById('last-name')?.value.trim();\n    const phone = document.getElementById('phone')?.value.trim();\n    // Validation - require at least one field\n    if (!firstName && !lastName && !phone) {\n        alert('Please fill in at least one field, or click \"Skip for Now\"');\n        return;\n    }\n    try {\n        const response = await (0,_utilities_api_js__WEBPACK_IMPORTED_MODULE_0__.apiAxios)('/auth/update-profile', {\n            method: 'POST',\n            body: {\n                firstName: firstName || null,\n                lastName: lastName || null,\n                phone: phone || null\n            }\n        });\n        if (response.success) {\n            // Show success message and redirect to appropriate dashboard\n            alert('Profile updated successfully!');\n            redirectUser(currentUserType);\n        }\n        else {\n            alert(response.message || 'Failed to update profile');\n        }\n    }\n    catch (error) {\n        console.error('Profile update error:', error);\n        if (error.response?.data?.message) {\n            alert(error.response.data.message);\n        }\n        else {\n            alert('An error occurred while updating your profile. Please try again.');\n        }\n    }\n}\n/* REDIRECT USER\n* Redirects user to the appropriate page based on their user type\n* PARAMS - userType: string | null\n* RETURNS - void\n*/\nfunction redirectUser(userType) {\n    switch (userType) {\n        case 'admin':\n            window.location.href = '../admin/admin-index.html';\n            break;\n        case 'vendor':\n            window.location.href = '../vendor/vendor-index.html';\n            break;\n        case 'user':\n            window.location.href = 'user-dashboard.html';\n            break;\n        default:\n            console.error('Unknown user type:', userType);\n            // Fallback to login if user type is unknown\n            window.location.href = 'login.html';\n    }\n}\n\n\n\n//# sourceURL=webpack://lambda/./client/src/ts/auth/account-finalization.ts?\n}");

/***/ }

},
/******/ function(__webpack_require__) { // webpackRuntimeModules
/******/ /* webpack/runtime/getFullHash */
/******/ (() => {
/******/ 	__webpack_require__.h = () => ("4116b9d9d2baf0233ce0")
/******/ })();
/******/ 
/******/ }
);