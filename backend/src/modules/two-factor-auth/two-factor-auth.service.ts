import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Two-Factor Authentication Service
 * TOTP-based 2FA
 */
@Injectable()
export class TwoFactorAuthService {
    private readonly logger = new Logger(TwoFactorAuthService.name);
    private secrets: Map<string, TotpSecret> = new Map();

    /**
     * 產生 TOTP Secret
     */
    generateSecret(userId: string): TotpSetup {
        const secret = this.generateRandomSecret();
        const issuer = 'LightKeepers';
        const accountName = userId;

        const otpauthUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;

        this.secrets.set(userId, { secret, enabled: false, createdAt: new Date() });

        return {
            secret,
            otpauthUrl,
            qrCodeUrl: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpauthUrl)}`,
        };
    }

    /**
     * 驗證 TOTP
     */
    verifyToken(userId: string, token: string): VerifyResult {
        const secretData = this.secrets.get(userId);
        if (!secretData) {
            return { valid: false, error: 'User not found' };
        }

        const expectedToken = this.generateTotp(secretData.secret);
        const previousToken = this.generateTotp(secretData.secret, -1);
        const nextToken = this.generateTotp(secretData.secret, 1);

        const valid = token === expectedToken || token === previousToken || token === nextToken;

        return { valid, timestamp: new Date() };
    }

    /**
     * 啟用 2FA
     */
    enableTwoFactor(userId: string, token: string): EnableResult {
        const result = this.verifyToken(userId, token);
        if (!result.valid) {
            return { success: false, error: 'Invalid token' };
        }

        const secretData = this.secrets.get(userId);
        if (secretData) {
            secretData.enabled = true;
            secretData.enabledAt = new Date();
        }

        // 產生備用碼
        const backupCodes = this.generateBackupCodes();

        return { success: true, backupCodes };
    }

    /**
     * 停用 2FA
     */
    disableTwoFactor(userId: string, token: string): boolean {
        const result = this.verifyToken(userId, token);
        if (!result.valid) return false;

        this.secrets.delete(userId);
        return true;
    }

    /**
     * 檢查是否啟用
     */
    isTwoFactorEnabled(userId: string): boolean {
        const secretData = this.secrets.get(userId);
        return secretData?.enabled || false;
    }

    /**
     * 驗證備用碼
     */
    verifyBackupCode(userId: string, code: string): boolean {
        const secretData = this.secrets.get(userId);
        if (!secretData?.backupCodes) return false;

        const index = secretData.backupCodes.indexOf(code);
        if (index === -1) return false;

        // 使用後移除
        secretData.backupCodes.splice(index, 1);
        return true;
    }

    /**
     * 重新產生備用碼
     */
    regenerateBackupCodes(userId: string, token: string): string[] | null {
        const result = this.verifyToken(userId, token);
        if (!result.valid) return null;

        const secretData = this.secrets.get(userId);
        if (!secretData) return null;

        const newCodes = this.generateBackupCodes();
        secretData.backupCodes = newCodes;

        return newCodes;
    }

    private generateRandomSecret(): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let result = '';
        for (let i = 0; i < 32; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    private generateTotp(secret: string, offset: number = 0): string {
        const time = Math.floor(Date.now() / 30000) + offset;
        const timeBuffer = Buffer.alloc(8);
        timeBuffer.writeBigInt64BE(BigInt(time));

        const decodedSecret = this.base32Decode(secret);
        const hmac = crypto.createHmac('sha1', decodedSecret);
        hmac.update(timeBuffer);
        const hash = hmac.digest();

        const offset2 = hash[hash.length - 1] & 0xf;
        const binary = ((hash[offset2] & 0x7f) << 24) |
            ((hash[offset2 + 1] & 0xff) << 16) |
            ((hash[offset2 + 2] & 0xff) << 8) |
            (hash[offset2 + 3] & 0xff);

        return String(binary % 1000000).padStart(6, '0');
    }

    private base32Decode(str: string): Buffer {
        const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
        let bits = 0;
        let value = 0;
        let output = [];

        for (const char of str.toUpperCase()) {
            const idx = alphabet.indexOf(char);
            if (idx === -1) continue;

            value = (value << 5) | idx;
            bits += 5;

            if (bits >= 8) {
                output.push((value >>> (bits - 8)) & 0xff);
                bits -= 8;
            }
        }

        return Buffer.from(output);
    }

    private generateBackupCodes(): string[] {
        const codes: string[] = [];
        for (let i = 0; i < 10; i++) {
            codes.push(crypto.randomBytes(4).toString('hex').toUpperCase());
        }
        return codes;
    }
}

// Types
interface TotpSecret { secret: string; enabled: boolean; createdAt: Date; enabledAt?: Date; backupCodes?: string[]; }
interface TotpSetup { secret: string; otpauthUrl: string; qrCodeUrl: string; }
interface VerifyResult { valid: boolean; error?: string; timestamp?: Date; }
interface EnableResult { success: boolean; backupCodes?: string[]; error?: string; }
