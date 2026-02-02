/**
 * Security Hardening Utilities
 * 
 * Collection of security enhancement utilities for the platform.
 */

import { createHash } from 'crypto';
import DOMPurify from 'isomorphic-dompurify';

/**
 * PII Masking for Logs
 * Masks sensitive data before logging
 */
export class PIIMasker {
    private static readonly PATTERNS = [
        // Email
        { regex: /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g, replacement: '***@$2' },
        // Phone (Taiwan format)
        { regex: /09\d{8}/g, replacement: '09******XX' },
        // ID Number (Taiwan)
        { regex: /[A-Z][12]\d{8}/gi, replacement: 'X*********' },
        // Credit Card
        { regex: /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/g, replacement: '****-****-****-XXXX' },
        // JWT Token
        { regex: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_.+/=]*/g, replacement: '[JWT_TOKEN]' },
    ];

    static mask(text: string): string {
        let masked = text;
        for (const pattern of this.PATTERNS) {
            masked = masked.replace(pattern.regex, pattern.replacement);
        }
        return masked;
    }

    static maskObject(obj: any): any {
        if (typeof obj === 'string') {
            return this.mask(obj);
        }
        if (Array.isArray(obj)) {
            return obj.map(item => this.maskObject(item));
        }
        if (obj && typeof obj === 'object') {
            const masked: any = {};
            for (const [key, value] of Object.entries(obj)) {
                // Mask sensitive field names entirely
                if (['password', 'token', 'secret', 'apiKey', 'refreshToken'].includes(key)) {
                    masked[key] = '[REDACTED]';
                } else {
                    masked[key] = this.maskObject(value);
                }
            }
            return masked;
        }
        return obj;
    }
}

/**
 * Input Sanitizer
 * Sanitizes user input to prevent XSS
 */
export class InputSanitizer {
    static sanitizeHtml(dirty: string): string {
        return DOMPurify.sanitize(dirty, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
            ALLOWED_ATTR: ['href'],
        });
    }

    static stripHtml(dirty: string): string {
        return DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [] });
    }

    static sanitizeFilename(filename: string): string {
        return filename
            .replace(/[^a-zA-Z0-9._-]/g, '_')
            .replace(/\.{2,}/g, '_')
            .substring(0, 255);
    }
}

/**
 * File Upload Validator
 * Validates uploaded files for security
 */
export class FileUploadValidator {
    private static readonly ALLOWED_MIME_TYPES = new Set([
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
    ]);

    private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

    static validate(file: { mimetype: string; size: number; originalname: string }): { valid: boolean; error?: string } {
        // Check MIME type
        if (!this.ALLOWED_MIME_TYPES.has(file.mimetype)) {
            return { valid: false, error: `不允許的檔案類型: ${file.mimetype}` };
        }

        // Check file size
        if (file.size > this.MAX_FILE_SIZE) {
            return { valid: false, error: `檔案過大: ${(file.size / 1024 / 1024).toFixed(2)}MB (上限 10MB)` };
        }

        // Check filename
        const sanitized = InputSanitizer.sanitizeFilename(file.originalname);
        if (sanitized !== file.originalname) {
            return { valid: false, error: '檔案名稱包含不允許的字元' };
        }

        return { valid: true };
    }
}

/**
 * CSRF Token Generator
 */
export class CSRFToken {
    static generate(): string {
        const buffer = new Uint8Array(32);
        require('crypto').randomFillSync(buffer);
        return Buffer.from(buffer).toString('hex');
    }

    static verify(token: string, storedToken: string): boolean {
        if (!token || !storedToken) return false;
        // Use timing-safe comparison
        const tokenHash = createHash('sha256').update(token).digest('hex');
        const storedHash = createHash('sha256').update(storedToken).digest('hex');
        return require('crypto').timingSafeEqual(
            Buffer.from(tokenHash),
            Buffer.from(storedHash)
        );
    }
}

/**
 * Generic Error Messages
 * Prevents information leakage through error messages
 */
export const GENERIC_ERROR_MESSAGES = {
    AUTH_FAILED: '認證失敗',
    ACCESS_DENIED: '存取被拒',
    NOT_FOUND: '資源不存在',
    VALIDATION_ERROR: '資料驗證失敗',
    SERVER_ERROR: '伺服器錯誤，請稍後再試',
    RATE_LIMITED: '請求過於頻繁',
};
