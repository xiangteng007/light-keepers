import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as line from '@line/bot-sdk';

export interface LineConfig {
    channelAccessToken: string;
    channelSecret: string;
}

@Injectable()
export class LineBotService {
    private readonly logger = new Logger(LineBotService.name);
    private client: line.messagingApi.MessagingApiClient | null = null;
    private config: LineConfig;

    constructor(private configService: ConfigService) {
        this.config = {
            channelAccessToken: this.configService.get('LINE_CHANNEL_ACCESS_TOKEN', ''),
            channelSecret: this.configService.get('LINE_CHANNEL_SECRET', ''),
        };

        if (this.config.channelAccessToken) {
            this.client = new line.messagingApi.MessagingApiClient({
                channelAccessToken: this.config.channelAccessToken,
            });
            this.logger.log('LINE Bot client initialized');
        } else {
            this.logger.warn('LINE credentials not configured - Bot disabled');
        }
    }

    getConfig(): LineConfig {
        return this.config;
    }

    isEnabled(): boolean {
        return !!this.client;
    }

    // === 推播訊息 ===

    // 發送文字訊息
    async pushText(userId: string, text: string): Promise<void> {
        if (!this.client) return;

        await this.client.pushMessage({
            to: userId,
            messages: [{ type: 'text', text }],
        });
        this.logger.log(`Pushed text to ${userId}`);
    }

    // 發送給多人
    async multicast(userIds: string[], text: string): Promise<void> {
        if (!this.client || userIds.length === 0) return;

        await this.client.multicast({
            to: userIds,
            messages: [{ type: 'text', text }],
        });
        this.logger.log(`Multicast to ${userIds.length} users`);
    }

    // 廣播給所有好友
    async broadcast(text: string): Promise<void> {
        if (!this.client) return;

        await this.client.broadcast({
            messages: [{ type: 'text', text }],
        });
        this.logger.log('Broadcast message sent');
    }

    // === 災害警報推播 ===
    async sendDisasterAlert(userIds: string[], alert: {
        title: string;
        description: string;
        severity: string;
        location?: string;
    }): Promise<void> {
        if (!this.client) return;

        const severityEmoji = alert.severity === 'high' ? '🔴' :
            alert.severity === 'medium' ? '🟡' : '🟢';

        const message: line.messagingApi.FlexMessage = {
            type: 'flex',
            altText: `⚠️ ${alert.title}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: '#FF5722',
                    contents: [{
                        type: 'text',
                        text: '⚠️ 災害警報',
                        color: '#ffffff',
                        weight: 'bold',
                        size: 'lg',
                    }],
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        {
                            type: 'text',
                            text: `${severityEmoji} ${alert.title}`,
                            weight: 'bold',
                            size: 'md',
                            wrap: true,
                        },
                        {
                            type: 'text',
                            text: alert.description,
                            size: 'sm',
                            color: '#666666',
                            wrap: true,
                            margin: 'md',
                        },
                        ...(alert.location ? [{
                            type: 'text' as const,
                            text: `📍 ${alert.location}`,
                            size: 'sm' as const,
                            color: '#888888',
                            margin: 'md' as const,
                        }] : []),
                    ],
                },
            },
        };

        await this.client.multicast({
            to: userIds,
            messages: [message],
        });
    }

    // === 任務通知 ===
    async sendTaskAssignment(userId: string, task: {
        id: string;
        title: string;
        location: string;
        scheduledStart: string;
    }): Promise<void> {
        if (!this.client) return;

        const message: line.messagingApi.FlexMessage = {
            type: 'flex',
            altText: `📋 新任務指派: ${task.title}`,
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: '#2196F3',
                    contents: [{
                        type: 'text',
                        text: '📋 新任務指派',
                        color: '#ffffff',
                        weight: 'bold',
                    }],
                },
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: task.title, weight: 'bold', size: 'md', wrap: true },
                        { type: 'text', text: `📍 ${task.location}`, size: 'sm', color: '#666666', margin: 'md' },
                        { type: 'text', text: `🕐 ${task.scheduledStart}`, size: 'sm', color: '#666666', margin: 'sm' },
                    ],
                },
                footer: {
                    type: 'box',
                    layout: 'horizontal',
                    spacing: 'sm',
                    contents: [
                        {
                            type: 'button',
                            style: 'primary',
                            action: { type: 'message', label: '接受', text: `接受任務 ${task.id}` },
                        },
                        {
                            type: 'button',
                            style: 'secondary',
                            action: { type: 'message', label: '拒絕', text: `拒絕任務 ${task.id}` },
                        },
                    ],
                },
            },
        };

        await this.client.pushMessage({
            to: userId,
            messages: [message],
        });
    }

    // === 回覆訊息 ===
    async replyMessage(replyToken: string, text: string): Promise<void> {
        if (!this.client) return;

        await this.client.replyMessage({
            replyToken,
            messages: [{ type: 'text', text }],
        });
    }

    // 回覆時數統計
    async replyServiceHours(replyToken: string, data: {
        name: string;
        totalHours: number;
        monthHours: number;
        taskCount: number;
    }): Promise<void> {
        if (!this.client) return;

        const message: line.messagingApi.FlexMessage = {
            type: 'flex',
            altText: '服務時數統計',
            contents: {
                type: 'bubble',
                body: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [
                        { type: 'text', text: '⏱️ 服務時數', weight: 'bold', size: 'lg' },
                        { type: 'text', text: data.name, size: 'sm', color: '#888888', margin: 'sm' },
                        { type: 'separator', margin: 'lg' },
                        {
                            type: 'box',
                            layout: 'vertical',
                            margin: 'lg',
                            contents: [
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    contents: [
                                        { type: 'text', text: '本月時數', size: 'sm', color: '#666666', flex: 1 },
                                        { type: 'text', text: `${data.monthHours} 小時`, size: 'sm', weight: 'bold', flex: 1, align: 'end' },
                                    ],
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    margin: 'sm',
                                    contents: [
                                        { type: 'text', text: '累計時數', size: 'sm', color: '#666666', flex: 1 },
                                        { type: 'text', text: `${data.totalHours} 小時`, size: 'sm', weight: 'bold', flex: 1, align: 'end' },
                                    ],
                                },
                                {
                                    type: 'box',
                                    layout: 'horizontal',
                                    margin: 'sm',
                                    contents: [
                                        { type: 'text', text: '完成任務', size: 'sm', color: '#666666', flex: 1 },
                                        { type: 'text', text: `${data.taskCount} 次`, size: 'sm', weight: 'bold', flex: 1, align: 'end' },
                                    ],
                                },
                            ],
                        },
                    ],
                },
            },
        };

        await this.client.replyMessage({
            replyToken,
            messages: [message],
        });
    }
}
