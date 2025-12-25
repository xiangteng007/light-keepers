import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

/**
 * Email 郵件服務
 * 支援 SMTP 和開發模式（console 輸出）
 */
@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private transporter: nodemailer.Transporter | null = null;
    private isConfigured = false;

    constructor(private configService: ConfigService) {
        const smtpHost = this.configService.get('SMTP_HOST');
        const smtpPort = this.configService.get('SMTP_PORT');
        const smtpUser = this.configService.get('SMTP_USER');
        const smtpPass = this.configService.get('SMTP_PASS');

        if (smtpHost && smtpUser && smtpPass) {
            try {
                this.transporter = nodemailer.createTransport({
                    host: smtpHost,
                    port: parseInt(smtpPort || '587', 10),
                    secure: smtpPort === '465',
                    auth: {
                        user: smtpUser,
                        pass: smtpPass,
                    },
                });
                this.isConfigured = true;
                this.logger.log('Email service initialized with SMTP');
            } catch (error) {
                this.logger.warn('Failed to initialize SMTP, emails will be logged to console');
            }
        } else {
            this.logger.warn('SMTP credentials not configured, emails will be logged to console');
        }
    }

    /**
     * 發送 OTP 驗證碼
     */
    async sendOtp(email: string, code: string): Promise<boolean> {
        const subject = '【曦望燈塔】Email 驗證碼';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">曦望燈塔災情管理平台</h2>
                <p>您好，</p>
                <p>您的 Email 驗證碼是：</p>
                <div style="background-color: #f5f5f5; padding: 20px; text-align: center; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${code}</span>
                </div>
                <p>此驗證碼有效期限為 <strong>5 分鐘</strong>。</p>
                <p style="color: #666; font-size: 14px;">請勿將驗證碼告知他人。如果您未要求此驗證碼，請忽略此郵件。</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">© 2024 曦望燈塔救援協會</p>
            </div>
        `;

        if (this.isConfigured && this.transporter) {
            try {
                const fromEmail = this.configService.get('SMTP_FROM') || this.configService.get('SMTP_USER');
                await this.transporter.sendMail({
                    from: `"曦望燈塔" <${fromEmail}>`,
                    to: email,
                    subject,
                    html,
                });
                this.logger.log(`OTP email sent to ${this.maskEmail(email)}`);
                return true;
            } catch (error) {
                this.logger.error(`Failed to send email: ${error.message}`);
                // 開發模式：失敗時仍 log 到 console
                this.logger.warn(`[DEV MODE] Email OTP for ${email}: ${code}`);
                return true;
            }
        }

        // 開發模式：僅 log 到 console
        this.logger.warn(`[DEV MODE] Email OTP for ${email}: ${code}`);
        return true;
    }

    /**
     * 發送密碼重設連結
     */
    async sendPasswordReset(email: string, resetUrl: string): Promise<boolean> {
        const subject = '【曦望燈塔】密碼重設';
        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <h2 style="color: #333;">曦望燈塔災情管理平台</h2>
                <p>您好，</p>
                <p>您申請了密碼重設，請點擊下方按鈕重設密碼：</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">重設密碼</a>
                </div>
                <p style="color: #666; font-size: 14px;">此連結有效期限為 1 小時。如果您未申請密碼重設，請忽略此郵件。</p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="color: #999; font-size: 12px;">© 2024 曦望燈塔救援協會</p>
            </div>
        `;

        if (this.isConfigured && this.transporter) {
            try {
                const fromEmail = this.configService.get('SMTP_FROM') || this.configService.get('SMTP_USER');
                await this.transporter.sendMail({
                    from: `"曦望燈塔" <${fromEmail}>`,
                    to: email,
                    subject,
                    html,
                });
                this.logger.log(`Password reset email sent to ${this.maskEmail(email)}`);
                return true;
            } catch (error) {
                this.logger.error(`Failed to send password reset email: ${error.message}`);
                this.logger.warn(`[DEV MODE] Password reset for ${email}: ${resetUrl}`);
                return true;
            }
        }

        this.logger.warn(`[DEV MODE] Password reset for ${email}: ${resetUrl}`);
        return true;
    }

    /**
     * 遮蔽 Email 用於 log
     */
    private maskEmail(email: string): string {
        const [localPart, domain] = email.split('@');
        if (localPart && domain) {
            const maskedLocal = localPart.length > 2
                ? localPart.substring(0, 2) + '***'
                : '***';
            return `${maskedLocal}@${domain}`;
        }
        return '***@***';
    }
}
