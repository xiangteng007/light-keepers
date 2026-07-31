import {
    Controller,
    Get,
    Post,
    Body,
    Headers,
    Req,
    Res,
    HttpStatus,
    Logger,
    UseGuards,
    Param,
    RawBodyRequest,
} from '@nestjs/common';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS, Public } from '../shared/guards';
import { Request, Response } from 'express';
import { LineBotService } from './line-bot.service';
import { DisasterReportService } from './disaster-report';
import { WebhookEvent, MessageEvent, TextEventMessage, ImageEventMessage, LocationEventMessage, validateSignature } from '@line/bot-sdk';

@Controller('line-bot')
export class LineBotController {
    private readonly logger = new Logger(LineBotController.name);

    constructor(
        private readonly lineBotService: LineBotService,
        private readonly disasterReportService: DisasterReportService,
    ) { }

    // Webhook 端點 - LINE 會發送事件到這裡
    //
    // ⚠️ 必須是公開端點：LINE 平台的請求不會帶 JWT，
    // 全域 GlobalAuthGuard 為 default-deny，未標記 @Public() 會一律 401。
    // 端點本身的認證由 x-line-signature HMAC 簽章驗證負責。
    @Public()
    @Post('webhook')
    async handleWebhook(
        @Headers('x-line-signature') signature: string,
        @Body() body: { events: WebhookEvent[] },
        @Req() req: RawBodyRequest<Request>,
        @Res() res: Response,
    ) {
        if (!this.lineBotService.isEnabled()) {
            return res.status(HttpStatus.OK).send('Bot not configured');
        }

        // 驗證簽章
        // 必須使用「原始 raw body」計算 HMAC（JSON.stringify 會改變位元組序列而導致驗證失敗），
        // 比對交由 SDK 的 validateSignature（內部使用 timingSafeEqual，constant-time）。
        const config = this.lineBotService.getConfig();
        const rawBody = req.rawBody;

        if (!rawBody) {
            this.logger.error('Raw body unavailable - ensure NestFactory.create({ rawBody: true })');
            return res.status(HttpStatus.UNAUTHORIZED).send('Invalid signature');
        }

        let signatureValid = false;
        try {
            signatureValid = !!signature && validateSignature(rawBody, config.channelSecret, signature);
        } catch {
            // 簽章非合法 base64 等格式問題一律視為驗證失敗
            signatureValid = false;
        }

        if (!signatureValid) {
            this.logger.warn('Invalid signature');
            return res.status(HttpStatus.UNAUTHORIZED).send('Invalid signature');
        }

        // 處理事件
        const events = body.events || [];
        for (const event of events) {
            await this.handleEvent(event);
        }

        return res.status(HttpStatus.OK).send('OK');
    }

    // 處理各種事件
    private async handleEvent(event: WebhookEvent) {
        this.logger.log(`Received event: ${event.type}`);

        if (event.type === 'message') {
            const replyToken = event.replyToken;
            const userId = event.source.userId;

            if (event.message.type === 'text') {
                const text = event.message.text.trim();
                await this.handleTextMessage(text, replyToken, userId);
            } else if (event.message.type === 'image') {
                await this.handleImageMessage(event.message.id, replyToken, userId);
            } else if (event.message.type === 'location') {
                await this.handleLocationMessage(
                    event.message.latitude,
                    event.message.longitude,
                    event.message.address,
                    replyToken,
                    userId,
                );
            }
        } else if (event.type === 'follow') {
            // 新追蹤者
            await this.lineBotService.replyMessage(
                event.replyToken,
                '歡迎加入 Light Keepers 災害救援小秘書！🙌\n\n' +
                '您可以使用以下指令：\n' +
                '🚨 「回報」回報災情\n' +
                '📋 「任務」查看待辦任務\n' +
                '⏱️ 「時數」查看服務時數\n' +
                '✅ 「簽到」開始執勤\n' +
                '🔚 「簽退」結束執勤'
            );
        }
    }

    // 處理圖片訊息
    private async handleImageMessage(messageId: string, replyToken: string, userId?: string) {
        if (!userId) return;

        const result = await this.disasterReportService.handleImageMessage(userId, messageId);

        if (result.shouldReply && result.replyMessage) {
            await this.lineBotService.replyMessage(replyToken, result.replyMessage);
        }
    }

    // 處理位置訊息
    private async handleLocationMessage(
        latitude: number,
        longitude: number,
        address: string | undefined,
        replyToken: string,
        userId?: string,
    ) {
        if (!userId) return;

        const result = await this.disasterReportService.handleLocationMessage(
            userId,
            latitude,
            longitude,
            address,
        );

        if (result.shouldReply && result.replyMessage) {
            await this.lineBotService.replyMessage(replyToken, result.replyMessage);
        }
    }


    // 處理文字訊息
    private async handleTextMessage(text: string, replyToken: string, userId?: string) {
        const lowerText = text.toLowerCase();

        // === 災情回報流程（優先處理） ===
        if (userId) {
            // 檢查是否在回報流程中，或是觸發回報的關鍵字
            const isInFlow = await this.disasterReportService.isUserInReportFlow(userId);
            const isTrigger = this.disasterReportService.isReportTrigger(text);

            if (isInFlow || isTrigger) {
                const result = await this.disasterReportService.handleTextMessage(userId, text);
                if (result.shouldReply && result.replyMessage) {
                    await this.lineBotService.replyMessage(replyToken, result.replyMessage);
                    return;
                }
            }
        }

        // 綁定帳號
        if (lowerText.includes('綁定')) {
            if (userId) {
                // 檢查是否已綁定
                const status = await this.lineBotService.getBindingStatus(userId);
                if (status.bound) {
                    await this.lineBotService.replyMessage(
                        replyToken,
                        '✅ 您的帳號已綁定！\n\n' +
                        '如需解除綁定，請發送「解除綁定」。'
                    );
                } else {
                    await this.lineBotService.sendBindingMessage(replyToken, userId);
                }
            } else {
                await this.lineBotService.replyMessage(replyToken, '無法取得您的 LINE ID，請稍後再試。');
            }
            return;
        }

        // 解除綁定
        if (lowerText.includes('解除綁定')) {
            if (userId) {
                const status = await this.lineBotService.getBindingStatus(userId);
                if (status.bound && status.accountId) {
                    const success = await this.lineBotService.unbindAccount(status.accountId);
                    if (success) {
                        await this.lineBotService.replyMessage(replyToken, '✅ 已解除帳號綁定。');
                    } else {
                        await this.lineBotService.replyMessage(replyToken, '❌ 解除綁定失敗，請稍後再試。');
                    }
                } else {
                    await this.lineBotService.replyMessage(replyToken, '您的帳號尚未綁定。');
                }
            }
            return;
        }

        // 簽到
        if (lowerText.includes('簽到')) {
            await this.lineBotService.replyMessage(
                replyToken,
                '✅ 簽到成功！\n\n' +
                '請分享您的位置以完成定位簽到。\n' +
                '（點擊「+」→「位置資訊」）'
            );
            return;
        }

        // 簽退
        if (lowerText.includes('簽退')) {
            await this.lineBotService.replyMessage(
                replyToken,
                '🔚 簽退成功！\n\n' +
                '本次服務時數：2.5 小時\n' +
                '感謝您的辛勞付出！💪'
            );
            return;
        }

        // 任務查詢
        if (lowerText.includes('任務')) {
            await this.lineBotService.replyMessage(
                replyToken,
                '📋 您目前的任務：\n\n' +
                '1. 物資運送 - 新北市板橋區\n' +
                '   🕐 今天 14:00\n\n' +
                '2. 避難所支援 - 台北市信義區\n' +
                '   🕐 明天 09:00\n\n' +
                '輸入「接受任務 1」接受任務'
            );
            return;
        }

        // 時數查詢
        if (lowerText.includes('時數')) {
            await this.lineBotService.replyServiceHours(replyToken, {
                name: '志工',
                totalHours: 120,
                monthHours: 8.5,
                taskCount: 15,
            });
            return;
        }

        // 接受任務
        if (lowerText.includes('接受任務')) {
            await this.lineBotService.replyMessage(
                replyToken,
                '✅ 已接受任務！\n\n' +
                '任務詳情已發送，請準時報到。\n' +
                '記得執勤時傳「簽到」喔！'
            );
            return;
        }

        // 拒絕任務
        if (lowerText.includes('拒絕任務')) {
            await this.lineBotService.replyMessage(
                replyToken,
                '已取消任務指派。\n' +
                '如有問題請聯繫調度中心。'
            );
            return;
        }

        // 預設回覆
        await this.lineBotService.replyMessage(
            replyToken,
            '🤖 Light Keepers 小秘書\n\n' +
            '可用指令：\n' +
            '🚨 「回報」- 回報災情\n' +
            '📋 「任務」- 查看待辦任務\n' +
            '⏱️ 「時數」- 查看服務時數\n' +
            '✅ 「簽到」- 開始執勤\n' +
            '🔚 「簽退」- 結束執勤'
        );
    }

    // === 系統推播 API ===

    // 發送災害警報
    @Post('alert')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async sendAlert(
        @Body() body: {
            userIds: string[];
            title: string;
            description: string;
            severity: string;
            location?: string;
        },
    ) {
        if (!this.lineBotService.isEnabled()) {
            return { success: false, message: 'Bot not configured' };
        }

        await this.lineBotService.sendDisasterAlert(body.userIds, {
            title: body.title,
            description: body.description,
            severity: body.severity,
            location: body.location,
        });

        return { success: true, message: `Alert sent to ${body.userIds.length} users` };
    }

    // 發送廣播
    @Post('broadcast')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async broadcast(@Body() body: { message: string }) {
        if (!this.lineBotService.isEnabled()) {
            return { success: false, message: 'Bot not configured' };
        }

        await this.lineBotService.broadcast(body.message);
        return { success: true, message: 'Broadcast sent' };
    }

    // Rich Menu 配置 (手動上傳用)
    @Get('rich-menu-config')
    getRichMenuConfig() {
        return {
            success: true,
            data: this.lineBotService.getRichMenuConfig(),
            instructions: {
                step1: '複製 data 的 JSON 內容',
                step2: '到 LINE Developers Console → Messaging API → Rich menus',
                step3: '建立 Rich Menu 並貼上 JSON',
                step4: '上傳 2500x1686 的選單圖片',
                step5: '設為預設 Rich Menu',
            },
        };
    }

    // === 帳號綁定 API ===

    // 執行帳號綁定（由前端呼叫）
    @Post('bind')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async bindAccount(@Body() body: { accountId: string; lineUserId: string }) {
        const success = await this.lineBotService.bindAccount(body.accountId, body.lineUserId);
        return { success, message: success ? '綁定成功' : '綁定失敗' };
    }

    // 解除帳號綁定
    @Post('unbind')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.VOLUNTEER)
    async unbindAccount(@Body() body: { accountId: string }) {
        const success = await this.lineBotService.unbindAccount(body.accountId);
        return { success, message: success ? '解除綁定成功' : '解除綁定失敗' };
    }

    // 取得綁定狀態
    @Get('binding-status/:lineUserId')
    async getBindingStatus(@Headers('x-line-user-id') lineUserId: string) {
        const status = await this.lineBotService.getBindingStatus(lineUserId);
        return { success: true, ...status };
    }

    // 取得已綁定用戶數
    @Get('stats')
    async getStats() {
        const boundUserCount = await this.lineBotService.getBoundUserCount();
        return {
            success: true,
            boundUserCount,
            botEnabled: this.lineBotService.isEnabled(),
        };
    }

    // === 管理員 NCDR 推播 API ===

    // 手動推播 NCDR 示警（管理員用）
    @Post('ncdr-broadcast')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async broadcastNcdrAlert(@Body() body: {
        title: string;
        description: string;
        severity: 'critical' | 'warning' | 'info';
        affectedAreas?: string;
    }) {
        if (!this.lineBotService.isEnabled()) {
            return { success: false, message: 'Bot not configured', sentCount: 0 };
        }

        const result = await this.lineBotService.broadcastNcdrAlert(body);
        return {
            success: result.success,
            message: result.success ? `成功推播給 ${result.sentCount} 位用戶` : '推播失敗',
            sentCount: result.sentCount,
        };
    }

    // 推播給特定區域
    @Post('ncdr-broadcast/region')
    @UseGuards(CoreJwtGuard, UnifiedRolesGuard)
    @RequiredLevel(ROLE_LEVELS.DIRECTOR)
    async broadcastToRegion(@Body() body: {
        region: string;
        title: string;
        description: string;
        severity: string;
    }) {
        if (!this.lineBotService.isEnabled()) {
            return { success: false, message: 'Bot not configured', sentCount: 0 };
        }

        const result = await this.lineBotService.sendAlertToRegion(body.region, {
            title: body.title,
            description: body.description,
            severity: body.severity,
        });

        return {
            success: result.success,
            message: result.success ? `成功推播給 ${body.region} 區域 ${result.sentCount} 位用戶` : '推播失敗',
            sentCount: result.sentCount,
        };
    }
}
