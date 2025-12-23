import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * 加密工具 - 用於保護志工敏感個資
 * 使用 AES-256-GCM 加密
 */
export class CryptoUtil {
    private static getKey(): Buffer {
        const key = process.env.ENCRYPTION_KEY;
        if (!key) {
            // 開發環境使用預設金鑰 (生產環境必須設定)
            console.warn('⚠️ ENCRYPTION_KEY not set, using development key');
            return crypto.scryptSync('dev-key-not-for-production', 'salt', 32);
        }
        // 確保金鑰為 32 bytes
        return crypto.scryptSync(key, 'light-keepers-salt', 32);
    }

    /**
     * 加密字串
     */
    static encrypt(text: string): string {
        if (!text) return text;

        const key = this.getKey();
        const iv = crypto.randomBytes(IV_LENGTH);
        const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        // 格式: iv:authTag:encrypted
        return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    }

    /**
     * 解密字串
     */
    static decrypt(encryptedText: string): string {
        if (!encryptedText || !encryptedText.includes(':')) {
            return encryptedText; // 未加密的資料直接返回
        }

        try {
            const key = this.getKey();
            const parts = encryptedText.split(':');

            if (parts.length !== 3) {
                return encryptedText; // 格式不對，可能是未加密資料
            }

            const iv = Buffer.from(parts[0], 'hex');
            const authTag = Buffer.from(parts[1], 'hex');
            const encrypted = parts[2];

            const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            console.error('Decryption failed:', error.message);
            return encryptedText; // 解密失敗返回原值
        }
    }

    /**
     * 電話號碼遮罩 (保留後4碼)
     */
    static maskPhone(phone: string): string {
        if (!phone || phone.length < 4) return '****';
        return phone.slice(0, -4).replace(/./g, '*') + phone.slice(-4);
    }

    /**
     * LINE User ID Token 化 (單向 Hash)
     */
    static hashLineUserId(lineUserId: string): string {
        if (!lineUserId) return '';
        return crypto
            .createHash('sha256')
            .update(lineUserId + 'light-keepers-line-salt')
            .digest('hex')
            .substring(0, 32); // 取前 32 字元
    }

    /**
     * GPS 座標模糊化 (降低精度至約 100m)
     */
    static fuzzyCoordinate(coordinate: number): number {
        if (coordinate === null || coordinate === undefined) return coordinate;
        // 保留小數點後 3 位 (約 111m 精度)
        return Math.round(coordinate * 1000) / 1000;
    }
}

/**
 * TypeORM Column Transformer - 自動加解密
 */
export const EncryptedColumnTransformer = {
    to: (value: string) => CryptoUtil.encrypt(value),
    from: (value: string) => CryptoUtil.decrypt(value),
};
