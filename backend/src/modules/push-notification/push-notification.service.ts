/**
 * Push Notification Service - 推播通知
 * 長期擴展功能
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';

// ============ Types ============

export enum NotificationPriority {
    LOW = 'LOW',
    NORMAL = 'NORMAL',
    HIGH = 'HIGH',
    URGENT = 'URGENT',
}

export enum NotificationChannel {
    PUSH = 'PUSH',
    SMS = 'SMS',
    EMAIL = 'EMAIL',
    LINE = 'LINE',
    IN_APP = 'IN_APP',
}

export interface PushSubscription {
    endpoint: string;
    keys: {
        p256dh: string;
        auth: string;
    };
}

export interface Notification {
    id: string;
    title: string;
    body: string;
    icon?: string;
    priority: NotificationPriority;
    channels: NotificationChannel[];
    recipients: string[]; // User IDs or 'all'
    data?: Record<string, any>;
    actions?: { action: string; title: string; icon?: string }[];
    sentAt: Date;
    expiresAt?: Date;
}

export interface NotificationResult {
    notificationId: string;
    channel: NotificationChannel;
    recipientId: string;
    status: 'sent' | 'failed' | 'pending';
    error?: string;
}

// ============ Service ============

@Injectable()
export class PushNotificationService implements OnModuleInit {
    private readonly logger = new Logger(PushNotificationService.name);

    // Subscription storage
    private subscriptions: Map<string, PushSubscription[]> = new Map();
    private notificationHistory: Notification[] = [];

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    onModuleInit() {
        this.logger.log('Push Notification service initialized');
    }

    // ==================== Subscription Management ====================

    /**
     * 註冊推播訂閱
     */
    subscribe(userId: string, subscription: PushSubscription): boolean {
        const existing = this.subscriptions.get(userId) || [];

        // Avoid duplicates
        const exists = existing.some(s => s.endpoint === subscription.endpoint);
        if (!exists) {
            existing.push(subscription);
            this.subscriptions.set(userId, existing);
            this.logger.log(`User ${userId} subscribed to push notifications`);
        }
        return true;
    }

    /**
     * 取消訂閱
     */
    unsubscribe(userId: string, endpoint?: string): boolean {
        if (!endpoint) {
            this.subscriptions.delete(userId);
            return true;
        }

        const existing = this.subscriptions.get(userId) || [];
        const filtered = existing.filter(s => s.endpoint !== endpoint);
        this.subscriptions.set(userId, filtered);
        return true;
    }

    /**
     * 取得用戶訂閱
     */
    getSubscriptions(userId: string): PushSubscription[] {
        return this.subscriptions.get(userId) || [];
    }

    // ==================== Send Notifications ====================

    /**
     * 發送通知
     */
    async send(notification: Omit<Notification, 'id' | 'sentAt'>): Promise<NotificationResult[]> {
        const id = `notif-${Date.now()}`;
        const fullNotification: Notification = {
            ...notification,
            id,
            sentAt: new Date(),
        };

        this.notificationHistory.push(fullNotification);
        if (this.notificationHistory.length > 1000) {
            this.notificationHistory = this.notificationHistory.slice(-500);
        }

        const results: NotificationResult[] = [];

        for (const recipientId of notification.recipients) {
            for (const channel of notification.channels) {
                const result = await this.sendToChannel(fullNotification, recipientId, channel);
                results.push(result);
            }
        }

        return results;
    }

    private async sendToChannel(
        notification: Notification,
        recipientId: string,
        channel: NotificationChannel
    ): Promise<NotificationResult> {
        const baseResult: NotificationResult = {
            notificationId: notification.id,
            channel,
            recipientId,
            status: 'pending',
        };

        try {
            switch (channel) {
                case NotificationChannel.PUSH:
                    await this.sendWebPush(notification, recipientId);
                    break;
                case NotificationChannel.IN_APP:
                    this.eventEmitter.emit('notification.inapp', { notification, recipientId });
                    break;
                case NotificationChannel.LINE:
                    await this.sendLine(notification, recipientId);
                    break;
                case NotificationChannel.SMS:
                    await this.sendSms(notification, recipientId);
                    break;
                case NotificationChannel.EMAIL:
                    await this.sendEmail(notification, recipientId);
                    break;
            }
            return { ...baseResult, status: 'sent' };
        } catch (error) {
            return { ...baseResult, status: 'failed', error: String(error) };
        }
    }

    // ==================== Channel Implementations ====================

    private async sendWebPush(notification: Notification, userId: string): Promise<void> {
        const subs = this.subscriptions.get(userId) || [];
        if (subs.length === 0) return;

        // In production, use web-push library
        // const webpush = require('web-push');
        // webpush.setVapidDetails(...)
        // for (const sub of subs) { await webpush.sendNotification(sub, JSON.stringify(notification)); }

        this.logger.log(`Web Push sent to ${userId}: ${notification.title}`);
    }

    private async sendLine(notification: Notification, userId: string): Promise<void> {
        // LINE Messaging API integration
        const lineToken = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN');
        if (!lineToken) {
            throw new Error('LINE token not configured');
        }

        // In production:
        // await fetch('https://api.line.me/v2/bot/message/push', { ... });
        this.logger.log(`LINE message sent to ${userId}: ${notification.title}`);
    }

    private async sendSms(notification: Notification, userId: string): Promise<void> {
        // SMS provider integration (Twilio/Nexmo)
        this.logger.log(`SMS sent to ${userId}: ${notification.title}`);
    }

    private async sendEmail(notification: Notification, userId: string): Promise<void> {
        // Email integration (SendGrid/SES)
        this.logger.log(`Email sent to ${userId}: ${notification.title}`);
    }

    // ==================== Event Handlers ====================

    @OnEvent('geofence.enter')
    async handleGeofenceEnter(payload: { userId: string; zoneId: string; zoneName: string }) {
        await this.send({
            title: '進入地理圍欄',
            body: `您已進入區域: ${payload.zoneName}`,
            priority: NotificationPriority.NORMAL,
            channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
            recipients: [payload.userId],
            data: { type: 'geofence_enter', zoneId: payload.zoneId },
        });
    }

    @OnEvent('geofence.exit')
    async handleGeofenceExit(payload: { userId: string; zoneId: string; zoneName: string }) {
        await this.send({
            title: '離開地理圍欄',
            body: `您已離開區域: ${payload.zoneName}`,
            priority: NotificationPriority.NORMAL,
            channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
            recipients: [payload.userId],
            data: { type: 'geofence_exit', zoneId: payload.zoneId },
        });
    }

    @OnEvent('emergency.broadcast')
    async handleEmergencyBroadcast(payload: { message: string; priority: NotificationPriority }) {
        await this.send({
            title: '🚨 緊急廣播',
            body: payload.message,
            priority: payload.priority,
            channels: [NotificationChannel.PUSH, NotificationChannel.LINE, NotificationChannel.SMS],
            recipients: ['all'],
            actions: [
                { action: 'acknowledge', title: '收到' },
                { action: 'view', title: '查看詳情' },
            ],
        });
    }

    // ==================== Query ====================

    /**
     * 取得通知歷史
     */
    getHistory(options?: { recipientId?: string; limit?: number }): Notification[] {
        let filtered = this.notificationHistory;

        if (options?.recipientId) {
            filtered = filtered.filter(n =>
                n.recipients.includes(options.recipientId!) || n.recipients.includes('all')
            );
        }

        return filtered.slice(-(options?.limit || 50));
    }
}
