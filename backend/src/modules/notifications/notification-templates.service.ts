/**
 * Notification Templates Service
 * Dynamic notification template management
 */

import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from '../cache/cache.service';

export interface NotificationTemplate {
    id: string;
    key: string;
    name: string;
    channel: 'push' | 'email' | 'line' | 'sms' | 'inapp';
    subject?: string; // For email
    title?: string; // For push/inapp
    body: string;
    variables: string[]; // e.g., ['userName', 'taskTitle']
    locale: string; // e.g., 'zh-TW'
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface RenderedNotification {
    subject?: string;
    title?: string;
    body: string;
}

@Injectable()
export class NotificationTemplatesService {
    private readonly logger = new Logger(NotificationTemplatesService.name);
    private readonly TEMPLATES_KEY = 'notification:templates';
    private templatesCache: NotificationTemplate[] = [];

    constructor(private cache: CacheService) {
        this.loadTemplates();
        this.seedDefaultTemplates();
    }

    // ==================== Template Management ====================

    /**
     * Create a new template
     */
    async createTemplate(template: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>): Promise<NotificationTemplate> {
        const newTemplate: NotificationTemplate = {
            ...template,
            id: `tpl-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        this.templatesCache.push(newTemplate);
        await this.saveTemplates();

        this.logger.log(`Created notification template: ${newTemplate.key}`);
        return newTemplate;
    }

    /**
     * Get all templates
     */
    async getAllTemplates(): Promise<NotificationTemplate[]> {
        return this.templatesCache;
    }

    /**
     * Get template by key and channel
     */
    async getTemplate(key: string, channel: string, locale = 'zh-TW'): Promise<NotificationTemplate | null> {
        return this.templatesCache.find(
            t => t.key === key && t.channel === channel && t.locale === locale && t.active
        ) || null;
    }

    /**
     * Update a template
     */
    async updateTemplate(id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate | null> {
        const index = this.templatesCache.findIndex(t => t.id === id);
        if (index === -1) return null;

        this.templatesCache[index] = {
            ...this.templatesCache[index],
            ...updates,
            updatedAt: new Date(),
        };
        await this.saveTemplates();

        return this.templatesCache[index];
    }

    /**
     * Delete a template
     */
    async deleteTemplate(id: string): Promise<boolean> {
        const index = this.templatesCache.findIndex(t => t.id === id);
        if (index === -1) return false;

        this.templatesCache.splice(index, 1);
        await this.saveTemplates();

        return true;
    }

    // ==================== Template Rendering ====================

    /**
     * Render a template with variables
     */
    async render(
        key: string,
        channel: string,
        variables: Record<string, string | number>,
        locale = 'zh-TW'
    ): Promise<RenderedNotification | null> {
        const template = await this.getTemplate(key, channel, locale);
        if (!template) return null;

        return {
            subject: template.subject ? this.interpolate(template.subject, variables) : undefined,
            title: template.title ? this.interpolate(template.title, variables) : undefined,
            body: this.interpolate(template.body, variables),
        };
    }

    /**
     * Interpolate variables into template string
     */
    private interpolate(text: string, variables: Record<string, string | number>): string {
        return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return variables[key]?.toString() ?? match;
        });
    }

    // ==================== Helpers ====================

    private async loadTemplates(): Promise<void> {
        try {
            const templates = await this.cache.get<NotificationTemplate[]>(this.TEMPLATES_KEY);
            this.templatesCache = templates || [];
        } catch (error) {
            this.logger.error('Failed to load templates', error);
        }
    }

    private async saveTemplates(): Promise<void> {
        await this.cache.set(this.TEMPLATES_KEY, this.templatesCache, { ttl: 0 });
    }

    private async seedDefaultTemplates(): Promise<void> {
        if (this.templatesCache.length > 0) return;

        const defaults: Omit<NotificationTemplate, 'id' | 'createdAt' | 'updatedAt'>[] = [
            {
                key: 'sos_alert',
                name: 'SOS 警報',
                channel: 'push',
                title: '🚨 緊急求救信號',
                body: '{{userName}} 在 {{location}} 發送了緊急求救信號',
                variables: ['userName', 'location'],
                locale: 'zh-TW',
                active: true,
            },
            {
                key: 'task_assigned',
                name: '任務指派',
                channel: 'push',
                title: '📋 新任務指派',
                body: '您已被指派任務：{{taskTitle}}',
                variables: ['taskTitle', 'priority'],
                locale: 'zh-TW',
                active: true,
            },
            {
                key: 'report_created',
                name: '新回報',
                channel: 'inapp',
                title: '📍 新現場回報',
                body: '{{reporterName}} 提交了一份 {{reportType}} 回報',
                variables: ['reporterName', 'reportType', 'location'],
                locale: 'zh-TW',
                active: true,
            },
            {
                key: 'weather_alert',
                name: '氣象警報',
                channel: 'push',
                title: '⛈️ 氣象警報',
                body: '{{alertType}}：{{description}}',
                variables: ['alertType', 'description', 'area'],
                locale: 'zh-TW',
                active: true,
            },
            {
                key: 'volunteer_approved',
                name: '志工審核通過',
                channel: 'email',
                subject: '恭喜！您的志工申請已通過',
                body: '親愛的 {{userName}}，\n\n您的志工申請已審核通過。歡迎加入光守護者團隊！\n\n登入系統：{{loginUrl}}',
                variables: ['userName', 'loginUrl'],
                locale: 'zh-TW',
                active: true,
            },
        ];

        for (const tpl of defaults) {
            await this.createTemplate(tpl);
        }
    }
}
