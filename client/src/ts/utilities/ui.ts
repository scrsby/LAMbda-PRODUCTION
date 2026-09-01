import type { SessionUser } from "./api.js";

/**
 * Fixed palette of colors a user may choose from to personalize their
 * profile avatar. Must stay in sync with PROFILE_COLORS in
 * server/utils/auth-middleware.ts and the CHECK constraint on users.color.
 */
export const PROFILE_COLORS = [
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#EC4899', '#F43F5E'
];

export function updateProfileCard(user: SessionUser) {
    const displayName = getDisplayName(user);

    const userNameEl = document.querySelector<HTMLElement>('.user-name');
    const userAvatarEl = document.querySelector<HTMLElement>('.user-avatar');

    if (displayName === '') {
        if (userNameEl) {
            userNameEl.textContent = 'Set Up Profile';
            userNameEl.style.visibility = 'visible';
        }
        if (userAvatarEl) {
            userAvatarEl.textContent = '';
            userAvatarEl.style.visibility = 'hidden';
        }
    } else {
        if (userNameEl) {
            userNameEl.textContent = displayName;
            userNameEl.style.visibility = 'visible';
        }
        if (userAvatarEl) {
            userAvatarEl.textContent = displayName.charAt(0).toUpperCase();
            userAvatarEl.style.visibility = 'visible';
            userAvatarEl.style.background = user.color ? user.color : '';
        }
    }

    const userMenuEl = document.querySelector<HTMLElement>('.user-menu');
    if (userMenuEl && !window.location.pathname.endsWith('/user-settings.html')) {
        userMenuEl.style.cursor = 'pointer';
        userMenuEl.addEventListener('click', () => {
            window.location.href = '../user-settings.html';
        });
    }
}

export function getDisplayName(user: SessionUser): string {
    if (user.firstName && user.firstName.trim() !== '') {
        return user.firstName;
    } else {
        return '';
    };
}