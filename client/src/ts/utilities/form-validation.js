/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Field validations
 File: form-validation.js
 Required by: 
 Description: This file contains functions for validating user input in forms, such as email and password formats.
 Functions: 
 Last Edited: 21 July 2024
*/

// Password validation
export function isValidPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d!@#$%^&*]).{8,}$/;
    return regex.test(password);
}

// Booth number validation (1-3 digits)
export function isValidVendorId(booth) {
    return /^\d{1,3}$/.test(booth);
}

// Username validation (alphanumeric, 3-20 characters)
export function isValidUsername(username) {
    // Username must be alphanumeric and 3-20 characters long
    const regex = /^[a-zA-Z0-9]{3,20}$/;
    return regex.test(username);
}

// Validate email form (must include @ and . address)
export function isValidEmail(email) {
    // Basic email validation regex
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}