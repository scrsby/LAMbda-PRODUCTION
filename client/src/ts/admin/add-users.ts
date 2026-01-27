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
 Last Edited: 26 January 2026
*/

import { apiAxios } from '../../utilities/api';

function formSumbit() {
  const email = (document.getElementById('email-field') as HTMLInputElement)?.value;

  apiAxios('/auth/createNewUser', {
    method: 'POST',
    body: { email }
  })
};