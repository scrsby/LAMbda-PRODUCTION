/*
  _               __  __ _         _
 | |        /\   |  \/  | |       | |
 | |       /  \  | \  / | |__   __| | __ _
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|

 Name: Create Account
 File: create-account.ts
 Description: Handles user account creation with access token validation
 Last Edited: 9 February 2026
*/

import { apiAxios } from '../utilities/api.js';

// Check for token in URL on page load
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        // Pre-fill and disable the access token field if token is in URL
        const accessTokenInput = document.getElementById('access-token') as HTMLInputElement;
        if (accessTokenInput) {
            accessTokenInput.value = token;
            accessTokenInput.disabled = true;
            accessTokenInput.style.backgroundColor = 'var(--bg-secondary)';
            accessTokenInput.style.cursor = 'not-allowed';
        }
    }
});

// Form submission handler
const form = document.getElementById('create-account-form');
form?.addEventListener('submit', function(event) {
    event.preventDefault();
    handleAccountCreation();
});

/* HANDLE ACCOUNT CREATION
* Validates form fields and submits account creation request to backend
*/
async function handleAccountCreation() {
    const email = (document.getElementById('email') as HTMLInputElement)?.value.trim();
    const accessToken = (document.getElementById('access-token') as HTMLInputElement)?.value.trim();
    const username = (document.getElementById('username') as HTMLInputElement)?.value.trim();
    const password = (document.getElementById('password') as HTMLInputElement)?.value;
    const repeatPassword = (document.getElementById('repeat-password') as HTMLInputElement)?.value;
    const errorDiv = document.getElementById('error-message');

    // Validation checks
    if (!email || !accessToken || !username || !password || !repeatPassword) {
        showError('Please fill in all fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    if (username.length < 8) {
        showError('Username must be at least 8 characters long');
        return;
    }

    if (password.length < 8) {
        showError('Password must be at least 8 characters long');
        return;
    }

    if (password !== repeatPassword) {
        showError('Passwords do not match');
        return;
    }

    // Submit to backend
    try {
        const response = await apiAxios('/auth/createAccount', {
            method: 'POST',
            body: {
                email,
                accessToken,
                username,
                password
            }
        });

        if (response.success) {
            // Redirect to login page or dashboard
            alert('Account created successfully! Redirecting to login...');
            window.location.href = 'login.html';
        }
    } catch (error: any) {
        console.error('Account creation error:', error);

        if (error.response?.data?.message) {
            showError(error.response.data.message);
        } else if (error.message) {
            showError(error.message);
        } else {
            showError('An error occurred while creating your account. Please try again.');
        }
    }
}

/* VALIDATION HELPERS */
function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showError(message: string) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // Scroll to error message
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

export {};