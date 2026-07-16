import { apiAxios, getCurrentUser } from "../utilities/api.js";

let currentUserType: string | null = null;

document.addEventListener('DOMContentLoaded', async () => {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = 'login.html';
        return;
    }
    currentUserType = user.userType;
});

const form = document.getElementById('finalization-form');
form?.addEventListener('submit', function(event) {
    event.preventDefault();
    submitProfile();
});

const skipBtn = document.getElementById('skip-btn');
skipBtn?.addEventListener('click', function() {
    redirectUser(currentUserType);
});

async function submitProfile() {
    const firstName = (document.getElementById('first-name') as HTMLInputElement)?.value.trim();
    const lastName = (document.getElementById('last-name') as HTMLInputElement)?.value.trim();
    const phone = (document.getElementById('phone') as HTMLInputElement)?.value.trim();

    // Validation - require at least one field
    if (!firstName && !lastName && !phone) {
        alert('Please fill in at least one field, or click "Skip for Now"');
        return;
    }

    try {
        const response = await apiAxios('/auth/update-profile', {
            method: 'POST',
            body: {
                firstName: firstName || null,
                lastName: lastName || null,
                phone: phone || null
            }
        });

        if (response.success) {
            // Show success message and redirect to appropriate dashboard
            alert('Profile updated successfully!');
            redirectUser(currentUserType);
        } else {
            alert(response.message || 'Failed to update profile');
        }

    } catch (error: any) {
        console.error('Profile update error:', error);
        
        if (error.response?.data?.message) {
            alert(error.response.data.message);
        } else {
            alert('An error occurred while updating your profile. Please try again.');
        }
    }
}

/* REDIRECT USER
* Redirects user to the appropriate page based on their user type
* PARAMS - userType: string | null
* RETURNS - void
*/
function redirectUser(userType: string | null) {
    switch (userType) {
        case 'admin':
            window.location.href = '../admin/admin-index.html';
            break;
        case 'vendor':
            window.location.href = '../vendor/vendor-index.html';
            break;
        case 'user':
            window.location.href = 'user-dashboard.html';
            break;
        default:
            console.error('Unknown user type:', userType);
            // Fallback to login if user type is unknown
            window.location.href = 'login.html';
    }
}

export {};
