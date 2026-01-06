/**
 * Two-Factor Authentication Service
 * TOTP-based multi-factor authentication
 */

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface TOTPSecret {
    secret: string;
    otpauth_url: string;
    qrCodeDataUrl?: string;
}

export interface TwoFactorStatus {
    enabled: boolean;
    setupRequired: boolean;
    backupCodesRemaining: number;
}

@Injectable()
export class TwoFactorAuthService {
    private readonly logger = new Logger(TwoFactorAuthService.name);

    // Store secrets temporarily during setup (in production, use database)
    private pendingSecrets: Map<string, string> = new Map();
    private userSecrets: Map<string, string> = new Map();
    private backupCodes: Map<string, string[]> = new Map();

    // ==================== Setup ====================

    /**
     * Generate TOTP secret for user setup
     */
    generateSecret(userId: string, userEmail: string): TOTPSecret {
        const secret = this.generateBase32Secret();
        const issuer = 'Lightkeepers';
        const otpauth_url = `otpauth://totp/${issuer}:${userEmail}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

        // Store pending secret
        this.pendingSecrets.set(userId, secret);

        return {
            secret,
            otpauth_url,
            qrCodeDataUrl: this.generateQRDataUrl(otpauth_url),
        };
    }

    /**
     * Verify and enable 2FA for user
     */
    verifyAndEnable(userId: string, token: string): { success: boolean; backupCodes?: string[] } {
        const secret = this.pendingSecrets.get(userId);

        if (!secret) {
            throw new BadRequestException('No pending 2FA setup found');
        }

        if (!this.verifyToken(secret, token)) {
            throw new BadRequestException('Invalid verification code');
        }

        // Enable 2FA
        this.userSecrets.set(userId, secret);
        this.pendingSecrets.delete(userId);

        // Generate backup codes
        const codes = this.generateBackupCodes();
        this.backupCodes.set(userId, codes);

        this.logger.log(`2FA enabled for user ${userId}`);

        return {
            success: true,
            backupCodes: codes,
        };
    }

    // ==================== Verification ====================

    /**
     * Verify TOTP token for login
     */
    verifyLogin(userId: string, token: string): boolean {
        const secret = this.userSecrets.get(userId);

        if (!secret) {
            return false;
        }

        // Check TOTP
        if (this.verifyToken(secret, token)) {
            return true;
        }

        // Check backup codes
        return this.verifyBackupCode(userId, token);
    }

    /**
     * Check if user has 2FA enabled
     */
    isEnabled(userId: string): boolean {
        return this.userSecrets.has(userId);
    }

    /**
     * Get 2FA status for user
     */
    getStatus(userId: string): TwoFactorStatus {
        const enabled = this.userSecrets.has(userId);
        const setupRequired = this.pendingSecrets.has(userId);
        const codes = this.backupCodes.get(userId) || [];

        return {
            enabled,
            setupRequired,
            backupCodesRemaining: codes.length,
        };
    }

    // ==================== Management ====================

    /**
     * Disable 2FA for user
     */
    disable(userId: string, token: string): boolean {
        if (!this.verifyLogin(userId, token)) {
            throw new BadRequestException('Invalid verification code');
        }

        this.userSecrets.delete(userId);
        this.backupCodes.delete(userId);
        this.logger.log(`2FA disabled for user ${userId}`);

        return true;
    }

    /**
     * Regenerate backup codes
     */
    regenerateBackupCodes(userId: string, token: string): string[] {
        if (!this.verifyLogin(userId, token)) {
            throw new BadRequestException('Invalid verification code');
        }

        const codes = this.generateBackupCodes();
        this.backupCodes.set(userId, codes);

        return codes;
    }

    // ==================== Private Helpers ====================

    private generateBase32Secret(length: number = 20): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        const buffer = crypto.randomBytes(length);
        let secret = '';

        for (let i = 0; i < length; i++) {
            secret += chars[buffer[i] % 32];
        }

        return secret;
    }

    private verifyToken(secret: string, token: string): boolean {
        // Allow for time drift - check current and adjacent time windows
        const windows = [-1, 0, 1];

        for (const offset of windows) {
            const expectedToken = this.generateTOTP(secret, offset);
            if (token === expectedToken) {
                return true;
            }
        }

        return false;
    }

    private generateTOTP(secret: string, windowOffset: number = 0): string {
        const period = 30;
        const time = Math.floor(Date.now() / 1000 / period) + windowOffset;

        // Convert time to 8-byte buffer
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeBigInt64BE(BigInt(time));

        // Decode base32 secret
        const secretBuffer = this.base32Decode(secret);

        // HMAC-SHA1
        const hmac = crypto.createHmac('sha1', secretBuffer);
        hmac.update(timeBuffer);
        const hash = hmac.digest();

        // Dynamic truncation
        const offset = hash[hash.length - 1] & 0x0f;
        const code = (
            ((hash[offset] & 0x7f) << 24) |
            ((hash[offset + 1] & 0xff) << 16) |
            ((hash[offset + 2] & 0xff) << 8) |
            (hash[offset + 3] & 0xff)
        ) % 1000000;

        return code.toString().padStart(6, '0');
    }

    private base32Decode(encoded: string): Buffer {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = 0;
        let value = 0;
        const output: number[] = [];

        for (const char of encoded.toUpperCase()) {
            const index = chars.indexOf(char);
            if (index === -1) continue;

            value = (value << 5) | index;
            bits += 5;

            if (bits >= 8) {
                output.push((value >> (bits - 8)) & 0xff);
                bits -= 8;
            }
        }

        return Buffer.from(output);
    }

    private generateBackupCodes(count: number = 10): string[] {
        const codes: string[] = [];

        for (let i = 0; i < count; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
        }

        return codes;
    }

    private verifyBackupCode(userId: string, code: string): boolean {
        const codes = this.backupCodes.get(userId);
        if (!codes) return false;

        const index = codes.indexOf(code.toUpperCase());
        if (index === -1) return false;

        // Remove used code
        codes.splice(index, 1);
        return true;
    }

    private generateQRDataUrl(otpauth_url: string): string {
        // In production, use a QR library. Here we return the URL for client-side generation
        return `qr:${otpauth_url}`;
    }
}
