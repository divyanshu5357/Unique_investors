export interface PasswordValidationResult {
    isValid: boolean;
    errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
    const errors: string[] = [];
    
    // Check minimum length
    if (password.length < 8) {
        errors.push("Password must be at least 8 characters long");
    }

    // Check for allowed characters (only letters and numbers)
    if (!/^[a-zA-Z0-9]+$/.test(password)) {
        errors.push("Password can only contain letters and numbers (no special characters or spaces)");
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}