import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import { getErrorMessage, hasErrorCode } from '../../../common/utils/error-utils';

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
            let link = await admin.auth().generateEmailVerificationLink(
                email,
                actionCodeSettings || this.getDefaultActionCodeSettings(),
            );

            // 將 Firebase 預設網域替換為自訂網域 lightkeepers.ngo
            link = this.replaceFirebaseDomain(link);

            this.logger.log(`Generated email verification link for ${this.maskEmail(email)}`);
            return link;
        } catch (error) {
            this.logger.error(`Failed to generate email verification link: ${error.message}`);
            throw error;
        }
    }

    /**
     * 將 Firebase 預設網域替換為自訂網域
     * light-keepers-mvp.firebaseapp.com -> lightkeepers.ngo
     */
    private replaceFirebaseDomain(link: string): string {
        return link.replace(
            /https:\/\/light-keepers-mvp\.firebaseapp\.com\/__\/auth\/action/g,
            'https://lightkeepers.ngo/__/auth/action'
        );
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
            let link = await admin.auth().generatePasswordResetLink(
                email,
                actionCodeSettings || this.getDefaultActionCodeSettings(),
            );

            // 將 Firebase 預設網域替換為自訂網域 lightkeepers.ngo
            link = this.replaceFirebaseDomain(link);

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

    /**
     * 刪除 Firebase 用戶
     * @param email 用戶 Email
     */
    async deleteFirebaseUser(email: string): Promise<{ success: boolean; message: string }> {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'Firebase 尚未設定，無法刪除用戶',
            };
        }

        try {
            const user = await this.getFirebaseUser(email);
            if (!user) {
                return {
                    success: true,
                    message: 'Firebase 用戶不存在',
                };
            }

            await admin.auth().deleteUser(user.uid);
            this.logger.log(`Deleted Firebase user for ${this.maskEmail(email)}`);
            return {
                success: true,
                message: 'Firebase 用戶已刪除',
            };
        } catch (error) {
            this.logger.error(`Failed to delete Firebase user: ${error.message}`);
            return {
                success: false,
                message: `刪除失敗: ${error.message}`,
            };
        }
    }

    /**
     * 根據 UID 刪除 Firebase 用戶
     * @param uid Firebase UID
     */
    async deleteFirebaseUserByUid(uid: string): Promise<{ success: boolean; message: string }> {
        if (!this.isConfigured()) {
            return {
                success: false,
                message: 'Firebase 尚未設定，無法刪除用戶',
            };
        }

        try {
            await admin.auth().deleteUser(uid);
            this.logger.log(`Deleted Firebase user with UID: ${uid.substring(0, 8)}...`);
            return {
                success: true,
                message: 'Firebase 用戶已刪除',
            };
        } catch (error: unknown) {
            if (hasErrorCode(error, 'auth/user-not-found')) {
                return {
                    success: true,
                    message: 'Firebase 用戶不存在',
                };
            }
            this.logger.error(`Failed to delete Firebase user by UID: ${getErrorMessage(error)}`);
            return {
                success: false,
                message: `刪除失敗: ${getErrorMessage(error)}`,
            };
        }
    }

    // =========================================
    // FCM Push Notification Methods
    // =========================================

    /**
     * 發送 FCM 推播通知到單一裝置
     */
    async sendPushNotification(
        fcmToken: string,
        title: string,
        body: string,
        data?: Record<string, string>,
        imageUrl?: string,
    ): Promise<{ success: boolean; messageId?: string; error?: string }> {
        if (!this.isConfigured()) {
            this.logger.warn('Firebase not configured - cannot send push notification');
            return { success: false, error: 'Firebase not configured' };
        }

        try {
            const message: admin.messaging.Message = {
                token: fcmToken,
                notification: {
                    title,
                    body,
                    imageUrl,
                },
                data: data || {},
                android: {
                    priority: 'high',
                    notification: {
                        channelId: 'lightkeepers_alerts',
                        priority: 'max',
                        defaultSound: true,
                        defaultVibrateTimings: true,
                    },
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                        },
                    },
                },
                webpush: {
                    notification: {
                        icon: '/icons/icon-192x192.png',
                        badge: '/icons/icon-72x72.png',
                    },
                },
            };

            const messageId = await admin.messaging().send(message);
            this.logger.log(`FCM push sent: ${messageId}`);
            return { success: true, messageId };
        } catch (error: unknown) {
            this.logger.error(`FCM push failed: ${getErrorMessage(error)}`);

            // 處理無效 Token 錯誤
            if (hasErrorCode(error, 'messaging/invalid-registration-token') ||
                hasErrorCode(error, 'messaging/registration-token-not-registered')) {
                return { success: false, error: 'invalid_token' };
            }

            return { success: false, error: getErrorMessage(error) };
        }
    }

    /**
     * 發送 FCM 推播通知到多個裝置
     */
    async sendMulticastPush(
        fcmTokens: string[],
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<{ successCount: number; failureCount: number; invalidTokens: string[] }> {
        if (!this.isConfigured() || fcmTokens.length === 0) {
            return { successCount: 0, failureCount: 0, invalidTokens: [] };
        }

        try {
            const message: admin.messaging.MulticastMessage = {
                tokens: fcmTokens,
                notification: {
                    title,
                    body,
                },
                data: data || {},
                android: {
                    priority: 'high',
                },
                apns: {
                    payload: {
                        aps: {
                            sound: 'default',
                        },
                    },
                },
            };

            const response = await admin.messaging().sendEachForMulticast(message);

            // 收集無效的 Token
            const invalidTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success && resp.error) {
                    const errorCode = resp.error.code;
                    if (errorCode === 'messaging/invalid-registration-token' ||
                        errorCode === 'messaging/registration-token-not-registered') {
                        invalidTokens.push(fcmTokens[idx]);
                    }
                }
            });

            this.logger.log(`FCM multicast: ${response.successCount} success, ${response.failureCount} failed`);

            return {
                successCount: response.successCount,
                failureCount: response.failureCount,
                invalidTokens,
            };
        } catch (error: unknown) {
            this.logger.error(`FCM multicast failed: ${getErrorMessage(error)}`);
            return { successCount: 0, failureCount: fcmTokens.length, invalidTokens: [] };
        }
    }

    /**
     * 發送 FCM 推播到訂閱主題的所有裝置
     */
    async sendTopicPush(
        topic: string,
        title: string,
        body: string,
        data?: Record<string, string>,
    ): Promise<{ success: boolean; messageId?: string }> {
        if (!this.isConfigured()) {
            return { success: false };
        }

        try {
            const message: admin.messaging.Message = {
                topic,
                notification: {
                    title,
                    body,
                },
                data: data || {},
            };

            const messageId = await admin.messaging().send(message);
            this.logger.log(`FCM topic push sent to '${topic}': ${messageId}`);
            return { success: true, messageId };
        } catch (error: unknown) {
            this.logger.error(`FCM topic push failed: ${getErrorMessage(error)}`);
            return { success: false };
        }
    }

    /**
     * 訂閱使用者裝置到主題
     */
    async subscribeToTopic(fcmTokens: string[], topic: string): Promise<boolean> {
        if (!this.isConfigured() || fcmTokens.length === 0) {
            return false;
        }

        try {
            await admin.messaging().subscribeToTopic(fcmTokens, topic);
            this.logger.log(`Subscribed ${fcmTokens.length} tokens to topic '${topic}'`);
            return true;
        } catch (error: unknown) {
            this.logger.error(`Failed to subscribe to topic: ${getErrorMessage(error)}`);
            return false;
        }
    }

    /**
     * 取消訂閱主題
     */
    async unsubscribeFromTopic(fcmTokens: string[], topic: string): Promise<boolean> {
        if (!this.isConfigured() || fcmTokens.length === 0) {
            return false;
        }

        try {
            await admin.messaging().unsubscribeFromTopic(fcmTokens, topic);
            this.logger.log(`Unsubscribed ${fcmTokens.length} tokens from topic '${topic}'`);
            return true;
        } catch (error: unknown) {
            this.logger.error(`Failed to unsubscribe from topic: ${getErrorMessage(error)}`);
            return false;
        }
    }
}
