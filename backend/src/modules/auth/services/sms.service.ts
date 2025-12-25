import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SMS 簡訊服務
 * 支援 Twilio 和開發模式（console 輸出）
 */
@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name);
    private twilioClient: any;
    private isConfigured = false;

    constructor(private configService: ConfigService) {
        const accountSid = this.configService.get('TWILIO_ACCOUNT_SID');
        const authToken = this.configService.get('TWILIO_AUTH_TOKEN');

        if (accountSid && authToken) {
            try {
                // 動態載入 Twilio（避免未安裝時報錯）
                // eslint-disable-next-line @typescript-eslint/no-require-imports
                const twilio = require('twilio');
                this.twilioClient = twilio(accountSid, authToken);
                this.isConfigured = true;
                this.logger.log('Twilio SMS service initialized');
            } catch (error) {
                this.logger.warn('Twilio not installed, SMS will be logged to console');
            }
        } else {
            this.logger.warn('Twilio credentials not configured, SMS will be logged to console');
        }
    }

    /**
     * 發送 OTP 驗證碼
     */
    async sendOtp(phone: string, code: string): Promise<boolean> {
        const message = `【Light Keepers 曦望燈塔】您的驗證碼是：${code}，有效期限 5 分鐘。請勿將驗證碼告知他人。`;

        if (this.isConfigured && this.twilioClient) {
            try {
                const fromNumber = this.configService.get('TWILIO_PHONE_NUMBER');
                await this.twilioClient.messages.create({
                    body: message,
                    from: fromNumber,
                    to: this.formatPhoneNumber(phone),
                });
                this.logger.log(`OTP sent to ${this.maskPhone(phone)}`);
                return true;
            } catch (error) {
                this.logger.error(`Failed to send SMS: ${error.message}`);
                // 開發模式：失敗時仍 log 到 console
                this.logger.warn(`[DEV MODE] OTP for ${phone}: ${code}`);
                return true;
            }
        }

        // 開發模式：僅 log 到 console
        this.logger.warn(`[DEV MODE] OTP for ${phone}: ${code}`);
        return true;
    }

    /**
     * 發送密碼重設連結（簡訊版）
     */
    async sendPasswordResetSms(phone: string, resetUrl: string): Promise<boolean> {
        const message = `【Light Keepers 曦望燈塔】您申請了密碼重設，請點擊連結重設密碼：${resetUrl} 連結有效期限 1 小時。`;

        if (this.isConfigured && this.twilioClient) {
            try {
                const fromNumber = this.configService.get('TWILIO_PHONE_NUMBER');
                await this.twilioClient.messages.create({
                    body: message,
                    from: fromNumber,
                    to: this.formatPhoneNumber(phone),
                });
                this.logger.log(`Password reset SMS sent to ${this.maskPhone(phone)}`);
                return true;
            } catch (error) {
                this.logger.error(`Failed to send password reset SMS: ${error.message}`);
                this.logger.warn(`[DEV MODE] Password reset for ${phone}: ${resetUrl}`);
                return true;
            }
        }

        this.logger.warn(`[DEV MODE] Password reset for ${phone}: ${resetUrl}`);
        return true;
    }

    /**
     * 格式化台灣手機號碼為國際格式
     */
    private formatPhoneNumber(phone: string): string {
        // 移除所有非數字字元
        const cleaned = phone.replace(/\D/g, '');

        // 台灣手機號碼轉換 (09xx -> +8869xx)
        if (cleaned.startsWith('09') && cleaned.length === 10) {
            return `+886${cleaned.substring(1)}`;
        }

        // 已經是國際格式
        if (cleaned.startsWith('886')) {
            return `+${cleaned}`;
        }

        return phone;
    }

    /**
     * 遮蔽手機號碼用於 log
     */
    private maskPhone(phone: string): string {
        if (phone.length > 4) {
            return phone.substring(0, 4) + '****' + phone.substring(phone.length - 2);
        }
        return '****';
    }
}
