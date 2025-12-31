import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

/**
 * Email 郵件服務
 * 支援 Resend API 和開發模式（console 輸出）
 */
@Injectable()
export class EmailService {
    private readonly logger = new Logger(EmailService.name);
    private resend: Resend | null = null;
    private isConfigured = false;
    private fromEmail: string;

    constructor(private configService: ConfigService) {
        const resendApiKey = this.configService.get('RESEND_API_KEY');

        if (resendApiKey) {
            try {
                this.resend = new Resend(resendApiKey);
                this.isConfigured = true;
                this.fromEmail = this.configService.get('RESEND_FROM') || 'onboarding@resend.dev';
                this.logger.log('Email service initialized with Resend API');
            } catch (error) {
                this.logger.warn('Failed to initialize Resend, emails will be logged to console');
            }
        } else {
            this.logger.warn('RESEND_API_KEY not configured, emails will be logged to console');
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

        if (this.isConfigured && this.resend) {
            try {
                const result = await this.resend.emails.send({
                    from: `曦望燈塔 <${this.fromEmail}>`,
                    to: email,
                    subject,
                    html,
                });

                if (result.error) {
                    this.logger.error(`Failed to send email via Resend: ${result.error.message}`);
                    // 僅在開發環境 log OTP（生產環境絕對禁止）
                    if (process.env.NODE_ENV !== 'production') {
                        this.logger.warn(`[DEV MODE] Email OTP for ${this.maskEmail(email)}: ${code}`);
                    }
                    return true;
                }

                this.logger.log(`OTP email sent to ${this.maskEmail(email)} via Resend`);
                return true;
            } catch (error) {
                this.logger.error(`Failed to send email: ${error.message}`);
                if (process.env.NODE_ENV !== 'production') {
                    this.logger.warn(`[DEV MODE] Email OTP for ${this.maskEmail(email)}: ${code}`);
                }
                return true;
            }
        }

        // 開發模式：僅 log 到 console（遮蔽 email）
        if (process.env.NODE_ENV !== 'production') {
            this.logger.warn(`[DEV MODE] Email OTP for ${this.maskEmail(email)}: ${code}`);
        } else {
            this.logger.log(`OTP generated for ${this.maskEmail(email)} (Email not configured)`);
        }
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

        if (this.isConfigured && this.resend) {
            try {
                const result = await this.resend.emails.send({
                    from: `曦望燈塔 <${this.fromEmail}>`,
                    to: email,
                    subject,
                    html,
                });

                if (result.error) {
                    this.logger.error(`Failed to send password reset email: ${result.error.message}`);
                    // 僅在開發環境 log（生產環境絕對禁止）
                    if (process.env.NODE_ENV !== 'production') {
                        this.logger.warn(`[DEV MODE] Password reset for ${this.maskEmail(email)}: [URL_MASKED]`);
                    }
                    return true;
                }

                this.logger.log(`Password reset email sent to ${this.maskEmail(email)} via Resend`);
                return true;
            } catch (error) {
                this.logger.error(`Failed to send password reset email: ${error.message}`);
                if (process.env.NODE_ENV !== 'production') {
                    this.logger.warn(`[DEV MODE] Password reset for ${this.maskEmail(email)}: [URL_MASKED]`);
                }
                return true;
            }
        }

        // 開發模式：記錄但遮蔽敏感資訊
        if (process.env.NODE_ENV !== 'production') {
            this.logger.warn(`[DEV MODE] Password reset for ${this.maskEmail(email)}: [URL_MASKED]`);
        } else {
            this.logger.log(`Password reset requested for ${this.maskEmail(email)} (Email not configured)`);
        }
        return true;
    }

    /**
     * 發送 Email 驗證信（自訂連結）
     */
    async sendVerificationEmail(
        email: string,
        displayName: string,
        verificationLink: string,
    ): Promise<{ success: boolean; message: string }> {
        const subject = '【曦望燈塔】請驗證您的電子郵件地址';
        const html = this.getVerificationEmailTemplate(displayName, verificationLink);

        if (this.isConfigured && this.resend) {
            try {
                const result = await this.resend.emails.send({
                    from: `曦望燈塔 <${this.fromEmail}>`,
                    to: email,
                    subject,
                    html,
                });

                if (result.error) {
                    this.logger.error(`Failed to send verification email: ${result.error.message}`);
                    return {
                        success: false,
                        message: result.error.message,
                    };
                }

                this.logger.log(`Verification email sent to ${this.maskEmail(email)} via Resend`);
                return {
                    success: true,
                    message: '驗證信已發送',
                };
            } catch (error) {
                this.logger.error(`Failed to send verification email: ${error.message}`);
                return {
                    success: false,
                    message: `發送失敗: ${error.message}`,
                };
            }
        }

        // 開發模式：僅 log 到 console（遮蔽連結）
        if (process.env.NODE_ENV !== 'production') {
            this.logger.warn(`[DEV MODE] Verification email for ${this.maskEmail(email)}: [LINK_MASKED]`);
        } else {
            this.logger.log(`Verification email requested for ${this.maskEmail(email)} (Email not configured)`);
        }
        return {
            success: true,
            message: '驗證信已發送（開發模式）',
        };
    }

    /**
     * 驗證信 HTML 模板
     */
    private getVerificationEmailTemplate(displayName: string, link: string): string {
        return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Noto Sans TC', 'Segoe UI', Arial, sans-serif; background-color: #FAF8F5;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <tr>
            <td>
                <!-- Header -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 32px;">
                    <tr>
                        <td align="center">
                            <h1 style="color: #3D2E24; font-size: 24px; font-weight: 600; margin: 0;">
                                🏠 曦望燈塔
                            </h1>
                            <p style="color: #6B5B4F; font-size: 14px; margin: 8px 0 0 0;">
                                Light Keepers 資訊管理平台
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Content Card -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background: #FFFFFF; border-radius: 16px; border: 1px solid #E8E4DF; overflow: hidden;">
                    <tr>
                        <td style="padding: 32px;">
                            <h2 style="color: #3D2E24; font-size: 20px; font-weight: 600; margin: 0 0 16px 0;">
                                您好，${displayName || '用戶'}！
                            </h2>
                            <p style="color: #6B5B4F; font-size: 15px; line-height: 1.6; margin: 0 0 24px 0;">
                                感謝您註冊曦望燈塔平台。請點擊下方按鈕驗證您的電子郵件地址：
                            </p>
                            
                            <!-- Button -->
                            <table cellpadding="0" cellspacing="0" border="0" width="100%">
                                <tr>
                                    <td align="center">
                                        <a href="${link}" 
                                           style="display: inline-block; background: linear-gradient(135deg, #C4A77D 0%, #A68660 100%); 
                                                  color: #FFFFFF; text-decoration: none; padding: 14px 32px; 
                                                  border-radius: 8px; font-size: 15px; font-weight: 600;">
                                            ✓ 驗證我的電子郵件
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #9CA3AF; font-size: 13px; line-height: 1.5; margin: 24px 0 0 0;">
                                如果您沒有註冊此帳號，請忽略此郵件。<br>
                                如果按鈕無法點擊，請複製以下連結到瀏覽器：
                            </p>
                            <p style="color: #6B5B4F; font-size: 12px; word-break: break-all; background: #F5EDE4; padding: 12px; border-radius: 6px; margin: 12px 0 0 0;">
                                ${link}
                            </p>
                        </td>
                    </tr>
                </table>

                <!-- Footer -->
                <table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top: 32px;">
                    <tr>
                        <td align="center">
                            <p style="color: #9CA3AF; font-size: 12px; margin: 0;">
                                © 2024 曦望燈塔救援協會
                            </p>
                            <p style="color: #9CA3AF; font-size: 12px; margin: 8px 0 0 0;">
                                <a href="https://lightkeepers.ngo" style="color: #C4A77D; text-decoration: none;">lightkeepers.ngo</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
        `.trim();
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
