/**
 * Utility functions for class name merging
 * Simplified version without tailwind-merge dependency for now
 */

export function cn(...inputs: (string | undefined | null | false)[]) {
    return inputs.filter(Boolean).join(" ");
}
