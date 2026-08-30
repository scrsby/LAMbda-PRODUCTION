import axios from 'axios';
export async function apiAxios(endpoint, options = {}) {
    const url = endpoint;
    try {
        const response = await axios({
            url,
            data: options.body,
            withCredentials: true,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        return response.data;
    }
    catch (err) {
        if (err.response) {
            console.error('API error:', err.response.data);
            throw err; // Throw the original error to preserve the structure
        }
        else if (err.request) {
            // Request was made but no response was received
            console.error('Network error:', err.request);
            throw new Error('Network error: No response from server');
        }
        else {
            console.error('Config error:', err.message);
            throw err;
        }
    }
}
/* LOGOUT
* Ends the user's session on the server and clears the session cookie
* Returns: Promise<boolean> - true if logout was successful
*/
export async function logout() {
    try {
        const response = await apiAxios('/auth/logout', {
            method: 'POST'
        });
        return response.success === true;
    }
    catch (error) {
        console.error('Logout error:', error);
        return false;
    }
}
export async function logoutHandler() {
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
}
/* GET CURRENT USER
* Retrieves the currently logged in user's session data
* Returns: Promise<SessionUser | null> - user data if authenticated, null otherwise
*/
export async function getCurrentUser() {
    try {
        const response = await apiAxios('/auth/me', {
            method: 'GET'
        });
        if (response.success && response.user) {
            return response.user;
        }
        return null;
    }
    catch (error) {
        // User is not authenticated
        return null;
    }
}
/* IS AUTHENTICATED
* Quick check if user has an active session
* Returns: Promise<boolean> - true if user is logged in
*/
export async function isAuthenticated() {
    const user = await getCurrentUser();
    return user !== null;
}
/* REQUIRE AUTH
* Checks if user is authenticated, redirects to login if not
* @param redirectUrl - URL to redirect to if not authenticated (default: login page)
* Returns: Promise<SessionUser | null> - user data if authenticated
*/
export async function requireAuth(redirectUrl = '/auth/login.html') {
    const user = await getCurrentUser();
    if (!user) {
        window.location.href = redirectUrl;
        return null;
    }
    return user;
}
//# sourceMappingURL=api.js.map