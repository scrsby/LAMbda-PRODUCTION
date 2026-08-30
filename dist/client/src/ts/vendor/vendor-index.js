import { logout, logoutHandler, requireAuth } from "../utilities/api.js";
import { getDisplayName, updateProfileCard } from "../utilities/ui.js";
import { requireUserType } from "../utilities/redirect.js";
document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    if (user) {
        await requireUserType('vendor', user);
        await initializeDashboard(user);
        await logoutHandler();
    }
    else {
        await logout();
        window.location.href = '../auth/login.html';
    }
});
async function initializeDashboard(user) {
    displayGreeting(user);
    updateProfileCard(user);
}
function displayGreeting(user) {
    const displayName = getDisplayName(user);
    const greetingEl = document.getElementById('greeting');
    if (greetingEl) {
        const timeGreeting = getTimeBasedGreeting();
        greetingEl.textContent = `${timeGreeting}, ${displayName}`;
    }
}
function getTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) {
        return 'Good morning';
    }
    else if (hour < 17) {
        return 'Good afternoon';
    }
    else {
        return 'Good evening';
    }
}
export {};
//# sourceMappingURL=vendor-index.js.map