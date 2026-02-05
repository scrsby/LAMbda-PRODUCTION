/*
  _               __  __ _         _       
 | |        /\   |  \/  | |       | |      
 | |       /  \  | \  / | |__   __| | __ _ 
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|
 
 Name: Create Account
 File: create-account.ts
 Description: Handles user creation and the initial access code email
 Last Edited: 4 February 2026
*/

// Create account functionality
const urlParams = new URLSearchParams(window.location.search);
        
// Pull the specific 'token' value from URL
const myToken = urlParams.get('token');

console.log(myToken)
/*
// Set the access token if found in URL
if (myToken) {
    const accessTokenInput = document.getElementById('access-token') as HTMLInputElement;
    if (accessTokenInput) {
        accessTokenInput.value = myToken;
    }
}

// Add event listeners for form steps
document.addEventListener('DOMContentLoaded', () => {
    const accessNextBtn = document.getElementById('access-next');
    const credentialsNextBtn = document.getElementById('credentials-next');
    const detailsFinishBtn = document.getElementById('details-finish');

    if (accessNextBtn) {
        accessNextBtn.addEventListener('click', handleAccessCodeStep);
    }

    if (credentialsNextBtn) {
        credentialsNextBtn.addEventListener('click', handleCredentialsStep);
    }

    if (detailsFinishBtn) {
        detailsFinishBtn.addEventListener('click', handleAccountCreation);
    }
});

function handleAccessCodeStep() {
    const accessToken = (document.getElementById('access-token') as HTMLInputElement)?.value;
    const email = (document.getElementById('email') as HTMLInputElement)?.value;
    const errorDiv = document.getElementById('error-message-access');

    if (!accessToken || !email) {
        if (errorDiv) errorDiv.textContent = 'Please fill in all fields';
        return;
    }

    // TODO: Validate access token with backend
    console.log('Access code step completed');
}

function handleCredentialsStep() {
    const username = (document.getElementById('username') as HTMLInputElement)?.value;
    const password = (document.getElementById('password') as HTMLInputElement)?.value;
    const repeatPassword = (document.getElementById('repeat-password') as HTMLInputElement)?.value;
    const errorDiv = document.getElementById('error-message-credentials');

    if (!username || !password || !repeatPassword) {
        if (errorDiv) errorDiv.textContent = 'Please fill in all fields';
        return;
    }

    if (password !== repeatPassword) {
        if (errorDiv) errorDiv.textContent = 'Passwords do not match';
        return;
    }

    if (username.length < 8) {
        if (errorDiv) errorDiv.textContent = 'Username must be at least 8 characters';
        return;
    }

    // TODO: Add password validation
    console.log('Credentials step completed');
}

function handleAccountCreation() {
    const firstName = (document.getElementById('first-name') as HTMLInputElement)?.value;
    const lastName = (document.getElementById('last-name') as HTMLInputElement)?.value;
    const phone = (document.getElementById('phone') as HTMLInputElement)?.value;
    const errorDiv = document.getElementById('error-message-details');

    if (!firstName || !lastName || !phone) {
        if (errorDiv) errorDiv.textContent = 'Please fill in all fields';
        return;
    }

    // TODO: Submit account creation to backend
    console.log('Account creation completed');
}

*/
export {};