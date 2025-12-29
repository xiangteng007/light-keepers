import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

/**
 * Firebase Admin 服務
 * 提供 Firebase Authentication 的郵件功能
 */
@Injectable()
export class FirebaseAdminService implements OnModuleInit {
    private readonly logger = new Logger(FirebaseAdminService.name);
    private app: admin.app.App | null = null;
    private isInitialized = false;

    constructor(private configService: ConfigService) { }

    async onModuleInit() {
        await this.initialize();
    }

    /**
     * 初始化 Firebase Admin SDK
     */
    private async initialize(): Promise<void> {
        try {
            // 檢查是否已初始化
            if (admin.apps.length > 0) {
                this.app = admin.apps[0];
                this.isInitialized = true;
                this.logger.log('Firebase Admin SDK already initialized');
                return;
            }

            // 嘗試從環境變數獲取 service account
            const serviceAccountJson = this.configService.get('FIREBASE_SERVICE_ACCOUNT');

            if (serviceAccountJson) {
                const serviceAccount = JSON.parse(serviceAccountJson);
                this.app = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
                this.isInitialized = true;
                this.logger.log('Firebase Admin SDK initialized with service account');
            } else {
                // 嘗試使用 Application Default Credentials（Cloud Run 環境）
                try {
                    this.app = admin.initializeApp({
                        credential: admin.credential.applicationDefault(),
                    });
                    this.isInitialized = true;
                    this.logger.log('Firebase Admin SDK initialized with application default credentials');
                } catch (adcError) {
                    this.logger.warn('Firebase Admin SDK not configured - email features will be disabled');
                }
            }
        } catch (error) {
            this.logger.error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
        }
    }

    /**
     * 檢查 Firebase 是否已初始化
     */
    isConfigured(): boolean {
        return this.isInitialized && this.app !== null;
    }

    /**
     * 生成 Email 驗證連結
     * @param email 用戶 Email
     * @param actionCodeSettings 操作碼設定（可選）
     */
    async generateEmailVerificationLink(
        email: string,
        actionCodeSettings?: admin.auth.ActionCodeSettings,
    ): Promise<string | null> {
        if (!this.isConfigured()) {
            this.logger.warn('Firebase not configured - cannot generate email verification link');
            return null;
        }

        try {
            const link = await admin.auth().generateEmailVerificationLink(
                email,
                actionCodeSettings || this.getDefaultActionCodeSettings(),
            );
            this.logger.log(`Generated email verification link for ${this.maskEmail(email)}`);
            return link;
        } catch (error) {
            this.logger.error(`Failed to generate email verification link: ${error.message}`);
            throw error;
        }
    }

    /**
     * 生成密碼重設連結
     * @param email 用戶 Email
     * @param actionCodeSettings 操作碼設定（可選）
     */
    async generatePasswordResetLink(
        email: string,
        actionCodeSettings?: admin.auth.ActionCodeSettings,
    ): Promise<string | null> {
        if (!this.isConfigured()) {
            this.logger.warn('Firebase not configured - cannot generate password reset link');
            return null;
        }

        try {
            const link = await admin.auth().generatePasswordResetLink(
                email,
                actionCodeSettings || this.getDefaultActionCodeSettings(),
            );
            this.logger.log(`Generated password reset link for ${this.maskEmail(email)}`);
            return link;
        } catch (error) {
            this.logger.error(`Failed to generate password reset link: ${error.message}`);
            throw error;
        }
    }

    /**
     * 生成 Email 變更連結
     * @param email 當前 Email
     * @param newEmail 新 Email
     * @param actionCodeSettings 操作碼設定（可選）
     */
    async generateEmailUpdateLink(
        email: string,
        newEmail: string,
        actionCodeSettings?: admin.auth.ActionCodeSettings,
    ): Promise<string | null> {
        if (!this.isConfigured()) {
            this.logger.warn('Firebase not configured - cannot generate email update link');
            return null;
        }

        try {
            const link = await admin.auth().generateVerifyAndChangeEmailLink(
                email,
                newEmail,
                actionCodeSettings || this.getDefaultActionCodeSettings(),
            );
            this.logger.log(`Generated email update link for ${this.maskEmail(email)} -> ${this.maskEmail(newEmail)}`);
            return link;
        } catch (error) {
            this.logger.error(`Failed to generate email update link: ${error.message}`);
            throw error;
        }
    }

    /**
     * 在 Firebase 中創建用戶（用於同步）
     * @param email 用戶 Email
     * @param password 密碼（可選）
     */
    async createFirebaseUser(
        email: string,
        password?: string,
        displayName?: string,
    ): Promise<admin.auth.UserRecord | null> {
        if (!this.isConfigured()) {
            this.logger.warn('Firebase not configured - cannot create Firebase user');
            return null;
        }

        try {
            // 先檢查用戶是否已存在
            try {
                const existingUser = await admin.auth().getUserByEmail(email);
                this.logger.log(`Firebase user already exists for ${this.maskEmail(email)}`);
                return existingUser;
            } catch (getUserError: any) {
                if (getUserError.code !== 'auth/user-not-found') {
                    throw getUserError;
                }
            }

            // 創建新用戶
            const userRecord = await admin.auth().createUser({
                email,
                password: password || undefined,
                displayName: displayName || undefined,
                emailVerified: false,
            });
            this.logger.log(`Created Firebase user for ${this.maskEmail(email)}`);
            return userRecord;
        } catch (error) {
            this.logger.error(`Failed to create Firebase user: ${error.message}`);
            throw error;
        }
    }

    /**
     * 發送 Email 驗證信
     * 使用 Firebase 的內建郵件系統
     */
    async sendEmailVerification(email: string): Promise<{ success: boolean; link?: string; message: string }> {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'Firebase 尚未設定，無法發送驗證信',
            };
        }

        try {
            // 確保 Firebase 中有此用戶
            await this.createFirebaseUser(email);

            // 生成驗證連結
            const link = await this.generateEmailVerificationLink(email);

            if (link) {
                return {
                    success: true,
                    link,
                    message: '驗證連結已生成',
                };
            }

            return {
                success: false,
                message: '無法生成驗證連結',
            };
        } catch (error) {
            this.logger.error(`Failed to send email verification: ${error.message}`);
            return {
                success: false,
                message: `發送失敗: ${error.message}`,
            };
        }
    }

    /**
     * 發送密碼重設信
     * 使用 Firebase 的內建郵件系統
     */
    async sendPasswordReset(email: string): Promise<{ success: boolean; link?: string; message: string }> {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'Firebase 尚未設定，無法發送重設密碼信',
            };
        }

        try {
            // 確保 Firebase 中有此用戶
            await this.createFirebaseUser(email);

            // 生成重設連結
            const link = await this.generatePasswordResetLink(email);

            if (link) {
                return {
                    success: true,
                    link,
                    message: '密碼重設連結已生成',
                };
            }

            return {
                success: false,
                message: '無法生成重設連結',
            };
        } catch (error) {
            this.logger.error(`Failed to send password reset: ${error.message}`);
            return {
                success: false,
                message: `發送失敗: ${error.message}`,
            };
        }
    }

    /**
     * 獲取默認的 ActionCodeSettings
     */
    private getDefaultActionCodeSettings(): admin.auth.ActionCodeSettings {
        const baseUrl = this.configService.get('FRONTEND_URL') || 'https://lightkeepers.ngo';

        return {
            url: `${baseUrl}/auth/action`,
            handleCodeInApp: true,
        };
    }

    /**
     * 遮蔽 Email 用於 log
     */
    private maskEmail(email: string): string {
        const [localPart, domain] = email.split('@');
        if (localPart && domain) {
            const maskedLocal = localPart.length > 2
                ? localPart.substring(0, 2) + '***'
                : '***';
            return `${maskedLocal}@${domain}`;
        }
        return '***@***';
    }

    /**
     * 驗證 Firebase ID Token（用於驗證用戶操作）
     */
    async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken | null> {
        if (!this.isConfigured()) {
            return null;
        }

        try {
            return await admin.auth().verifyIdToken(idToken);
        } catch (error) {
            this.logger.error(`Failed to verify ID token: ${error.message}`);
            return null;
        }
    }

    /**
     * 獲取 Firebase 用戶資訊
     */
    async getFirebaseUser(email: string): Promise<admin.auth.UserRecord | null> {
        if (!this.isConfigured()) {
            return null;
        }

        try {
            return await admin.auth().getUserByEmail(email);
        } catch (error) {
            if ((error as any).code === 'auth/user-not-found') {
                return null;
            }
            this.logger.error(`Failed to get Firebase user: ${error.message}`);
            throw error;
        }
    }

    /**
     * 檢查 Email 是否已在 Firebase 中驗證
     */
    async isEmailVerified(email: string): Promise<boolean> {
        const user = await this.getFirebaseUser(email);
        return user?.emailVerified ?? false;
    }

    /**
     * 更新 Firebase 用戶的 Email 驗證狀態
     */
    async setEmailVerified(email: string, verified: boolean): Promise<boolean> {
        if (!this.isConfigured()) {
            return false;
        }

        try {
            const user = await this.getFirebaseUser(email);
            if (!user) {
                return false;
            }

            await admin.auth().updateUser(user.uid, {
                emailVerified: verified,
            });
            return true;
        } catch (error) {
            this.logger.error(`Failed to set email verified: ${error.message}`);
            return false;
        }
    }
}
