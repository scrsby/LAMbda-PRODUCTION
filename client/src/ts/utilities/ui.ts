import type { SessionUser } from "./api.js";
import { VENDOR_POS_ACCESS_USER_TYPES } from "./redirect.js";

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
    if (userMenuEl && !window.location.pathname.endsWith('/user-settings.html') && !userMenuEl.dataset.navBound) {
        userMenuEl.dataset.navBound = 'true';
        userMenuEl.style.cursor = 'pointer';
        userMenuEl.addEventListener('click', () => {
            window.location.href = '/user-settings.html';
        });
    }

    updateNavVisibility(user);
}

/**
 * Shows or hides nav links that should only be visible to certain user types:
 * - The "Vendor" tab in the admin nav is only relevant to vendor-admins, who
 *   manage both an admin account and a vendor account.
 * - The "POS" tab in the vendor nav is only relevant to vendor-admins and
 *   vendor-employees, since plain 'vendor' accounts have no POS access.
 */
export function updateNavVisibility(user: SessionUser) {
    document.querySelectorAll<HTMLElement>('.nav-vendor-tab').forEach((el) => {
        el.style.display = user.userType === 'vendor-admin' ? '' : 'none';
    });

    document.querySelectorAll<HTMLElement>('.nav-pos-tab').forEach((el) => {
        el.style.display = VENDOR_POS_ACCESS_USER_TYPES.includes(user.userType) ? '' : 'none';
    });
}

export function getDisplayName(user: SessionUser): string {
    if (user.firstName && user.firstName.trim() !== '') {
        return user.firstName;
    } else {
        return '';
    };
}