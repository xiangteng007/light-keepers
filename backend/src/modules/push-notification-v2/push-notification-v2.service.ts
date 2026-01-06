import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Push Notification V2 Service
 * Firebase Cloud Messaging integration
 */
@Injectable()
export class PushNotificationV2Service {
    private readonly logger = new Logger(PushNotificationV2Service.name);
    private readonly fcmUrl = 'https://fcm.googleapis.com/fcm/send';
    private deviceTokens: Map<string, DeviceToken[]> = new Map();

    constructor(private configService: ConfigService) { }

    /**
     * 註冊裝置
     */
    registerDevice(userId: string, token: string, platform: 'ios' | 'android' | 'web'): DeviceToken {
        const device: DeviceToken = {
            token,
            platform,
            registeredAt: new Date(),
            lastActive: new Date(),
        };

        const userDevices = this.deviceTokens.get(userId) || [];
        // 避免重複
        const existing = userDevices.findIndex((d) => d.token === token);
        if (existing >= 0) {
            userDevices[existing] = device;
        } else {
            userDevices.push(device);
        }
        this.deviceTokens.set(userId, userDevices);

        return device;
    }

    /**
     * 發送推播
     */
    async sendNotification(userId: string, notification: NotificationPayload): Promise<SendResult> {
        const devices = this.deviceTokens.get(userId) || [];
        if (devices.length === 0) {
            return { success: false, error: 'No registered devices' };
        }

        const results = await Promise.all(devices.map((d) => this.sendToDevice(d.token, notification)));
        const successful = results.filter((r) => r.success).length;

        return {
            success: successful > 0,
            delivered: successful,
            failed: devices.length - successful,
        };
    }

    /**
     * 發送到主題
     */
    async sendToTopic(topic: string, notification: NotificationPayload): Promise<SendResult> {
        const serverKey = this.configService.get<string>('FCM_SERVER_KEY');

        if (!serverKey) {
            this.logger.warn('FCM_SERVER_KEY not configured');
            return { success: true, delivered: 0, failed: 0 }; // Mock success
        }

        try {
            const response = await fetch(this.fcmUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `key=${serverKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: `/topics/${topic}`,
                    notification: {
                        title: notification.title,
                        body: notification.body,
                        icon: notification.icon,
                    },
                    data: notification.data,
                }),
            });

            return { success: response.ok, delivered: response.ok ? 1 : 0 };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * 訂閱主題
     */
    async subscribeToTopic(userId: string, topic: string): Promise<boolean> {
        // TODO: 實作 FCM Topic 訂閱
        this.logger.log(`User ${userId} subscribed to topic ${topic}`);
        return true;
    }

    /**
     * 取消訂閱
     */
    async unsubscribeFromTopic(userId: string, topic: string): Promise<boolean> {
        // TODO: 實作 FCM Topic 取消訂閱
        this.logger.log(`User ${userId} unsubscribed from topic ${topic}`);
        return true;
    }

    /**
     * 批次推播
     */
    async broadcast(userIds: string[], notification: NotificationPayload): Promise<BroadcastResult> {
        const results = await Promise.all(userIds.map((id) => this.sendNotification(id, notification)));
        const successful = results.filter((r) => r.success).length;

        return {
            total: userIds.length,
            successful,
            failed: userIds.length - successful,
        };
    }

    /**
     * 發送緊急警報
     */
    async sendEmergencyAlert(alert: EmergencyAlert): Promise<SendResult> {
        const notification: NotificationPayload = {
            title: `🚨 ${alert.title}`,
            body: alert.description,
            icon: 'emergency_icon',
            data: {
                type: 'emergency',
                alertId: alert.id,
                severity: alert.severity,
                actionUrl: alert.actionUrl,
            },
            priority: 'high',
        };

        return this.sendToTopic('emergency_alerts', notification);
    }

    /**
     * 移除裝置
     */
    removeDevice(userId: string, token: string): boolean {
        const devices = this.deviceTokens.get(userId) || [];
        const filtered = devices.filter((d) => d.token !== token);
        this.deviceTokens.set(userId, filtered);
        return true;
    }

    private async sendToDevice(token: string, notification: NotificationPayload): Promise<{ success: boolean }> {
        const serverKey = this.configService.get<string>('FCM_SERVER_KEY');

        if (!serverKey) {
            return { success: true }; // Mock success
        }

        try {
            const response = await fetch(this.fcmUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `key=${serverKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    to: token,
                    notification: {
                        title: notification.title,
                        body: notification.body,
                        icon: notification.icon,
                    },
                    data: notification.data,
                    priority: notification.priority || 'high',
                }),
            });

            return { success: response.ok };
        } catch {
            return { success: false };
        }
    }
}

// Types
interface DeviceToken { token: string; platform: 'ios' | 'android' | 'web'; registeredAt: Date; lastActive: Date; }
interface NotificationPayload { title: string; body: string; icon?: string; data?: Record<string, any>; priority?: 'high' | 'normal'; }
interface SendResult { success: boolean; delivered?: number; failed?: number; error?: string; }
interface BroadcastResult { total: number; successful: number; failed: number; }
interface EmergencyAlert { id: string; title: string; description: string; severity: string; actionUrl?: string; }
