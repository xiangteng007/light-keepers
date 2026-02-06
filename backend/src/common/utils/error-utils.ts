/**
 * Error Handling Utilities
 * Provides type-safe error handling helpers for catch blocks
 */

/**
 * Safely extracts error message from unknown error type
 * @param error - The caught error (unknown type)
 * @returns A string message from the error
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'string') {
        return error;
    }
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message: unknown }).message);
    }
    return 'Unknown error occurred';
}

/**
 * Safely extracts error stack from unknown error type
 * @param error - The caught error (unknown type)
 * @returns The error stack trace or undefined
 */
export function getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) {
        return error.stack;
    }
    return undefined;
}

/**
 * Checks if error has a specific code property (common in Firebase/HTTP errors)
 * @param error - The caught error (unknown type)
 * @param code - The error code to check for
 */
export function hasErrorCode(error: unknown, code: string): boolean {
    if (error && typeof error === 'object' && 'code' in error) {
        return (error as { code: unknown }).code === code;
    }
    return false;
}

/**
 * Gets error code if present
 * @param error - The caught error (unknown type)
 */
export function getErrorCode(error: unknown): string | undefined {
    if (error && typeof error === 'object' && 'code' in error) {
        const code = (error as { code: unknown }).code;
        return typeof code === 'string' ? code : undefined;
    }
    return undefined;
}
