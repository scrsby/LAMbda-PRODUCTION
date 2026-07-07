export function isValidPassword(password: string) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d!@#$%^&*]).{8,}$/;
    return regex.test(password);
}

export function isValidVendorId(booth: number) {
    return /^\d{1,3}$/.test(booth.toString());
}

export function isValidUsername(username: string) {
    const regex = /^[a-zA-Z0-9]{3,20}$/;
    return regex.test(username);
}

export function isValidEmail(email: string) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}