/**
 * Notification Center Service
 * Unified notification management and history
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface NotificationItem {
    id: string;
    type: NotificationType;
    channel: NotificationChannel;
    recipient: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
    sentAt?: Date;
    deliveredAt?: Date;
    readAt?: Date;
    errorMessage?: string;
    createdAt: Date;
}

export type NotificationType =
    | 'sos_alert'
    | 'task_assignment'
    | 'report_update'
    | 'mission_broadcast'
    | 'weather_alert'
    | 'system_notice'
    | 'reminder';

export type NotificationChannel = 'push' | 'email' | 'line' | 'sms' | 'in_app';

export interface NotificationStats {
    total: number;
    byChannel: Record<NotificationChannel, number>;
    byStatus: Record<string, number>;
    deliveryRate: number;
    readRate: number;
}

@Injectable()
export class NotificationCenterService {
    private readonly logger = new Logger(NotificationCenterService.name);

    // In-memory storage for demo (use database in production)
    private notifications: NotificationItem[] = [];
    private notificationId = 0;

    constructor(private dataSource: DataSource) { }

    // ==================== Send Notifications ====================

    /**
     * Send notification through specified channel
     */
    async send(params: {
        type: NotificationType;
        channel: NotificationChannel;
        recipient: string;
        title: string;
        body: string;
        data?: Record<string, any>;
    }): Promise<NotificationItem> {
        const notification: NotificationItem = {
            id: `notif-${++this.notificationId}`,
            ...params,
            status: 'pending',
            createdAt: new Date(),
        };

        this.notifications.push(notification);

        // Simulate sending based on channel
        try {
            await this.dispatchToChannel(notification);
            notification.status = 'sent';
            notification.sentAt = new Date();

            // Simulate delivery confirmation
            setTimeout(() => {
                notification.status = 'delivered';
                notification.deliveredAt = new Date();
            }, 1000);

        } catch (error: any) {
            notification.status = 'failed';
            notification.errorMessage = error.message;
        }

        return notification;
    }

    /**
     * Send broadcast to multiple recipients
     */
    async broadcast(params: {
        type: NotificationType;
        channels: NotificationChannel[];
        recipients: string[];
        title: string;
        body: string;
        data?: Record<string, any>;
    }): Promise<{ sent: number; failed: number }> {
        let sent = 0;
        let failed = 0;

        for (const recipient of params.recipients) {
            for (const channel of params.channels) {
                try {
                    await this.send({
                        type: params.type,
                        channel,
                        recipient,
                        title: params.title,
                        body: params.body,
                        data: params.data,
                    });
                    sent++;
                } catch {
                    failed++;
                }
            }
        }

        this.logger.log(`Broadcast completed: ${sent} sent, ${failed} failed`);
        return { sent, failed };
    }

    // ==================== Query Notifications ====================

    /**
     * Get notifications for a user
     */
    async getUserNotifications(userId: string, options?: {
        unreadOnly?: boolean;
        limit?: number;
        offset?: number;
    }): Promise<NotificationItem[]> {
        let result = this.notifications.filter(n => n.recipient === userId);

        if (options?.unreadOnly) {
            result = result.filter(n => n.status !== 'read');
        }

        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        const offset = options?.offset || 0;
        const limit = options?.limit || 50;

        return result.slice(offset, offset + limit);
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        return this.notifications.filter(
            n => n.recipient === userId && n.status !== 'read'
        ).length;
    }

    /**
     * Get notification by ID
     */
    async getById(id: string): Promise<NotificationItem | null> {
        return this.notifications.find(n => n.id === id) || null;
    }

    // ==================== Mark as Read ====================

    /**
     * Mark notification as read
     */
    async markAsRead(id: string): Promise<boolean> {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.status = 'read';
            notification.readAt = new Date();
            return true;
        }
        return false;
    }

    /**
     * Mark all notifications as read for user
     */
    async markAllAsRead(userId: string): Promise<number> {
        let count = 0;
        this.notifications.forEach(n => {
            if (n.recipient === userId && n.status !== 'read') {
                n.status = 'read';
                n.readAt = new Date();
                count++;
            }
        });
        return count;
    }

    // ==================== Statistics ====================

    /**
     * Get notification statistics
     */
    async getStats(days: number = 30): Promise<NotificationStats> {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        const recent = this.notifications.filter(n => n.createdAt >= cutoff);

        const byChannel: Record<NotificationChannel, number> = {
            push: 0, email: 0, line: 0, sms: 0, in_app: 0
        };
        const byStatus: Record<string, number> = {};

        let delivered = 0;
        let read = 0;

        for (const n of recent) {
            byChannel[n.channel]++;
            byStatus[n.status] = (byStatus[n.status] || 0) + 1;
            if (n.status === 'delivered' || n.status === 'read') delivered++;
            if (n.status === 'read') read++;
        }

        return {
            total: recent.length,
            byChannel,
            byStatus,
            deliveryRate: recent.length > 0 ? (delivered / recent.length) * 100 : 0,
            readRate: recent.length > 0 ? (read / recent.length) * 100 : 0,
        };
    }

    /**
     * Get recent notification activity
     */
    async getRecentActivity(limit: number = 20): Promise<NotificationItem[]> {
        return [...this.notifications]
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, limit);
    }

    // ==================== Private Helpers ====================

    private async dispatchToChannel(notification: NotificationItem): Promise<void> {
        switch (notification.channel) {
            case 'push':
                await this.sendPushNotification(notification);
                break;
            case 'email':
                await this.sendEmailNotification(notification);
                break;
            case 'line':
                await this.sendLineNotification(notification);
                break;
            case 'sms':
                await this.sendSmsNotification(notification);
                break;
            case 'in_app':
                // In-app notifications are stored automatically
                break;
        }
    }

    private async sendPushNotification(notification: NotificationItem): Promise<void> {
        this.logger.debug(`Push notification sent to ${notification.recipient}: ${notification.title}`);
        // Integrate with Firebase Cloud Messaging or similar
    }

    private async sendEmailNotification(notification: NotificationItem): Promise<void> {
        this.logger.debug(`Email sent to ${notification.recipient}: ${notification.title}`);
        // Integrate with email service
    }

    private async sendLineNotification(notification: NotificationItem): Promise<void> {
        this.logger.debug(`LINE message sent to ${notification.recipient}: ${notification.title}`);
        // Integrate with LINE Messaging API
    }

    private async sendSmsNotification(notification: NotificationItem): Promise<void> {
        this.logger.debug(`SMS sent to ${notification.recipient}: ${notification.title}`);
        // Integrate with Twilio or similar
    }
}
