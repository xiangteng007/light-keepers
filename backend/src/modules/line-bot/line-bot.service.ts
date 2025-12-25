import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as line from '@line/bot-sdk';
import { Account } from '../accounts/entities';

export interface LineConfig {
    channelAccessToken: string;
    channelSecret: string;
}

@Injectable()
export class LineBotService {
    private readonly logger = new Logger(LineBotService.name);
    private client: line.messagingApi.MessagingApiClient | null = null;
    private config: LineConfig;

    constructor(
        private configService: ConfigService,
        @InjectRepository(Account)
        private readonly accountRepository: Repository<Account>,
    ) {
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

    /**
     * 發送 OTP 驗證碼到 LINE
     */
    async sendOtp(lineUserId: string, code: string): Promise<boolean> {
        if (!this.client) {
            this.logger.warn(`[DEV MODE] LINE OTP for ${lineUserId}: ${code}`);
            return true;
        }

        try {
            const message = `【曦望燈塔驗證碼】\n\n您的驗證碼是：${code}\n\n⏰ 有效期限 5 分鐘\n⚠️ 請勿將驗證碼告知他人`;
            await this.pushText(lineUserId, message);
            this.logger.log(`OTP sent to LINE user ${lineUserId.substring(0, 8)}...`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to send LINE OTP: ${error.message}`);
            this.logger.warn(`[DEV MODE] LINE OTP for ${lineUserId}: ${code}`);
            return true;
        }
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

    // === Option C: Rich Menu 管理 ===

    // 取得 Rich Menu 配置 JSON (需手動上傳圖片到 LINE)
    getRichMenuConfig(): object {
        return {
            size: { width: 2500, height: 1686 },
            selected: true,
            name: 'Light Keepers 主選單',
            chatBarText: '📋 選單',
            areas: [
                {
                    bounds: { x: 0, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: '任務' },
                },
                {
                    bounds: { x: 833, y: 0, width: 834, height: 843 },
                    action: { type: 'message', text: '時數' },
                },
                {
                    bounds: { x: 1667, y: 0, width: 833, height: 843 },
                    action: { type: 'message', text: '簽到' },
                },
                {
                    bounds: { x: 0, y: 843, width: 833, height: 843 },
                    action: { type: 'uri', uri: 'https://light-keepers-dashboard.vercel.app/report' },
                },
                {
                    bounds: { x: 833, y: 843, width: 834, height: 843 },
                    action: { type: 'uri', uri: 'https://light-keepers-dashboard.vercel.app/training' },
                },
                {
                    bounds: { x: 1667, y: 843, width: 833, height: 843 },
                    action: { type: 'message', text: '說明' },
                },
            ],
        };
    }

    // === 帳號綁定功能 ===

    /**
     * 生成帳號綁定連結
     */
    generateBindingLink(lineUserId: string): string {
        const frontendUrl = this.configService.get('FRONTEND_URL', 'https://light-keepers-dashboard.vercel.app');
        // 使用 LINE User ID 作為綁定 token
        const bindingToken = Buffer.from(`${lineUserId}:${Date.now()}`).toString('base64');
        return `${frontendUrl}/bind-line?token=${bindingToken}`;
    }

    /**
     * 發送帳號綁定訊息
     */
    async sendBindingMessage(replyToken: string, lineUserId: string): Promise<void> {
        if (!this.client) return;

        const bindingLink = this.generateBindingLink(lineUserId);

        const message: line.messagingApi.FlexMessage = {
            type: 'flex',
            altText: '🔗 帳號綁定',
            contents: {
                type: 'bubble',
                header: {
                    type: 'box',
                    layout: 'vertical',
                    backgroundColor: '#4CAF50',
                    contents: [{
                        type: 'text',
                        text: '🔗 帳號綁定',
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
                            text: '請點擊下方按鈕綁定您的志工帳號，綁定後即可收到任務通知和災害警報。',
                            wrap: true,
                            size: 'sm',
                            color: '#666666',
                        },
                    ],
                },
                footer: {
                    type: 'box',
                    layout: 'vertical',
                    contents: [{
                        type: 'button',
                        style: 'primary',
                        action: {
                            type: 'uri',
                            label: '立即綁定',
                            uri: bindingLink,
                        },
                    }],
                },
            },
        };

        await this.client.replyMessage({
            replyToken,
            messages: [message],
        });
    }

    /**
     * 綁定 LINE 帳號到系統帳號
     */
    async bindAccount(accountId: string, lineUserId: string): Promise<boolean> {
        try {
            const account = await this.accountRepository.findOne({ where: { id: accountId } });
            if (!account) {
                this.logger.warn(`Account ${accountId} not found for LINE binding`);
                return false;
            }

            account.lineUserId = lineUserId;
            await this.accountRepository.save(account);

            // 發送綁定成功通知
            await this.pushText(lineUserId, '✅ 帳號綁定成功！\n\n您現在可以透過 LINE 接收任務通知和災害警報了。');

            this.logger.log(`Bound LINE user ${lineUserId} to account ${accountId}`);
            return true;
        } catch (error) {
            this.logger.error(`Failed to bind account: ${error.message}`);
            return false;
        }
    }

    /**
     * 解除 LINE 帳號綁定
     */
    async unbindAccount(accountId: string): Promise<boolean> {
        try {
            const account = await this.accountRepository.findOne({ where: { id: accountId } });
            if (!account) return false;

            const lineUserId = account.lineUserId;
            account.lineUserId = undefined as any;
            await this.accountRepository.save(account);

            if (lineUserId) {
                await this.pushText(lineUserId, '已解除帳號綁定。如需重新綁定，請發送「綁定」。');
            }

            return true;
        } catch (error) {
            this.logger.error(`Failed to unbind account: ${error.message}`);
            return false;
        }
    }

    /**
     * 查詢綁定狀態
     */
    async getBindingStatus(lineUserId: string): Promise<{ bound: boolean; accountId?: string }> {
        const account = await this.accountRepository.findOne({ where: { lineUserId } });
        return {
            bound: !!account,
            accountId: account?.id,
        };
    }

    // === NCDR 災害推播整合 ===

    /**
     * 推播 NCDR 災害示警給所有綁定用戶
     */
    async broadcastNcdrAlert(alert: {
        title: string;
        description: string;
        severity: 'critical' | 'warning' | 'info';
        affectedAreas?: string;
        sourceLink?: string;
    }): Promise<{ success: boolean; sentCount: number }> {
        if (!this.client) {
            return { success: false, sentCount: 0 };
        }

        try {
            // 獲取所有綁定 LINE 的用戶
            const boundAccounts = await this.accountRepository
                .createQueryBuilder('account')
                .where('account.lineUserId IS NOT NULL')
                .andWhere('account.prefAlertNotifications = true')
                .select(['account.lineUserId'])
                .getMany();

            if (boundAccounts.length === 0) {
                return { success: true, sentCount: 0 };
            }

            const userIds = boundAccounts.map(a => a.lineUserId).filter(Boolean) as string[];

            // 使用現有的災害警報方法
            await this.sendDisasterAlert(userIds, {
                title: alert.title,
                description: alert.description,
                severity: alert.severity === 'critical' ? 'high' : alert.severity === 'warning' ? 'medium' : 'low',
                location: alert.affectedAreas,
            });

            this.logger.log(`Broadcast NCDR alert to ${userIds.length} users`);
            return { success: true, sentCount: userIds.length };
        } catch (error) {
            this.logger.error(`Failed to broadcast NCDR alert: ${error.message}`);
            return { success: false, sentCount: 0 };
        }
    }

    /**
     * 推播給特定區域的用戶
     */
    async sendAlertToRegion(region: string, alert: {
        title: string;
        description: string;
        severity: string;
    }): Promise<{ success: boolean; sentCount: number }> {
        if (!this.client) {
            return { success: false, sentCount: 0 };
        }

        try {
            // TODO: 實作區域篩選邏輯（需要在 Account 中添加區域欄位）
            // 暫時廣播給所有用戶
            return this.broadcastNcdrAlert({
                title: alert.title,
                description: alert.description,
                severity: alert.severity as 'critical' | 'warning' | 'info',
                affectedAreas: region,
            });
        } catch (error) {
            this.logger.error(`Failed to send alert to region: ${error.message}`);
            return { success: false, sentCount: 0 };
        }
    }

    /**
     * 獲取已綁定 LINE 的用戶數
     */
    async getBoundUserCount(): Promise<number> {
        return this.accountRepository
            .createQueryBuilder('account')
            .where('account.lineUserId IS NOT NULL')
            .getCount();
    }
}
