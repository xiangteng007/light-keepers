import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * LINE Notify Service
 * Push notifications to LINE groups
 * 
 * 📋 需要設定:
 * - LINE_NOTIFY_TOKEN: LINE Notify Token
 */
@Injectable()
export class LineNotifyService {
    private readonly logger = new Logger(LineNotifyService.name);
    private readonly apiUrl = 'https://notify-api.line.me/api/notify';

    constructor(private configService: ConfigService) { }

    /**
     * 發送文字訊息
     */
    async sendMessage(message: string, token?: string): Promise<NotifyResult> {
        const accessToken = token || this.configService.get<string>('LINE_NOTIFY_TOKEN');

        if (!accessToken) {
            this.logger.warn('LINE_NOTIFY_TOKEN not configured');
            return { success: false, error: 'Token not configured' };
        }

        try {
            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `message=${encodeURIComponent(message)}`,
            });

            const data = await response.json();
            return { success: response.ok, status: data.status, message: data.message };
        } catch (error) {
            this.logger.error('LINE Notify failed', error);
            return { success: false, error: String(error) };
        }
    }

    /**
     * 發送圖片訊息
     */
    async sendImage(message: string, imageUrl: string, token?: string): Promise<NotifyResult> {
        const accessToken = token || this.configService.get<string>('LINE_NOTIFY_TOKEN');

        if (!accessToken) {
            return { success: false, error: 'Token not configured' };
        }

        try {
            const body = `message=${encodeURIComponent(message)}&imageThumbnail=${encodeURIComponent(imageUrl)}&imageFullsize=${encodeURIComponent(imageUrl)}`;

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body,
            });

            const data = await response.json();
            return { success: response.ok, status: data.status };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * 發送緊急警報
     */
    async sendAlert(alert: AlertPayload): Promise<NotifyResult> {
        const emoji = this.getSeverityEmoji(alert.severity);
        const message = `
${emoji} ${alert.title}
────────────
📍 ${alert.location || '未指定'}
⏰ ${new Date().toLocaleString('zh-TW')}
────────────
${alert.description}
${alert.actionRequired ? `\n🔔 建議行動: ${alert.actionRequired}` : ''}`;

        return this.sendMessage(message, alert.token);
    }

    /**
     * 發送任務通知
     */
    async sendTaskNotification(task: TaskNotification): Promise<NotifyResult> {
        const statusIcon = task.status === 'completed' ? '✅' : task.status === 'urgent' ? '🚨' : '📋';
        const message = `
${statusIcon} 任務通知: ${task.title}
指派給: ${task.assignee}
狀態: ${task.status}
${task.dueDate ? `截止: ${task.dueDate}` : ''}`;

        return this.sendMessage(message);
    }

    /**
     * 批次發送
     */
    async broadcast(message: string, tokens: string[]): Promise<BroadcastResult> {
        const results = await Promise.all(tokens.map((t) => this.sendMessage(message, t)));
        const successful = results.filter((r) => r.success).length;

        return {
            total: tokens.length,
            successful,
            failed: tokens.length - successful,
            details: results,
        };
    }

    private getSeverityEmoji(severity: string): string {
        switch (severity) {
            case 'critical': return '🔴';
            case 'warning': return '🟡';
            case 'info': return '🔵';
            default: return '⚪';
        }
    }
}

// Types
interface NotifyResult { success: boolean; status?: number; message?: string; error?: string; }
interface AlertPayload { title: string; description: string; severity: string; location?: string; actionRequired?: string; token?: string; }
interface TaskNotification { title: string; assignee: string; status: string; dueDate?: string; }
interface BroadcastResult { total: number; successful: number; failed: number; details: NotifyResult[]; }
