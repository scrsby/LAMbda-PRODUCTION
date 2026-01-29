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
 Last Edited: 28 January 2026
*/

import { apiAxios } from '../utilities/api.js';

const form = document.getElementById('add-user-form');
form?.addEventListener('submit', function(event) {
  event.preventDefault();
  formSumbit();
});

function formSumbit() {
  const email = (document.getElementById('email-field') as HTMLFormElement)?.value;

  console.log("Submitted email: ", email);


  apiAxios('/auth/createNewUser', {
    method: 'POST',
    body: { email }
  })
  .then((response) => {
    // Handle successful response
    console.log('User created successfully:', response);
  })
  .catch((error) => {
    // Handle error
    console.error('Error creating user:', error);
  });
}