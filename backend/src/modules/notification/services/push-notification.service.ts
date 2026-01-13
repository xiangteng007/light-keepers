/**
 * Push Notification Service
 * 
 * Firebase Cloud Messaging and LINE Notify integration
 * v1.0: Web push subscriptions, FCM messaging, LINE Notify
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account } from '../../accounts/entities/account.entity';
import axios from 'axios';

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface NotificationPayload {
    title: string;
    body: string;
    icon?: string;
    badge?: string;
    tag?: string;
    data?: Record<string, any>;
    actions?: { action: string; title: string; icon?: string }[];
}

export interface LineNotifyPayload {
    message: string;
    imageThumbnail?: string;
    imageFullsize?: string;
    stickerPackageId?: number;
    stickerId?: number;
}

@Injectable()
export class PushNotificationService {
    private readonly logger = new Logger(PushNotificationService.name);

    // FCM Configuration
    private readonly fcmServerKey: string;
    private readonly fcmConfigured: boolean;

    // LINE Notify Configuration
    private readonly lineNotifyTokens: Map<string, string> = new Map();
    private readonly lineNotifyConfigured: boolean;

    // VAPID for Web Push
    private readonly vapidPublicKey: string;
    private readonly vapidPrivateKey: string;

    constructor(
        private readonly configService: ConfigService,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) {
        this.fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY', '');
        this.fcmConfigured = !!this.fcmServerKey;

        this.vapidPublicKey = this.configService.get<string>('VAPID_PUBLIC_KEY', '');
        this.vapidPrivateKey = this.configService.get<string>('VAPID_PRIVATE_KEY', '');
        this.lineNotifyConfigured = false; // Will be set per-user

        if (!this.fcmConfigured) {
            this.logger.warn('FCM not configured - push notifications will be mocked');
        }
    }

    // ===== Firebase Cloud Messaging =====

    /**
     * Send push notification to a single device
     */
    async sendToDevice(fcmToken: string, payload: NotificationPayload): Promise<boolean> {
        if (!this.fcmConfigured) {
            this.logger.log(`[MOCK] Push notification sent to token: ${fcmToken.substring(0, 20)}...`);
            return true;
        }

        try {
            const response = await axios.post(
                'https://fcm.googleapis.com/fcm/send',
                {
                    to: fcmToken,
                    notification: {
                        title: payload.title,
                        body: payload.body,
                        icon: payload.icon || '/icons/icon-192.png',
                        badge: payload.badge || '/icons/badge-72.png',
                        tag: payload.tag,
                    },
                    data: payload.data,
                    webpush: {
                        fcm_options: {
                            link: payload.data?.url || '/',
                        },
                    },
                },
                {
                    headers: {
                        Authorization: `key=${this.fcmServerKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            this.logger.log(`Push notification sent successfully`);
            return response.data.success === 1;
        } catch (error: any) {
            this.logger.error(`FCM send failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Send push notification to multiple devices
     */
    async sendToDevices(fcmTokens: string[], payload: NotificationPayload): Promise<{ success: number; failure: number }> {
        if (!this.fcmConfigured) {
            this.logger.log(`[MOCK] Push notification sent to ${fcmTokens.length} devices`);
            return { success: fcmTokens.length, failure: 0 };
        }

        try {
            const response = await axios.post(
                'https://fcm.googleapis.com/fcm/send',
                {
                    registration_ids: fcmTokens,
                    notification: {
                        title: payload.title,
                        body: payload.body,
                        icon: payload.icon || '/icons/icon-192.png',
                    },
                    data: payload.data,
                },
                {
                    headers: {
                        Authorization: `key=${this.fcmServerKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return {
                success: response.data.success || 0,
                failure: response.data.failure || 0,
            };
        } catch (error: any) {
            this.logger.error(`FCM multicast failed: ${error.message}`);
            return { success: 0, failure: fcmTokens.length };
        }
    }

    /**
     * Send to topic
     */
    async sendToTopic(topic: string, payload: NotificationPayload): Promise<boolean> {
        if (!this.fcmConfigured) {
            this.logger.log(`[MOCK] Push notification sent to topic: ${topic}`);
            return true;
        }

        try {
            await axios.post(
                'https://fcm.googleapis.com/fcm/send',
                {
                    to: `/topics/${topic}`,
                    notification: {
                        title: payload.title,
                        body: payload.body,
                        icon: payload.icon || '/icons/icon-192.png',
                    },
                    data: payload.data,
                },
                {
                    headers: {
                        Authorization: `key=${this.fcmServerKey}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            return true;
        } catch (error: any) {
            this.logger.error(`FCM topic send failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Subscribe user's device to FCM
     */
    async subscribeDevice(accountId: string, fcmToken: string): Promise<boolean> {
        try {
            const account = await this.accountRepository.findOne({ where: { id: accountId } });
            if (!account) {
                return false;
            }

            // Add token if not already present
            const tokens = account.fcmTokens || [];
            if (!tokens.includes(fcmToken)) {
                tokens.push(fcmToken);
                await this.accountRepository.update(accountId, { fcmTokens: tokens });
            }

            this.logger.log(`FCM token registered for account ${accountId}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to subscribe device: ${error.message}`);
            return false;
        }
    }

    /**
     * Unsubscribe device from FCM
     */
    async unsubscribeDevice(accountId: string, fcmToken: string): Promise<boolean> {
        try {
            const account = await this.accountRepository.findOne({ where: { id: accountId } });
            if (!account) {
                return false;
            }

            const tokens = (account.fcmTokens || []).filter(t => t !== fcmToken);
            await this.accountRepository.update(accountId, { fcmTokens: tokens });

            this.logger.log(`FCM token removed for account ${accountId}`);
            return true;
        } catch (error: any) {
            this.logger.error(`Failed to unsubscribe device: ${error.message}`);
            return false;
        }
    }

    // ===== LINE Notify =====

    /**
     * Send LINE Notify message to user
     */
    async sendLineNotify(accessToken: string, payload: LineNotifyPayload): Promise<boolean> {
        if (!accessToken) {
            this.logger.log(`[MOCK] LINE Notify message: ${payload.message}`);
            return true;
        }

        try {
            const params = new URLSearchParams();
            params.append('message', payload.message);
            if (payload.imageThumbnail) params.append('imageThumbnail', payload.imageThumbnail);
            if (payload.imageFullsize) params.append('imageFullsize', payload.imageFullsize);
            if (payload.stickerPackageId) params.append('stickerPackageId', payload.stickerPackageId.toString());
            if (payload.stickerId) params.append('stickerId', payload.stickerId.toString());

            await axios.post(
                'https://notify-api.line.me/api/notify',
                params.toString(),
                {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                }
            );

            this.logger.log('LINE Notify message sent successfully');
            return true;
        } catch (error: any) {
            this.logger.error(`LINE Notify failed: ${error.message}`);
            return false;
        }
    }

    /**
     * Get LINE Notify authorization URL
     */
    getLineNotifyAuthUrl(state: string): string {
        const clientId = this.configService.get<string>('LINE_NOTIFY_CLIENT_ID', '');
        const redirectUri = this.configService.get<string>('LINE_NOTIFY_REDIRECT_URI', '');

        const params = new URLSearchParams({
            response_type: 'code',
            client_id: clientId,
            redirect_uri: redirectUri,
            scope: 'notify',
            state,
        });

        return `https://notify-bot.line.me/oauth/authorize?${params.toString()}`;
    }

    /**
     * Exchange LINE Notify code for access token
     */
    async exchangeLineNotifyCode(code: string): Promise<string | null> {
        const clientId = this.configService.get<string>('LINE_NOTIFY_CLIENT_ID', '');
        const clientSecret = this.configService.get<string>('LINE_NOTIFY_CLIENT_SECRET', '');
        const redirectUri = this.configService.get<string>('LINE_NOTIFY_REDIRECT_URI', '');

        if (!clientId || !clientSecret) {
            this.logger.warn('LINE Notify not configured');
            return 'mock_line_notify_token';
        }

        try {
            const response = await axios.post(
                'https://notify-bot.line.me/oauth/token',
                new URLSearchParams({
                    grant_type: 'authorization_code',
                    code,
                    redirect_uri: redirectUri,
                    client_id: clientId,
                    client_secret: clientSecret,
                }).toString(),
                {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                }
            );

            return response.data.access_token;
        } catch (error: any) {
            this.logger.error(`LINE Notify token exchange failed: ${error.message}`);
            return null;
        }
    }

    // ===== Batch Notifications =====

    /**
     * Send notification to all users with preferences
     */
    async broadcastToUsers(
        userIds: string[],
        payload: NotificationPayload,
        channels: { push?: boolean; line?: boolean } = { push: true }
    ): Promise<{ sent: number; failed: number }> {
        let sent = 0;
        let failed = 0;

        for (const userId of userIds) {
            const account = await this.accountRepository.findOne({ where: { id: userId } });
            if (!account) continue;

            // Send FCM Push
            if (channels.push && account.fcmTokens?.length) {
                const result = await this.sendToDevices(account.fcmTokens, payload);
                sent += result.success;
                failed += result.failure;
            }

            // Send LINE Notify
            if (channels.line) {
                const lineToken = this.lineNotifyTokens.get(userId);
                if (lineToken) {
                    const success = await this.sendLineNotify(lineToken, {
                        message: `\n${payload.title}\n\n${payload.body}`,
                    });
                    success ? sent++ : failed++;
                }
            }
        }

        this.logger.log(`Broadcast complete: ${sent} sent, ${failed} failed`);
        return { sent, failed };
    }

    /**
     * Get VAPID public key for web push subscription
     */
    getVapidPublicKey(): string {
        return this.vapidPublicKey;
    }
}
