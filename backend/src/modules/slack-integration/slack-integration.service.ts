import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Slack Integration Service
 * Webhook notifications to Slack channels
 * 
 * 📋 需要設定:
 * - SLACK_WEBHOOK_URL: Slack Incoming Webhook URL
 */
@Injectable()
export class SlackIntegrationService {
    private readonly logger = new Logger(SlackIntegrationService.name);

    constructor(private configService: ConfigService) { }

    /**
     * 發送訊息
     */
    async sendMessage(text: string, webhookUrl?: string): Promise<SlackResult> {
        const url = webhookUrl || this.configService.get<string>('SLACK_WEBHOOK_URL');

        if (!url) {
            return { success: false, error: 'Webhook URL not configured' };
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text }),
            });

            return { success: response.ok };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * 發送 Block Kit 訊息
     */
    async sendBlocks(blocks: SlackBlock[], webhookUrl?: string): Promise<SlackResult> {
        const url = webhookUrl || this.configService.get<string>('SLACK_WEBHOOK_URL');

        try {
            const response = await fetch(url!, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blocks }),
            });

            return { success: response.ok };
        } catch (error) {
            return { success: false, error: String(error) };
        }
    }

    /**
     * 發送警報
     */
    async sendAlert(alert: AlertPayload): Promise<SlackResult> {
        const color = alert.severity === 'critical' ? '#FF0000' : alert.severity === 'warning' ? '#FFA500' : '#0088FF';

        const blocks: SlackBlock[] = [
            { type: 'header', text: { type: 'plain_text', text: `🚨 ${alert.title}` } },
            { type: 'section', text: { type: 'mrkdwn', text: alert.description } },
            {
                type: 'context', elements: [
                    { type: 'mrkdwn', text: `📍 *Location:* ${alert.location || 'Unknown'}` },
                    { type: 'mrkdwn', text: `⏰ *Time:* ${new Date().toLocaleString('zh-TW')}` },
                ]
            },
            { type: 'divider' },
        ];

        if (alert.actions?.length) {
            blocks.push({
                type: 'actions',
                elements: alert.actions.map((a) => ({
                    type: 'button',
                    text: { type: 'plain_text', text: a.text },
                    url: a.url,
                    style: a.style || 'primary',
                })),
            });
        }

        return this.sendBlocks(blocks);
    }

    /**
     * 發送事件摘要
     */
    async sendIncidentSummary(incident: IncidentSummary): Promise<SlackResult> {
        const blocks: SlackBlock[] = [
            { type: 'header', text: { type: 'plain_text', text: `📊 事件摘要: ${incident.title}` } },
            {
                type: 'section', fields: [
                    { type: 'mrkdwn', text: `*狀態:*\n${incident.status}` },
                    { type: 'mrkdwn', text: `*嚴重程度:*\n${incident.severity}` },
                    { type: 'mrkdwn', text: `*派遣人數:*\n${incident.dispatchedCount}` },
                    { type: 'mrkdwn', text: `*持續時間:*\n${incident.duration}` },
                ]
            },
        ];

        return this.sendBlocks(blocks);
    }

    /**
     * 發送每日統計
     */
    async sendDailyStats(stats: DailyStats): Promise<SlackResult> {
        const text = `
📈 *每日統計 - ${stats.date}*
━━━━━━━━━━━━━━━━━
• 事件數: ${stats.incidents}
• 警報數: ${stats.alerts}
• 派遣人次: ${stats.dispatches}
• 完成任務: ${stats.tasksCompleted}
━━━━━━━━━━━━━━━━━
`;
        return this.sendMessage(text);
    }
}

// Types
interface SlackResult { success: boolean; error?: string; }
interface SlackBlock { type: string; text?: any; elements?: any[]; fields?: any[]; }
interface AlertPayload { title: string; description: string; severity: string; location?: string; actions?: { text: string; url: string; style?: string }[]; }
interface IncidentSummary { title: string; status: string; severity: string; dispatchedCount: number; duration: string; }
interface DailyStats { date: string; incidents: number; alerts: number; dispatches: number; tasksCompleted: number; }
