/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Error Message Utilities
 File: messages.js
 Description: Hides and shows errors on various pages
 Last Edited: 29 May 2026
*/

export function showErrorMessage(message, errorId = 'error-message', successId = 'success-message') {
    const errorDiv = document.getElementById(errorId);
    const successDiv = document.getElementById(successId);

    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    if (successDiv) {
        successDiv.style.display = 'none';
    }
}

export function showSuccessMessage(message, errorId = 'error-message', successId = 'success-message') {
    const errorDiv = document.getElementById(errorId);
    const successDiv = document.getElementById(successId);

    if (errorDiv) {
        errorDiv.style.display = 'none';
    }

    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}