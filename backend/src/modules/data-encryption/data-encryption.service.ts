import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

/**
 * Data Encryption Service
 * Field-level encryption for sensitive data
 */
@Injectable()
export class DataEncryptionService {
    private readonly logger = new Logger(DataEncryptionService.name);
    private readonly algorithm = 'aes-256-gcm';
    private encryptionKey: Buffer;

    constructor() {
        // 從環境變數或產生預設金鑰
        const keyHex = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
        this.encryptionKey = Buffer.from(keyHex, 'hex');
    }

    /**
     * 加密字串
     */
    encrypt(plaintext: string): EncryptedData {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

        let encrypted = cipher.update(plaintext, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            ciphertext: encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
        };
    }

    /**
     * 解密字串
     */
    decrypt(data: EncryptedData): string {
        const decipher = crypto.createDecipheriv(
            this.algorithm,
            this.encryptionKey,
            Buffer.from(data.iv, 'hex'),
        );

        decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));

        let decrypted = decipher.update(data.ciphertext, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    /**
     * 加密物件
     */
    encryptObject(obj: Record<string, any>, fieldsToEncrypt: string[]): Record<string, any> {
        const result = { ...obj };

        for (const field of fieldsToEncrypt) {
            if (result[field] !== undefined && result[field] !== null) {
                const encrypted = this.encrypt(String(result[field]));
                result[field] = `ENC:${encrypted.iv}:${encrypted.authTag}:${encrypted.ciphertext}`;
            }
        }

        return result;
    }

    /**
     * 解密物件
     */
    decryptObject(obj: Record<string, any>, fieldsToDecrypt: string[]): Record<string, any> {
        const result = { ...obj };

        for (const field of fieldsToDecrypt) {
            const value = result[field];
            if (typeof value === 'string' && value.startsWith('ENC:')) {
                const [_, iv, authTag, ciphertext] = value.split(':');
                result[field] = this.decrypt({ ciphertext, iv, authTag });
            }
        }

        return result;
    }

    /**
     * 雜湊 (不可逆)
     */
    hash(data: string, salt?: string): string {
        const hashSalt = salt || crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(data, hashSalt, 100000, 64, 'sha512').toString('hex');
        return `${hashSalt}:${hash}`;
    }

    /**
     * 驗證雜湊
     */
    verifyHash(data: string, hashedValue: string): boolean {
        const [salt, originalHash] = hashedValue.split(':');
        const hash = crypto.pbkdf2Sync(data, salt, 100000, 64, 'sha512').toString('hex');
        return hash === originalHash;
    }

    /**
     * 產生安全 Token
     */
    generateSecureToken(length: number = 32): string {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * 屏蔽敏感資料
     */
    mask(data: string, visibleChars: number = 4): string {
        if (data.length <= visibleChars) return '*'.repeat(data.length);
        return '*'.repeat(data.length - visibleChars) + data.slice(-visibleChars);
    }

    /**
     * 屏蔽電話
     */
    maskPhone(phone: string): string {
        if (phone.length < 6) return this.mask(phone);
        return phone.slice(0, 3) + '****' + phone.slice(-3);
    }

    /**
     * 屏蔽 Email
     */
    maskEmail(email: string): string {
        const [local, domain] = email.split('@');
        if (!domain) return this.mask(email);
        const maskedLocal = local.length > 2 ? local[0] + '***' + local.slice(-1) : '***';
        return `${maskedLocal}@${domain}`;
    }
}

// Types
interface EncryptedData { ciphertext: string; iv: string; authTag: string; }
