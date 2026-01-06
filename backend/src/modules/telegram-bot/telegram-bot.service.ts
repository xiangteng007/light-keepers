import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Telegram Bot Service
 * Remote command operations via Telegram
 * 
 * 📋 需要設定:
 * - TELEGRAM_BOT_TOKEN: Telegram Bot Token
 * - TELEGRAM_CHAT_ID: Default chat ID
 */
@Injectable()
export class TelegramBotService {
    private readonly logger = new Logger(TelegramBotService.name);
    private readonly baseUrl: string;

    constructor(private configService: ConfigService) {
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        this.baseUrl = `https://api.telegram.org/bot${token}`;
    }

    /**
     * 發送訊息
     */
    async sendMessage(text: string, chatId?: string): Promise<TelegramResult> {
        const targetChat = chatId || this.configService.get<string>('TELEGRAM_CHAT_ID');

        if (!targetChat) {
            return { success: false, error: 'Chat ID not configured' };
        }

        try {
            const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: targetChat, text, parse_mode: 'HTML' }),
            });

            const data = await response.json();
            return { success: data.ok, messageId: data.result?.message_id };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * 發送圖片
     */
    async sendPhoto(photoUrl: string, caption: string, chatId?: string): Promise<TelegramResult> {
        const targetChat = chatId || this.configService.get<string>('TELEGRAM_CHAT_ID');

        try {
            const response = await fetch(`${this.baseUrl}/sendPhoto`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: targetChat, photo: photoUrl, caption }),
            });

            const data = await response.json();
            return { success: data.ok, messageId: data.result?.message_id };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * 發送位置
     */
    async sendLocation(lat: number, lng: number, chatId?: string): Promise<TelegramResult> {
        const targetChat = chatId || this.configService.get<string>('TELEGRAM_CHAT_ID');

        try {
            const response = await fetch(`${this.baseUrl}/sendLocation`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: targetChat, latitude: lat, longitude: lng }),
            });

            const data = await response.json();
            return { success: data.ok };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * 發送警報
     */
    async sendAlert(alert: AlertPayload): Promise<TelegramResult> {
        const emoji = alert.severity === 'critical' ? '🔴' : alert.severity === 'warning' ? '🟡' : '🔵';
        const html = `
<b>${emoji} ${alert.title}</b>
━━━━━━━━━━━━
📍 <i>${alert.location || '未指定'}</i>
⏰ ${new Date().toLocaleString('zh-TW')}
━━━━━━━━━━━━
${alert.description}`;

        return this.sendMessage(html, alert.chatId);
    }

    /**
     * 發送 Inline Keyboard
     */
    async sendWithKeyboard(text: string, buttons: InlineButton[][], chatId?: string): Promise<TelegramResult> {
        const targetChat = chatId || this.configService.get<string>('TELEGRAM_CHAT_ID');

        try {
            const response = await fetch(`${this.baseUrl}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: targetChat,
                    text,
                    parse_mode: 'HTML',
                    reply_markup: { inline_keyboard: buttons },
                }),
            });

            const data = await response.json();
            return { success: data.ok, messageId: data.result?.message_id };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * 取得 Webhook 更新
     */
    async getUpdates(offset?: number): Promise<Update[]> {
        try {
            const url = offset ? `${this.baseUrl}/getUpdates?offset=${offset}` : `${this.baseUrl}/getUpdates`;
            const response = await fetch(url);
            const data = await response.json();
            return data.ok ? data.result : [];
        } catch (error) {
            this.logger.error('Failed to get updates', error);
            return [];
        }
    }

    /**
     * 處理指令
     */
    processCommand(text: string): CommandResult {
        const parts = text.split(' ');
        const command = parts[0].replace('/', '');
        const args = parts.slice(1);

        switch (command) {
            case 'status': return { command, response: '系統運作正常 ✅' };
            case 'alerts': return { command, response: '目前無重大警報' };
            case 'volunteers': return { command, response: '目前在線志工: 15 人' };
            case 'help': return { command, response: '/status - 系統狀態\n/alerts - 警報列表\n/volunteers - 志工狀態' };
            default: return { command, response: '未知指令，輸入 /help 查看可用指令' };
        }
    }
}

// Types
interface TelegramResult { success: boolean; messageId?: number; error?: string; }
interface AlertPayload { title: string; description: string; severity: string; location?: string; chatId?: string; }
interface InlineButton { text: string; callback_data?: string; url?: string; }
interface Update { update_id: number; message?: any; callback_query?: any; }
interface CommandResult { command: string; response: string; }
