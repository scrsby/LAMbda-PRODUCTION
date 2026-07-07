/*
  _               __  __ _         _
 | |        /\   |  \/  | |       | |
 | |       /  \  | \  / | |__   __| | __ _
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|

 Name: Login 
 File: login.ts
 Description: Handles user login and redirects to appropriate page
 Last Edited: 21 February 2026
*/

import { apiAxios, getCurrentUser } from "../utilities/api.js";
import { isValidEmail } from "../utilities/form-validation.js";

const LOGIN_SUCCESS_REDIRECT_DELAY_MS = 1200;

// Error display helper
function showError(message: string) {
    const errorDisplay = document.getElementById('error-display');
    const errorMessage = document.getElementById('error-message');
    if (errorDisplay && errorMessage) {
        errorMessage.textContent = message;
        errorDisplay.style.display = 'block';
    }
}

function hideError() {
    const errorDisplay = document.getElementById('error-display');
    if (errorDisplay) {
        errorDisplay.style.display = 'none';
    }
}

function showLoginSuccessState() {
    const title = document.getElementById('login-title');
    const subtitle = document.getElementById('login-subtitle');
    const successIndicator = document.getElementById('login-success-indicator');
    const submitButton = document.querySelector('#login-form button[type="submit"]') as HTMLButtonElement | null;

    if (title) {
        title.textContent = 'Login Successful';
    }

    if (subtitle) {
        subtitle.textContent = 'Redirecting to dashboard...';
    }

    if (successIndicator) {
        successIndicator.style.display = 'flex';
    }

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.setAttribute('aria-disabled', 'true');
        submitButton.textContent = 'Redirecting...';
    }
}

// Check if already logged in on page load
document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    if (user) {
        // Check if profile is incomplete
        const hasFirstName = user.firstName && user.firstName.trim() !== '';
        const hasLastName = user.lastName && user.lastName.trim() !== '';
        const hasPhone = user.phone && user.phone.trim() !== '';
        
        const profileIncomplete = !hasFirstName && !hasLastName && !hasPhone;
        
        if (profileIncomplete) {
            window.location.href = 'account-finalization.html';
        } else {
            redirectUser(user.userType);
        }
    }
});

// Form submission handler
const form = document.getElementById('login-form');
console.log(form);
form?.addEventListener('submit', function(event) {
    console.log("Login started");
    event.preventDefault();
    credentialAuthorization();
});

/* CREDENTIAL AUTHORIZATION
* Validates credentials and then calls the /auth/login/ route to authenticate user
* Returns the user's user type for redirect.
* PARAMS - 
* RETURNS - user_type: string 
*/
async function credentialAuthorization() {
    const email = (document.getElementById('email') as HTMLInputElement)?.value.trim();
    const password = (document.getElementById('password') as HTMLInputElement)?.value.trim();

    console.log('Form values:', { email, password });

    // Validation checks
    hideError();
    
    if (!email || !password) {
        showError('Please fill in all fields');
        return;
    }

    if (!isValidEmail(email)) {
        showError('Please enter a valid email address');
        return;
    }

    console.log()

    try {
        const response = await apiAxios('/auth/login', {
            method: 'POST',
            body: {
                email,
                password
            }
        });

        if (response.success) {
            console.log('Login response:', response);
            
            // Check if profile is incomplete (missing all three: first_name, last_name, phone)
            const hasFirstName = response.user.first_name && response.user.first_name.trim() !== '';
            const hasLastName = response.user.last_name && response.user.last_name.trim() !== '';
            const hasPhone = response.user.phone && response.user.phone.trim() !== '';
            
            const profileIncomplete = !hasFirstName && !hasLastName && !hasPhone;
            
            if (profileIncomplete) {
                // Redirect to account finalization page
                console.log('Profile incomplete, redirecting to finalization...');
                window.location.href = 'account-finalization.html';
            } else {
                // Profile has at least one field, show success state then redirect to dashboard
                showLoginSuccessState();
                setTimeout(() => {
                    redirectUser(response.user.user_type);
                }, LOGIN_SUCCESS_REDIRECT_DELAY_MS);
            }
        }

    } catch (error: any) {
        console.error('Login error:', error);

        if (error.response?.data?.message) {
            showError(error.response.data.message);
        } else if (error.message) {
            showError(error.message);
        } else {
            showError('An error occurred during login. Please try again.');
        }
    }
}

function redirectUser(userType: string) {
    switch (userType) {
        case 'admin':
            window.location.href = '../admin/admin-index.html';
            break;
        case 'user':
            window.location.href = 'user-dashboard.html';
            break;
        default:
            console.error('Unknown user type:', userType);
            // Optionally show an error message to the user
    }
};

// Login functionality - TODO: implement
export {};