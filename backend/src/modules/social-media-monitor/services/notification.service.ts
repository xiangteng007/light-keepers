/**
 * notification.service.ts
 * 
 * v3.0: 多頻道通知服務 (Telegram, LINE, Email, Webhook, Slack)
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationConfig, TelegramConfig, LineNotifyConfig, EmailConfig, WebhookConfig } from '../entities/notification-config.entity';

export interface AlertPayload {
    postId: string;
    platform: string;
    content: string;
    urgency: number;
    location?: string;
    keywords: string[];
    url?: string;
}

@Injectable()
export class NotificationService {
    private readonly logger = new Logger(NotificationService.name);

    constructor(
        @InjectRepository(NotificationConfig)
        private readonly configRepo: Repository<NotificationConfig>,
    ) { }

    /**
     * 發送警報到所有符合條件的頻道
     */
    async sendAlert(payload: AlertPayload): Promise<void> {
        const configs = await this.configRepo.find({ where: { enabled: true } });

        for (const config of configs) {
            // 檢查緊急度門檻
            if (payload.urgency < config.minUrgency) continue;

            // 檢查平台篩選
            if (config.platforms?.length && !config.platforms.includes(payload.platform)) continue;

            // 檢查關鍵字篩選
            if (config.keywords?.length) {
                const hasMatch = config.keywords.some(kw => payload.keywords.includes(kw));
                if (!hasMatch) continue;
            }

            try {
                await this.sendToChannel(config, payload);
                this.logger.log(`Alert sent to ${config.channel}:${config.name}`);
            } catch (error) {
                this.logger.error(`Failed to send alert to ${config.channel}:${config.name}`, error);
            }
        }
    }

    private async sendToChannel(config: NotificationConfig, payload: AlertPayload): Promise<void> {
        const message = this.formatMessage(payload);

        switch (config.channel) {
            case 'telegram':
                await this.sendTelegram(config.config as TelegramConfig, message);
                break;
            case 'line':
                await this.sendLineNotify(config.config as LineNotifyConfig, message);
                break;
            case 'webhook':
                await this.sendWebhook(config.config as WebhookConfig, payload);
                break;
            case 'email':
                await this.sendEmail(config.config as EmailConfig, payload);
                break;
            case 'slack':
                // TODO: Implement Slack
                break;
        }
    }

    private formatMessage(payload: AlertPayload): string {
        return `🚨 災情警報 [緊急度: ${payload.urgency}/10]

📍 ${payload.location || '未知地點'}
📱 來源: ${payload.platform}
🏷️ 關鍵字: ${payload.keywords.join(', ')}

${payload.content.substring(0, 200)}${payload.content.length > 200 ? '...' : ''}

${payload.url ? `🔗 ${payload.url}` : ''}`;
    }

    /**
     * Telegram Bot 推送
     */
    private async sendTelegram(config: TelegramConfig, message: string): Promise<void> {
        const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: config.chatId,
                text: message,
                parse_mode: 'HTML',
            }),
        });

        if (!response.ok) {
            throw new Error(`Telegram API error: ${response.status}`);
        }
    }

    /**
     * LINE Notify 推送
     */
    private async sendLineNotify(config: LineNotifyConfig, message: string): Promise<void> {
        const url = 'https://notify-api.line.me/api/notify';

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Authorization': `Bearer ${config.accessToken}`,
            },
            body: `message=${encodeURIComponent(message)}`,
        });

        if (!response.ok) {
            throw new Error(`LINE Notify error: ${response.status}`);
        }
    }

    /**
     * Webhook 推送
     */
    private async sendWebhook(config: WebhookConfig, payload: AlertPayload): Promise<void> {
        const response = await fetch(config.url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...config.headers,
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error(`Webhook error: ${response.status}`);
        }
    }

    /**
     * Email 推送 (簡化版 - 實際需整合 SMTP)
     */
    private async sendEmail(config: EmailConfig, payload: AlertPayload): Promise<void> {
        this.logger.log(`[MOCK] Email would be sent to: ${config.recipients.join(', ')}`);
        // TODO: 整合 nodemailer 或 SendGrid
    }

    // ===== 配置 CRUD =====
    async getConfigs(): Promise<NotificationConfig[]> {
        return this.configRepo.find();
    }

    async createConfig(data: Partial<NotificationConfig>): Promise<NotificationConfig> {
        const config = this.configRepo.create(data);
        return this.configRepo.save(config);
    }

    async updateConfig(id: string, data: Partial<NotificationConfig>): Promise<NotificationConfig | null> {
        await this.configRepo.update(id, data);
        return this.configRepo.findOneBy({ id });
    }

    async deleteConfig(id: string): Promise<void> {
        await this.configRepo.delete(id);
    }
}
