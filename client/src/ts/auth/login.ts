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

import { apiAxios } from "../utilities/api.js";
import { isValidEmail } from "../utilities/form-validation.js";

// Form submission handler
const form = document.getElementById('create-account-form');
form?.addEventListener('submit', function(event) {
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
    if (!email || !password) {
        // showError('Please fill in all fields');
        console.log('Field missing')
        return;
    }

    if (!isValidEmail(email)) {
        // showError('Please enter a valid email address');
        console.log('Field missing')
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
            // Redirect to login page or dashboard
            alert('Account created successfully! Redirecting to login...');
            window.location.href = 'login.html';
        }
    } catch (error: any) {
        console.error('Account creation error:', error);

        if (error.response?.data?.message) {
            // showError(error.response.data.message);
        } else if (error.message) {
            // showError(error.message);
        } else {
            // showError('An error occurred while creating your account. Please try again.');
        }
    }
}

// Login functionality - TODO: implement
export {};