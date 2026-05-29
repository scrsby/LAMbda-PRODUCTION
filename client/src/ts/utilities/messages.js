export function showErrorMessage(message, errorId = 'error-message', successId = 'success-message') {
    const errorDiv = document.getElementById(errorId);
    const successDiv = document.getElementById(successId);

    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }

    if (successDiv) {
        successDiv.style.display = 'none';
    }
}

export function showSuccessMessage(message, errorId = 'error-message', successId = 'success-message') {
    const errorDiv = document.getElementById(errorId);
    const successDiv = document.getElementById(successId);

    if (errorDiv) {
        errorDiv.style.display = 'none';
    }

    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
    }
}