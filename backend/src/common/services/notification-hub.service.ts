/**
 * notification-hub.service.ts
 * 
 * v4.0: 統一通知中心 - 整合所有通知頻道
 * 
 * 整合模組:
 * - line-notify
 * - telegram-bot  
 * - push-notification
 * - social-media-monitor/notification.service
 * - slack-integration
 * - webhooks
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationConfig } from '../../modules/social-media-monitor/entities/notification-config.entity';
import { GEO_EVENTS } from '../../common/events';

// ============ Types ============
export type NotificationChannel = 'telegram' | 'line' | 'email' | 'webhook' | 'slack' | 'push' | 'sms';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface NotificationPayload {
    title: string;
    body: string;
    priority?: NotificationPriority;
    urgency?: number;  // 1-10
    location?: string;
    data?: Record<string, unknown>;
    imageUrl?: string;
    actions?: NotificationAction[];
    channels?: NotificationChannel[];  // 指定頻道，空 = 全部
    recipients?: string[];  // 指定用戶，空 = 全部配置
}

export interface NotificationAction {
    action: string;
    title: string;
    url?: string;
}

export interface NotificationResult {
    channel: NotificationChannel;
    configName: string;
    success: boolean;
    messageId?: string | number;
    error?: string;
}

// ============ Service ============
@Injectable()
export class NotificationHubService implements OnModuleInit {
    private readonly logger = new Logger(NotificationHubService.name);
    private readonly telegramBaseUrl: string;
    private readonly lineNotifyUrl = 'https://notify-api.line.me/api/notify';

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        @InjectRepository(NotificationConfig)
        private readonly configRepo: Repository<NotificationConfig>,
    ) {
        const telegramToken = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        this.telegramBaseUrl = `https://api.telegram.org/bot${telegramToken}`;
    }

    onModuleInit() {
        this.logger.log('🔔 NotificationHub initialized');
    }

    // ===== 主要發送方法 =====
    async broadcast(payload: NotificationPayload): Promise<NotificationResult[]> {
        const results: NotificationResult[] = [];
        const configs = await this.getActiveConfigs(payload);

        for (const config of configs) {
            try {
                const result = await this.sendToChannel(config, payload);
                results.push(result);
            } catch (error) {
                results.push({
                    channel: config.channel as NotificationChannel,
                    configName: config.name,
                    success: false,
                    error: String(error),
                });
            }
        }

        // 發送結果事件
        this.eventEmitter.emit('notifications.batch.completed', {
            total: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
        });

        return results;
    }

    // 發送到單一配置
    private async sendToChannel(config: NotificationConfig, payload: NotificationPayload): Promise<NotificationResult> {
        const message = this.formatMessage(payload);

        switch (config.channel) {
            case 'telegram':
                return this.sendTelegram(config, message, payload);
            case 'line':
                return this.sendLine(config, message);
            case 'webhook':
                return this.sendWebhook(config, payload);
            case 'slack':
                return this.sendSlack(config, message, payload);
            case 'email':
                return this.sendEmail(config, payload);
            default:
                return { channel: config.channel as NotificationChannel, configName: config.name, success: false, error: 'Unknown channel' };
        }
    }

    // ===== 頻道實作 =====
    private async sendTelegram(config: NotificationConfig, message: string, payload: NotificationPayload): Promise<NotificationResult> {
        const { botToken, chatId } = config.config as { botToken?: string; chatId: string };
        const baseUrl = botToken ? `https://api.telegram.org/bot${botToken}` : this.telegramBaseUrl;

        try {
            const body: Record<string, unknown> = {
                chat_id: chatId,
                text: message,
                parse_mode: 'HTML',
            };

            // 添加按鈕
            if (payload.actions?.length) {
                body.reply_markup = {
                    inline_keyboard: [payload.actions.map(a => ({
                        text: a.title,
                        url: a.url || `callback:${a.action}`,
                    }))],
                };
            }

            const response = await fetch(`${baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });

            const data = await response.json();
            return {
                channel: 'telegram',
                configName: config.name,
                success: data.ok,
                messageId: data.result?.message_id,
            };
        } catch (error) {
            return { channel: 'telegram', configName: config.name, success: false, error: String(error) };
        }
    }

    private async sendLine(config: NotificationConfig, message: string): Promise<NotificationResult> {
        const { accessToken } = config.config as { accessToken: string };

        try {
            const response = await fetch(this.lineNotifyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: `message=${encodeURIComponent(message)}`,
            });

            return {
                channel: 'line',
                configName: config.name,
                success: response.ok,
            };
        } catch (error) {
            return { channel: 'line', configName: config.name, success: false, error: String(error) };
        }
    }

    private async sendWebhook(config: NotificationConfig, payload: NotificationPayload): Promise<NotificationResult> {
        const { url, headers } = config.config as { url: string; headers?: Record<string, string> };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...headers },
                body: JSON.stringify(payload),
            });

            return {
                channel: 'webhook',
                configName: config.name,
                success: response.ok,
            };
        } catch (error) {
            return { channel: 'webhook', configName: config.name, success: false, error: String(error) };
        }
    }

    private async sendSlack(config: NotificationConfig, message: string, payload: NotificationPayload): Promise<NotificationResult> {
        const { webhookUrl, channel } = config.config as { webhookUrl: string; channel?: string };

        try {
            const slackPayload: Record<string, unknown> = {
                text: payload.title,
                blocks: [
                    {
                        type: 'section',
                        text: { type: 'mrkdwn', text: `*${payload.title}*\n${payload.body}` },
                    },
                ],
            };

            if (channel) slackPayload.channel = channel;
            if (payload.location) {
                (slackPayload.blocks as Record<string, unknown>[]).push({
                    type: 'context',
                    elements: [{ type: 'mrkdwn', text: `📍 ${payload.location}` }],
                });
            }

            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(slackPayload),
            });

            return {
                channel: 'slack',
                configName: config.name,
                success: response.ok,
            };
        } catch (error) {
            return { channel: 'slack', configName: config.name, success: false, error: String(error) };
        }
    }

    private async sendEmail(config: NotificationConfig, payload: NotificationPayload): Promise<NotificationResult> {
        const { recipients } = config.config as { recipients: string[] };
        this.logger.log(`[MOCK] Email to: ${recipients.join(', ')} - ${payload.title}`);
        // TODO: 整合 nodemailer 或 SendGrid
        return { channel: 'email', configName: config.name, success: true };
    }

    // ===== 輔助方法 =====
    private formatMessage(payload: NotificationPayload): string {
        const urgencyEmoji = this.getUrgencyEmoji(payload.urgency || 5);

        return `${urgencyEmoji} ${payload.title}
━━━━━━━━━━━━
${payload.location ? `📍 ${payload.location}\n` : ''}⏰ ${new Date().toLocaleString('zh-TW')}
━━━━━━━━━━━━
${payload.body}`;
    }

    private getUrgencyEmoji(urgency: number): string {
        if (urgency >= 9) return '🔴';
        if (urgency >= 7) return '🟠';
        if (urgency >= 5) return '🟡';
        if (urgency >= 3) return '🔵';
        return '⚪';
    }

    private async getActiveConfigs(payload: NotificationPayload): Promise<NotificationConfig[]> {
        const configs = await this.configRepo.find({ where: { enabled: true } });

        return configs.filter(c => {
            // 緊急度篩選
            if (payload.urgency && payload.urgency < c.minUrgency) return false;
            // 頻道篩選
            if (payload.channels?.length && !payload.channels.includes(c.channel as NotificationChannel)) return false;
            return true;
        });
    }

    // ===== 事件監聽 =====
    @OnEvent(GEO_EVENTS.ALERT_RECEIVED)
    async handleAlertReceived(payload: { content?: string; description?: string; urgency?: number; location?: string }) {
        await this.broadcast({
            title: '🚨 緊急警報',
            body: payload.content || payload.description || '',
            urgency: payload.urgency || 8,
            location: payload.location,
            priority: 'urgent',
        });
    }

    @OnEvent(GEO_EVENTS.SOCIAL_INTEL_DETECTED)
    async handleSocialIntel(payload: { urgency?: number; keywords?: string[]; location?: string }) {
        if ((payload.urgency ?? 0) >= 7) {
            await this.broadcast({
                title: '📱 社群情資警報',
                body: `偵測到 ${payload.keywords?.join(', ') || ''} 相關貼文`,
                urgency: payload.urgency,
                location: payload.location,
                priority: 'high',
            });
        }
    }

    @OnEvent('incidents.created')
    async handleIncidentCreated(payload: { title?: string; severity?: string; location?: string }) {
        await this.broadcast({
            title: '📋 新事件建立',
            body: `${payload.title || '新事件'} - ${payload.severity || '未分級'}`,
            urgency: payload.severity === 'critical' ? 9 : 6,
            location: payload.location,
            priority: 'normal',
        });
    }

    // ===== 配置 CRUD (委派給 NotificationConfig) =====
    getConfigs() { return this.configRepo.find(); }
    createConfig(data: Partial<NotificationConfig>) { return this.configRepo.save(this.configRepo.create(data)); }
    updateConfig(id: string, data: Partial<NotificationConfig>) { return this.configRepo.update(id, data); }
    deleteConfig(id: string) { return this.configRepo.delete(id); }
}
