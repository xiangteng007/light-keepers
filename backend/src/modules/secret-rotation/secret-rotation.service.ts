import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';

/**
 * Secret Rotation Service
 * Automated credential rotation for security compliance
 */
@Injectable()
export class SecretRotationService {
    private readonly logger = new Logger(SecretRotationService.name);
    private secrets: Map<string, SecretEntry> = new Map();

    constructor(private configService: ConfigService) {
        this.initializeSecrets();
    }

    private initializeSecrets() {
        // 註冊需要輪替的金鑰
        this.registerSecret('JWT_SECRET', 90);
        this.registerSecret('DB_PASSWORD', 180);
        this.registerSecret('API_KEYS', 30);
        this.registerSecret('ENCRYPTION_KEY', 365);
    }

    /**
     * 註冊金鑰
     */
    registerSecret(name: string, rotationDays: number): void {
        this.secrets.set(name, {
            name,
            rotationDays,
            lastRotated: new Date(),
            nextRotation: new Date(Date.now() + rotationDays * 24 * 3600000),
            status: 'active',
        });
    }

    /**
     * 檢查並輪替到期金鑰
     */
    @Cron('0 0 * * *') // 每天午夜
    async checkAndRotate(): Promise<RotationResult[]> {
        const results: RotationResult[] = [];
        const now = new Date();

        for (const [name, secret] of this.secrets) {
            if (now >= secret.nextRotation) {
                const result = await this.rotateSecret(name);
                results.push(result);
            }
        }

        if (results.length > 0) {
            this.logger.log(`Rotated ${results.length} secrets`);
        }

        return results;
    }

    /**
     * 輪替特定金鑰
     */
    async rotateSecret(name: string): Promise<RotationResult> {
        const secret = this.secrets.get(name);
        if (!secret) {
            return { name, success: false, error: 'Secret not found' };
        }

        try {
            // TODO: 實際輪替邏輯 (Cloud Secret Manager API)
            // 1. 產生新金鑰
            // 2. 更新 Secret Manager
            // 3. 通知相關服務重載

            const newVersion = `v${Date.now()}`;

            secret.lastRotated = new Date();
            secret.nextRotation = new Date(Date.now() + secret.rotationDays * 24 * 3600000);
            secret.status = 'active';

            this.logger.log(`Secret ${name} rotated to ${newVersion}`);

            return { name, success: true, newVersion, rotatedAt: new Date() };
        } catch (error) {
            secret.status = 'error';
            this.logger.error(`Failed to rotate ${name}`, error);
            return { name, success: false, error: String(error) };
        }
    }

    /**
     * 取得金鑰狀態
     */
    getSecretStatus(): SecretStatus[] {
        const now = new Date();
        return Array.from(this.secrets.values()).map((s) => ({
            name: s.name,
            status: s.status,
            lastRotated: s.lastRotated,
            nextRotation: s.nextRotation,
            daysUntilRotation: Math.ceil((s.nextRotation.getTime() - now.getTime()) / (24 * 3600000)),
            needsRotation: now >= s.nextRotation,
        }));
    }

    /**
     * 強制立即輪替
     */
    async forceRotate(names: string[]): Promise<RotationResult[]> {
        return Promise.all(names.map((name) => this.rotateSecret(name)));
    }

    /**
     * 產生安全金鑰
     */
    generateSecureKey(length: number = 32): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}

// Types
interface SecretEntry {
    name: string; rotationDays: number; lastRotated: Date;
    nextRotation: Date; status: 'active' | 'rotating' | 'error';
}
interface RotationResult { name: string; success: boolean; newVersion?: string; rotatedAt?: Date; error?: string; }
interface SecretStatus {
    name: string; status: string; lastRotated: Date;
    nextRotation: Date; daysUntilRotation: number; needsRotation: boolean;
}
