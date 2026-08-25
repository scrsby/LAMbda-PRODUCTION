/*
  _               __  __ _         _
 | |        /\   |  \/  | |       | |
 | |       /  \  | \  / | |__   __| | __ _
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|

 Name: Reset Password
 File: reset-password.ts
 Description: Handles password reset via magic link token
*/

import { apiAxios } from '../utilities/api.js';

let resetToken: string | null = null;
let resetEmail: string | null = null;

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
    const form = document.getElementById('reset-password-form');
    const successMessage = document.getElementById('success-message');
    if (form) {
        form.style.display = 'none';
    }
    if (successMessage) {
        successMessage.style.display = 'block';
    }
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 3000);
}

function showInvalidLink() {
    const form = document.getElementById('reset-password-form');
    const invalidMessage = document.getElementById('invalid-link-message');
    if (form) {
        form.style.display = 'none';
    }
    if (invalidMessage) {
        invalidMessage.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    resetToken = urlParams.get('token');
    resetEmail = urlParams.get('email');

    if (!resetToken || !resetEmail) {
        showInvalidLink();
    }
});

const form = document.getElementById('reset-password-form');
form?.addEventListener('submit', function (event) {
    event.preventDefault();
    handleResetPassword();
});

async function handleResetPassword() {
    const newPassword = (document.getElementById('new-password') as HTMLInputElement)?.value;
    const repeatNewPassword = (document.getElementById('repeat-new-password') as HTMLInputElement)?.value;

    hideError();

    if (!newPassword || !repeatNewPassword) {
        showError('Please fill in all fields');
        return;
    }

    if (newPassword.length < 8) {
        showError('Password must be at least 8 characters long');
        return;
    }

    if (newPassword !== repeatNewPassword) {
        showError('Passwords do not match');
        return;
    }

    if (!resetToken || !resetEmail) {
        showInvalidLink();
        return;
    }

    const submitButton = form?.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = 'Resetting...';
    }

    try {
        await apiAxios('/auth/resetPassword', {
            method: 'POST',
            body: {
                email: resetEmail,
                token: resetToken,
                newPassword
            }
        });

        showSuccess();
    } catch (error: any) {
        console.error('Reset password error:', error);
        if (error.response?.data?.message) {
            showError(error.response.data.message);
        } else {
            showError('An error occurred. Please try again.');
        }
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = 'Reset Password';
        }
    }
}

export {};
