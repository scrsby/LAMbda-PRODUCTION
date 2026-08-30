export function isValidPassword(password) {
    const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[\d!@#$%^&*]).{8,}$/;
    return regex.test(password);
}
export function isValidVendorId(booth) {
    return /^\d{1,3}$/.test(booth.toString());
}
export function isValidUsername(username) {
    const regex = /^[a-zA-Z0-9]{3,20}$/;
    return regex.test(username);
}
export function isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}
//# sourceMappingURL=form-validation.js.map