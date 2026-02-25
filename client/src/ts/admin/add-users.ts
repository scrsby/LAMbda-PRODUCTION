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

import { apiAxios, requireAuth, logout } from '../utilities/api.js';

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
  const user = await requireAuth();
  if (!user) return; // Will redirect to login
  
  // Only allow admin users
  if (user.userType !== 'admin') {
    window.location.href = '/auth/login.html';
    return;
  }
});

const form = document.getElementById('add-user-form');
form?.addEventListener('submit', function(event) {
  event.preventDefault();
  formSumbit();
});

// Logout button handler
const logoutBtn = document.getElementById('logout-btn');
logoutBtn?.addEventListener('click', async () => {
  const success = await logout();
  if (success) {
    window.location.href = '/auth/login.html';
  }
});

function formSumbit(): void {
  const email = (document.getElementById('email-field') as HTMLInputElement)?.value;
  const role = (document.getElementById('role') as HTMLSelectElement)?.value;
  const vendorId = (document.getElementById('vendorId') as HTMLInputElement)?.value;
  console.log("Form values:", { email, role, vendorId });
  
  if (!email || !role) {
    showErrorMessage('Email and Role are required');
    return;
  }
  
  createUser(email, role, vendorId);
}

/* CREATE USER SEQUENCE
* Params: email
* 
* 
* 
* 
*/
async function createUser(email: string, role: string, vendorId: string) {
    try {
        const baseUrl = window.location.origin;
        const response = await apiAxios('/admin/createNewUser', {
            method: 'POST',
            body: { 
                email,
                user_type: role,
                vendor_id: vendorId,
                baseUrl: baseUrl
            }
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