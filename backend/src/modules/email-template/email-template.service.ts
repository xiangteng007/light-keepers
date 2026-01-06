import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Email Template Service
 * Disaster notification email templates
 */
@Injectable()
export class EmailTemplateService {
    private readonly logger = new Logger(EmailTemplateService.name);
    private templates: Map<string, EmailTemplate> = new Map();

    constructor(private configService: ConfigService) {
        this.loadDefaultTemplates();
    }

    private loadDefaultTemplates() {
        this.templates.set('incident_alert', {
            id: 'incident_alert',
            name: '事件警報',
            subject: '🚨 [{{severity}}] {{title}}',
            body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <div style="background: {{severityColor}}; color: white; padding: 20px; text-align: center;">
        <h1>{{title}}</h1>
    </div>
    <div style="padding: 20px; background: #f5f5f5;">
        <p><strong>📍 地點:</strong> {{location}}</p>
        <p><strong>⏰ 時間:</strong> {{timestamp}}</p>
        <p><strong>📋 描述:</strong></p>
        <p>{{description}}</p>
        {{#if actionRequired}}
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 15px;">
            <strong>🔔 建議行動:</strong> {{actionRequired}}
        </div>
        {{/if}}
    </div>
    <div style="padding: 15px; text-align: center; color: #666;">
        <small>此郵件由光守護者災防平台自動發送</small>
    </div>
</div>`,
        });

        this.templates.set('daily_report', {
            id: 'daily_report',
            name: '每日報告',
            subject: '📊 每日運作報告 - {{date}}',
            body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">📊 每日運作報告</h2>
    <p>日期: {{date}}</p>
    <table style="width: 100%; border-collapse: collapse;">
        <tr style="background: #f0f0f0;">
            <td style="padding: 10px; border: 1px solid #ddd;">事件數</td>
            <td style="padding: 10px; border: 1px solid #ddd;">{{incidents}}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #ddd;">警報數</td>
            <td style="padding: 10px; border: 1px solid #ddd;">{{alerts}}</td>
        </tr>
        <tr style="background: #f0f0f0;">
            <td style="padding: 10px; border: 1px solid #ddd;">出勤人次</td>
            <td style="padding: 10px; border: 1px solid #ddd;">{{dispatches}}</td>
        </tr>
    </table>
</div>`,
        });

        this.templates.set('volunteer_dispatch', {
            id: 'volunteer_dispatch',
            name: '志工派遣通知',
            subject: '📢 派遣通知 - {{incidentTitle}}',
            body: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2>您已被派遣至以下任務</h2>
    <div style="background: #e3f2fd; padding: 15px; border-radius: 5px;">
        <p><strong>任務:</strong> {{incidentTitle}}</p>
        <p><strong>地點:</strong> {{location}}</p>
        <p><strong>集合時間:</strong> {{meetingTime}}</p>
        <p><strong>裝備需求:</strong> {{equipment}}</p>
    </div>
    <p style="margin-top: 20px;">
        <a href="{{confirmUrl}}" style="background: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">確認出勤</a>
    </p>
</div>`,
        });

        this.logger.log(`Loaded ${this.templates.size} email templates`);
    }

    /**
     * 取得模板
     */
    getTemplate(id: string): EmailTemplate | undefined {
        return this.templates.get(id);
    }

    /**
     * 渲染模板
     */
    render(templateId: string, data: Record<string, any>): RenderedEmail | null {
        const template = this.templates.get(templateId);
        if (!template) return null;

        let subject = template.subject;
        let body = template.body;

        // 簡單變數替換
        for (const [key, value] of Object.entries(data)) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            subject = subject.replace(regex, String(value));
            body = body.replace(regex, String(value));
        }

        // 處理條件區塊 (簡化版)
        body = body.replace(/\{\{#if (\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g, (match, key, content) => {
            return data[key] ? content : '';
        });

        return { subject, body, templateId };
    }

    /**
     * 發送 Email
     */
    async send(to: string | string[], templateId: string, data: Record<string, any>): Promise<SendResult> {
        const rendered = this.render(templateId, data);
        if (!rendered) {
            return { success: false, error: 'Template not found' };
        }

        // TODO: 整合實際 Email 服務 (SendGrid, SES, etc.)
        this.logger.log(`Sending email to ${Array.isArray(to) ? to.join(', ') : to}`);

        return {
            success: true,
            messageId: `msg-${Date.now()}`,
            recipients: Array.isArray(to) ? to : [to],
        };
    }

    /**
     * 列出所有模板
     */
    listTemplates(): EmailTemplate[] {
        return Array.from(this.templates.values());
    }

    /**
     * 新增/更新模板
     */
    upsertTemplate(template: EmailTemplate): void {
        this.templates.set(template.id, template);
    }
}

// Types
interface EmailTemplate { id: string; name: string; subject: string; body: string; }
interface RenderedEmail { subject: string; body: string; templateId: string; }
interface SendResult { success: boolean; messageId?: string; recipients?: string[]; error?: string; }
