export function updateProfileCard(user) {
    const displayName = getDisplayName(user);
    const userNameEl = document.querySelector('.user-name');
    if (userNameEl) {
        userNameEl.textContent = displayName;
        userNameEl.style.visibility = 'visible';
    }
    const userAvatarEl = document.querySelector('.user-avatar');
    if (userAvatarEl) {
        userAvatarEl.textContent = displayName.charAt(0).toUpperCase();
        userAvatarEl.style.visibility = 'visible';
    }
}
export function getDisplayName(user) {
    if (user.firstName && user.firstName.trim() !== '') {
        return user.firstName;
    }
    else {
        return '';
    }
    ;
}
//# sourceMappingURL=ui.js.map