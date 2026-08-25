/*
  _               __  __ _         _
 | |        /\   |  \/  | |       | |
 | |       /  \  | \  / | |__   __| | __ _
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|

 Name: Forgot Password
 File: forgot-password.ts
 Description: Handles forgot password form submission and sends reset email
*/

import { apiAxios } from '../utilities/api.js';
import { isValidEmail } from '../utilities/form-validation.js';

function showError(message: string) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    }
}

function showSuccess() {
    const form = document.getElementById('forgot-password-form');
    const successMessage = document.getElementById('success-message');
    if (form) {
        form.style.display = 'none';
    }
    if (successMessage) {
        successMessage.style.display = 'block';
    }
}

const form = document.getElementById('forgot-password-form');
form?.addEventListener('submit', function (event) {
    event.preventDefault();
    handleForgotPassword();
});

async function handleForgotPassword() {
    const email = (document.getElementById('email') as HTMLInputElement)?.value.trim();

    hideError();

    if (!email) {
        showError('Please enter your email address');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';
    }

    try {
        const baseUrl = window.location.origin;
        await apiAxios('/auth/generateResetPasswordToken', {
            method: 'POST',
            body: { email, baseUrl }
        });

        showSuccess();
    } catch (error: any) {
        console.error('Forgot password error:', error);
        if (error.response?.data?.message) {
            showError(error.response.data.message);
        } else {
            showError('An error occurred. Please try again.');
        }
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Get Reset Link';
        }
    }
}

export {};
