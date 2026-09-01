import { apiAxios, getCurrentUser, logout, requireAuth } from './utilities/api.js';
import type { SessionUser } from './utilities/api.js';
import { PROFILE_COLORS, updateProfileCard } from './utilities/ui.js';
import { showErrorMessage, showSuccessMessage } from './utilities/messages.js';

let selectedColor: string | null = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await requireAuth();
    if (!user) return;

    updateProfileCard(user);
    populateProfileForm(user);
    renderColorSwatches(user);

    document.getElementById('save-name-btn')?.addEventListener('click', () => saveName());
    document.getElementById('back-btn')?.addEventListener('click', () => {
        window.location.href = dashboardUrlFor(user.userType);
    });
    document.getElementById('logo-link')?.addEventListener('click', (e) => {
        e.preventDefault();
        window.location.href = dashboardUrlFor(user.userType);
    });
    document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
        window.location.href = '/auth/login.html';
    });
});

/* POPULATE PROFILE FORM
* Fills in the first/last name inputs with the current user's saved values
*/
function populateProfileForm(user: SessionUser) {
    const firstNameInput = document.getElementById('first-name') as HTMLInputElement | null;
    const lastNameInput = document.getElementById('last-name') as HTMLInputElement | null;

    if (firstNameInput) firstNameInput.value = user.firstName ?? '';
    if (lastNameInput) lastNameInput.value = user.lastName ?? '';
}

/* RENDER COLOR SWATCHES
* Builds the 16-color picker grid and highlights the user's current selection
*/
function renderColorSwatches(user: SessionUser) {
    const grid = document.getElementById('color-swatch-grid');
    if (!grid) return;

    selectedColor = user.color ?? null;
    grid.innerHTML = '';

    PROFILE_COLORS.forEach((color) => {
        const swatch = document.createElement('button');
        swatch.type = 'button';
        swatch.className = 'color-swatch' + (color === selectedColor ? ' selected' : '');
        swatch.style.background = color;
        swatch.dataset.color = color;
        swatch.setAttribute('aria-label', `Select color ${color}`);
        swatch.addEventListener('click', () => selectColor(color, grid));
        grid.appendChild(swatch);
    });
}

/* SELECT COLOR
* Marks the clicked swatch as selected and persists the choice
*/
async function selectColor(color: string, grid: HTMLElement) {
    if (color === selectedColor) return;

    try {
        const response = await apiAxios('/auth/update-profile', {
            method: 'POST',
            body: { color }
        });

        if (response.success) {
            selectedColor = color;
            grid.querySelectorAll<HTMLElement>('.color-swatch').forEach((el) => {
                el.classList.toggle('selected', el.dataset.color === color);
            });
            const user = await getCurrentUser();
            if (user) updateProfileCard(user);
            showSuccessMessage('Profile color updated.');
        } else {
            showErrorMessage(response.message || 'Failed to update profile color.');
        }
    } catch (error: any) {
        console.error('Error updating profile color:', error);
        showErrorMessage(error.response?.data?.message || 'An error occurred while updating your profile color.');
    }
}

/* SAVE NAME
* Persists the first/last name fields to the server
*/
async function saveName() {
    const firstNameInput = document.getElementById('first-name') as HTMLInputElement | null;
    const lastNameInput = document.getElementById('last-name') as HTMLInputElement | null;

    const firstName = firstNameInput?.value.trim() ?? '';
    const lastName = lastNameInput?.value.trim() ?? '';

    if (!firstName && !lastName) {
        showErrorMessage('Please enter a first or last name.');
        return;
    }

    try {
        const response = await apiAxios('/auth/update-profile', {
            method: 'POST',
            body: {
                firstName: firstName || null,
                lastName: lastName || null
            }
        });

        if (response.success) {
            showSuccessMessage('Profile updated successfully.');
            const user = await getCurrentUser();
            if (user) updateProfileCard(user);
        } else {
            showErrorMessage(response.message || 'Failed to update profile.');
        }
    } catch (error: any) {
        console.error('Error updating profile:', error);
        showErrorMessage(error.response?.data?.message || 'An error occurred while updating your profile.');
    }
}

/* DASHBOARD URL FOR
* Resolves the appropriate landing page for a given user type
*/
function dashboardUrlFor(userType: string): string {
    switch (userType) {
        case 'admin':
        case 'vendor-admin':
            return '/admin/admin-index.html';
        case 'employee':
        case 'vendor-employee':
            return '/POS/register.html';
        case 'vendor':
            return '/vendor/vendor-index.html';
        default:
            return '/auth/login.html';
    }
}

export {};
