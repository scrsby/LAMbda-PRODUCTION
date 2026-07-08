import type { SessionUser } from "../utilities/api.js";
import { getCurrentUser, logout, requireAuth } from "../utilities/api.js";
import { getDisplayName, updateProfileCard } from "../utilities/ui.js";

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    if (!user) return;
      
    if (user.userType !== 'admin') {
        window.location.href = '/auth/login.html';
        return;
    }

    await initializeDashboard();    

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

async function initializeDashboard() {
    const user = await getCurrentUser();
    
    if (!user) {
        window.location.href = '../auth/login.html';
        return;
    }

    displayGreeting(user);
    updateProfileCard(user);
}

function displayGreeting(user: SessionUser) {
    const displayName = getDisplayName(user);

    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
        const timeGreeting = getTimeBasedGreeting();
        greetingEl.textContent = `${timeGreeting}, ${displayName}`;
    }
}

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
