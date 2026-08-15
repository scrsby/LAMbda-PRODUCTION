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

function buildMessageContent(div, message) {
    div.innerHTML = '';
    const textSpan = document.createElement('span');
    textSpan.textContent = message;
    textSpan.style.flex = '1';

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:1.25rem;line-height:1;padding:0 0 0 0.75rem;color:inherit;flex-shrink:0;';
    closeBtn.addEventListener('click', () => { div.style.display = 'none'; });

    div.style.display = 'flex';
    div.style.alignItems = 'center';
    div.style.justifyContent = 'space-between';
    div.appendChild(textSpan);
    div.appendChild(closeBtn);
}

export function showErrorMessage(message, errorId = 'error-message', successId = 'success-message') {
    const errorDiv = document.getElementById(errorId);
    const successDiv = document.getElementById(successId);

    if (errorDiv) {
        buildMessageContent(errorDiv, message);
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
        buildMessageContent(successDiv, message);
    }
}