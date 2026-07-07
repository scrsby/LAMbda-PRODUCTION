/*
  _               __  __ _         _
 | |        /\   |  \/  | |       | |
 | |       /  \  | \  / | |__   __| | __ _
 | |      / /\ \ | |\/| | '_ \ / _` |/ _` |
 | |____ / ____ \| |  | | |_) | (_| | (_| |
 |______/_/    \_\_|  |_|_.__/ \__,_|\__,_|

 Name: Admin Dashboard
 File: admin-index.ts
 Description: Handles admin dashboard initialization and user display
 Last Edited: 24 February 2026
*/

import type { SessionUser } from "../utilities/api.js";
import { getCurrentUser, logout } from "../utilities/api.js";

// Initialize dashboard on page load
document.addEventListener('DOMContentLoaded', async () => {
    await initializeDashboard();

    // Logout button handlers
    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
        window.location.href = '../auth/login.html';
    });
    document.getElementById('logout-btn-mobile')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
        window.location.href = '../auth/login.html';
    });
});

/* INITIALIZE DASHBOARD
* Fetches user data and updates the UI with user information
* PARAMS - none
* RETURNS - void
*/
async function initializeDashboard() {
    const user = await getCurrentUser();
    
    if (!user) {
        // Not logged in, redirect to login
        window.location.href = '../auth/login.html';
        return;
    }
    
    // Update the UI with the user's name
    displayUserName(user);
}

/* DISPLAY USER NAME
* Updates all UI elements that display the user's name
* PARAMS - user: SessionUser
* RETURNS - void
*/
function displayUserName(user: SessionUser) {
    // Build display name from avfailable fields
    const displayName = getDisplayName(user);
    
    // Update greeting
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
        const timeGreeting = getTimeBasedGreeting();
        greetingEl.textContent = `${timeGreeting}, ${displayName}`;
    }
    
    // Update user menu name
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl) {
        userNameEl.textContent = displayName;
    }
    
    // Update user avatar with first initial
    const userAvatarEl = document.querySelector('.user-avatar');
    if (userAvatarEl) {
        userAvatarEl.textContent = displayName.charAt(0).toUpperCase();
    }
}

/* GET DISPLAY NAME
* Returns the best available name to display for the user
* Priority: First Name > Email username
* PARAMS - user: SessionUser
* RETURNS - string
*/
function getDisplayName(user: SessionUser): string {
    // Use first name if available
    if (user.firstName && user.firstName.trim() !== '') {
        return user.firstName.trim();
    }

    const emailPrefix = user.email?.split('@')[0]?.trim();
    return emailPrefix || 'User';
}

/* GET TIME BASED GREETING
* Returns an appropriate greeting based on the current time
* PARAMS - none
* RETURNS - string
*/
function getTimeBasedGreeting(): string {
    const hour = new Date().getHours();
    
    if (hour < 12) {
        return 'Good morning';
    } else if (hour < 17) {
        return 'Good afternoon';
    } else {
        return 'Good evening';
    }
}

export {};
