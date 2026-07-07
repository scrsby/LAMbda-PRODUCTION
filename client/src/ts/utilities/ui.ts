import type { SessionUser } from "./api.js";

export function updateProfileCard(user: SessionUser) {
    const displayName = getDisplayName(user);
    
    const userNameEl = document.querySelector<HTMLElement>('.user-name');
    if (userNameEl) {
        userNameEl.textContent = displayName;
        userNameEl.style.visibility = 'visible';
    }
    
    const userAvatarEl = document.querySelector<HTMLElement>('.user-avatar');
    if (userAvatarEl) {
        userAvatarEl.textContent = displayName.charAt(0).toUpperCase();
        userAvatarEl.style.visibility = 'visible';
    }
}

export function getDisplayName(user: SessionUser): string {
    if (user.firstName && user.firstName.trim() !== '') {
        return user.firstName;
    } else {
        return '';
    };
}