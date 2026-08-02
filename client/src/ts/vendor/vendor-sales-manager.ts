import type { SessionUser } from "../utilities/api.js";
import { getCurrentUser, logout, logoutHandler, requireAuth } from "../utilities/api.js";
import { getDisplayName, updateProfileCard } from "../utilities/ui.js";
import { requireUserType } from "../utilities/redirect.js";

document.addEventListener('DOMContentLoaded', async () => { 
    const user = await requireAuth();

    if (user) {
        await requireUserType('vendor', user);
        await updateProfileCard(user);
        await logoutHandler();
    }
});

export {};
