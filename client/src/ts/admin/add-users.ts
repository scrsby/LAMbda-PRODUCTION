/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Add Users
 File: add-users.ts
 Description: Handles user creation and the initial access code email
 Last Edited: 4 February 2026
*/

import { apiAxios } from '../utilities/api.js';

const form = document.getElementById('add-user-form');
form?.addEventListener('submit', function(event) {
  event.preventDefault();
  formSumbit();
});

function formSumbit(): void {
  const email = (document.getElementById('email-field') as HTMLFormElement)?.value;

  console.log("Submitted email: ", email);
  createUser(email);
}

/* CREATE USER SEQUENCE
* Params: email
* 
* 
* 
* 
*/
async function createUser(email: string) {
    try {
        const response = await apiAxios('/admin/createNewUser', {
            method: 'POST',
            body: { email }
        });

        // Success case - response is already the data, not response.data
        showSuccessMessage(`User created successfully! Access token: ${response.access_token}`);
        
    } catch (error: any) {
        console.log('Full error object:', error); // Debug log
        
        // Handle different error cases
        if (error.response?.status === 400) {
            showErrorMessage(error.response.data.message);
        } else if (error.response?.data?.message) {
            showErrorMessage(error.response.data.message);
        } else if (error.message) {
            showErrorMessage(error.message);
        } else {
            showErrorMessage('An error occurred while creating the user');
        }
    }
}

/* MESSAGE DISPLAY FUNCTIONS
* Params: Error message
*
* 
*/
function showErrorMessage(message: string) {
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    } if (successDiv) {
        successDiv.style.display = 'none';
    }
}

function showSuccessMessage(message: string) {
    const errorDiv = document.getElementById('error-message');
    const successDiv = document.getElementById('success-message');
    if (errorDiv) {
        errorDiv.style.display = 'none';
    } if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}