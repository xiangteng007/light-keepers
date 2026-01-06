/**
 * Notification Queue Service
 * Unified notification management for push, email, LINE, and in-app notifications
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService } from '../cache/cache.service';

export enum NotificationChannel {
    PUSH = 'push',
    EMAIL = 'email',
    LINE = 'line',
    IN_APP = 'in_app',
    SMS = 'sms',
}

export enum NotificationPriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    URGENT = 'urgent',
}

export interface NotificationPayload {
    id?: string;
    type: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    priority?: NotificationPriority;
    channels?: NotificationChannel[];
    recipients: string[]; // User IDs
    scheduledAt?: Date;
    expiresAt?: Date;
    imageUrl?: string;
    actionUrl?: string;
}

export interface NotificationResult {
    id: string;
    success: boolean;
    channelResults: Record<NotificationChannel, { success: boolean; error?: string }>;
    timestamp: Date;
}

@Injectable()
export class NotificationQueueService {
    private readonly logger = new Logger(NotificationQueueService.name);
    private readonly pendingNotifications: Map<string, NotificationPayload> = new Map();
    private inAppHandler: ((event: any) => void) | null = null;

    constructor(
        private configService: ConfigService,
        private cache: CacheService,
    ) { }

    /**
     * Set handler for in-app notifications (called by gateway)
     */
    setInAppHandler(handler: (event: any) => void): void {
        this.inAppHandler = handler;
    }

    /**
     * Queue a notification for delivery
     */
    async queue(payload: NotificationPayload): Promise<string> {
        const id = payload.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const notification = {
            ...payload,
            id,
            priority: payload.priority || NotificationPriority.NORMAL,
            channels: payload.channels || [NotificationChannel.IN_APP, NotificationChannel.PUSH],
        };

        // Store in pending
        this.pendingNotifications.set(id, notification);

        // If scheduled, store for later
        if (payload.scheduledAt && payload.scheduledAt > new Date()) {
            await this.cache.set(`notification:scheduled:${id}`, notification, {
                ttl: Math.ceil((payload.scheduledAt.getTime() - Date.now()) / 1000) + 3600,
            });
            this.logger.debug(`Notification ${id} scheduled for ${payload.scheduledAt}`);
            return id;
        }

        // Send immediately
        await this.send(notification);
        return id;
    }

    /**
     * Send a notification through all channels
     */
    async send(notification: NotificationPayload): Promise<NotificationResult> {
        const id = notification.id || `notif-${Date.now()}`;
        const channelResults: Record<NotificationChannel, { success: boolean; error?: string }> = {} as any;

        for (const channel of notification.channels || []) {
            try {
                switch (channel) {
                    case NotificationChannel.IN_APP:
                        await this.sendInApp(notification);
                        channelResults[channel] = { success: true };
                        break;

                    case NotificationChannel.PUSH:
                        await this.sendPush(notification);
                        channelResults[channel] = { success: true };
                        break;

                    case NotificationChannel.LINE:
                        await this.sendLine(notification);
                        channelResults[channel] = { success: true };
                        break;

                    case NotificationChannel.EMAIL:
                        await this.sendEmail(notification);
                        channelResults[channel] = { success: true };
                        break;

                    case NotificationChannel.SMS:
                        await this.sendSms(notification);
                        channelResults[channel] = { success: true };
                        break;
                }
            } catch (error) {
                channelResults[channel] = { success: false, error: (error as Error).message };
                this.logger.error(`Failed to send ${channel} notification:`, error);
            }
        }

        // Remove from pending
        this.pendingNotifications.delete(id);

        // Store result
        const result: NotificationResult = {
            id,
            success: Object.values(channelResults).some(r => r.success),
            channelResults,
            timestamp: new Date(),
        };

        // Cache result for 24 hours
        await this.cache.set(`notification:result:${id}`, result, { ttl: 86400 });

        return result;
    }

    // ==================== Channel Implementations ====================

    private async sendInApp(notification: NotificationPayload): Promise<void> {
        // Call handler for WebSocket broadcast
        if (this.inAppHandler) {
            this.inAppHandler({
                type: notification.type,
                title: notification.title,
                body: notification.body,
                data: notification.data,
                recipients: notification.recipients,
                priority: notification.priority,
                timestamp: new Date().toISOString(),
            });
        }

        this.logger.debug(`In-app notification sent: ${notification.title}`);
    }

    private async sendPush(notification: NotificationPayload): Promise<void> {
        const fcmServerKey = this.configService.get<string>('FCM_SERVER_KEY');

        if (!fcmServerKey) {
            this.logger.warn('FCM not configured, skipping push notification');
            return;
        }

        // Get user FCM tokens from cache/DB
        for (const userId of notification.recipients) {
            const token = await this.cache.get<string>(`user:fcm_token:${userId}`);
            if (!token) continue;

            try {
                const response = await fetch('https://fcm.googleapis.com/fcm/send', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `key=${fcmServerKey}`,
                    },
                    body: JSON.stringify({
                        to: token,
                        notification: {
                            title: notification.title,
                            body: notification.body,
                            image: notification.imageUrl,
                            click_action: notification.actionUrl,
                        },
                        data: notification.data,
                        priority: notification.priority === NotificationPriority.URGENT ? 'high' : 'normal',
                    }),
                });

                if (!response.ok) {
                    throw new Error(`FCM error: ${response.status}`);
                }
            } catch (error) {
                this.logger.error(`Push to ${userId} failed:`, error);
            }
        }
    }

    private async sendLine(notification: NotificationPayload): Promise<void> {
        const lineChannelToken = this.configService.get<string>('LINE_CHANNEL_ACCESS_TOKEN');

        if (!lineChannelToken) {
            this.logger.warn('LINE not configured, skipping LINE notification');
            return;
        }

        // Get user LINE IDs
        for (const userId of notification.recipients) {
            const lineUserId = await this.cache.get<string>(`user:line_id:${userId}`);
            if (!lineUserId) continue;

            try {
                const response = await fetch('https://api.line.me/v2/bot/message/push', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${lineChannelToken}`,
                    },
                    body: JSON.stringify({
                        to: lineUserId,
                        messages: [{
                            type: 'text',
                            text: `${notification.title}\n\n${notification.body}`,
                        }],
                    }),
                });

                if (!response.ok) {
                    throw new Error(`LINE API error: ${response.status}`);
                }
            } catch (error) {
                this.logger.error(`LINE to ${userId} failed:`, error);
            }
        }
    }

    private async sendEmail(notification: NotificationPayload): Promise<void> {
        // Email implementation would go here
        this.logger.debug(`Email notification queued: ${notification.title}`);
    }

    private async sendSms(notification: NotificationPayload): Promise<void> {
        // SMS implementation would go here
        this.logger.debug(`SMS notification queued: ${notification.title}`);
    }

    // ==================== Convenience Methods ====================

    /**
     * Send SOS alert to all responders
     */
    async sendSosAlert(sosId: string, location: { lat: number; lng: number }, message: string, responderIds: string[]): Promise<string> {
        return this.queue({
            type: 'sos_alert',
            title: '🆘 緊急求救信號',
            body: message || '有人發出求救信號',
            priority: NotificationPriority.URGENT,
            channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP, NotificationChannel.LINE],
            recipients: responderIds,
            data: { sosId, location },
            actionUrl: `/sos/${sosId}`,
        });
    }

    /**
     * Send task assignment notification
     */
    async sendTaskAssignment(taskId: string, taskTitle: string, assigneeId: string): Promise<string> {
        return this.queue({
            type: 'task_assigned',
            title: '📋 任務派遣',
            body: `您已被派遣執行任務：${taskTitle}`,
            priority: NotificationPriority.HIGH,
            channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
            recipients: [assigneeId],
            data: { taskId },
            actionUrl: `/tasks/${taskId}`,
        });
    }

    /**
     * Send new report notification
     */
    async sendNewReportAlert(reportId: string, reportType: string, severity: number, commanderIds: string[]): Promise<string> {
        const severityEmoji = severity >= 4 ? '🔴' : severity >= 3 ? '🟠' : '🟡';
        return this.queue({
            type: 'new_report',
            title: `${severityEmoji} 新災情回報`,
            body: `收到新的${reportType}回報 (嚴重度: ${severity}/5)`,
            priority: severity >= 4 ? NotificationPriority.URGENT : NotificationPriority.NORMAL,
            channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
            recipients: commanderIds,
            data: { reportId, severity },
            actionUrl: `/reports/${reportId}`,
        });
    }

    /**
     * Send weather alert
     */
    async sendWeatherAlert(alertType: string, affectedAreas: string[], allUserIds: string[]): Promise<string> {
        return this.queue({
            type: 'weather_alert',
            title: '⚠️ 天氣警報',
            body: `${alertType} - 影響區域：${affectedAreas.join('、')}`,
            priority: NotificationPriority.HIGH,
            channels: [NotificationChannel.PUSH, NotificationChannel.IN_APP],
            recipients: allUserIds,
            data: { alertType, affectedAreas },
        });
    }

    /**
     * Get notification result
     */
    async getResult(id: string): Promise<NotificationResult | null> {
        return this.cache.get<NotificationResult>(`notification:result:${id}`);
    }

    /**
     * Register FCM token for a user
     */
    async registerFcmToken(userId: string, token: string): Promise<void> {
        await this.cache.set(`user:fcm_token:${userId}`, token, { ttl: 86400 * 30 }); // 30 days
    }

    /**
     * Register LINE ID for a user
     */
    async registerLineId(userId: string, lineId: string): Promise<void> {
        await this.cache.set(`user:line_id:${userId}`, lineId, { ttl: 86400 * 365 }); // 1 year
    }
}
