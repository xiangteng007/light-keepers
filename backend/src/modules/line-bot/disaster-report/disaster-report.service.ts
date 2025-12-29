/**
 * 災情回報對話流程服務
 * BOT-REPORT-001-03
 * 
 * 處理多步驟對話狀態機：文字 → 照片 → 定位 → 送出
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SessionStateService } from './session-state.service';
import { ImageUploadService } from './image-upload.service';
import { ReportsService } from '../../reports/reports.service';
import {
    ReportSession,
    ReportSessionState,
    LocationData,
    CreateDisasterReportResponse,
} from './disaster-report.types';
import {
    MESSAGES,
    REPORT_TRIGGER_KEYWORDS,
    CANCEL_KEYWORDS,
    SKIP_IMAGE_KEYWORDS,
    CONFIRM_KEYWORDS,
    detectDisasterType,
} from './disaster-report.constants';

export interface HandleEventResult {
    shouldReply: boolean;
    replyMessage?: string;
}

@Injectable()
export class DisasterReportService {
    private readonly logger = new Logger(DisasterReportService.name);

    constructor(
        private readonly configService: ConfigService,
        private readonly sessionService: SessionStateService,
        private readonly imageUploadService: ImageUploadService,
        private readonly reportsService: ReportsService,
    ) { }

    /**
     * 檢查是否為回報觸發關鍵字
     */
    isReportTrigger(text: string): boolean {
        const lowerText = text.toLowerCase().trim();
        return REPORT_TRIGGER_KEYWORDS.some(kw => lowerText.includes(kw));
    }

    /**
     * 檢查是否為取消指令
     */
    private isCancelCommand(text: string): boolean {
        const lowerText = text.toLowerCase().trim();
        return CANCEL_KEYWORDS.some(kw => lowerText.includes(kw));
    }

    /**
     * 檢查是否為跳過圖片指令
     */
    private isSkipImageCommand(text: string): boolean {
        const lowerText = text.toLowerCase().trim();
        return SKIP_IMAGE_KEYWORDS.some(kw => lowerText.includes(kw));
    }

    /**
     * 檢查是否為確認指令
     */
    private isConfirmCommand(text: string): boolean {
        const lowerText = text.toLowerCase().trim();
        return CONFIRM_KEYWORDS.some(kw => lowerText.includes(kw));
    }

    /**
     * 處理文字訊息
     */
    async handleTextMessage(
        lineUserId: string,
        text: string,
        displayName?: string,
    ): Promise<HandleEventResult> {
        const session = await this.sessionService.getSession(lineUserId);

        // 檢查取消指令（任何狀態都可取消）
        if (session && this.isCancelCommand(text)) {
            await this.cancelReport(lineUserId);
            return { shouldReply: true, replyMessage: MESSAGES.CANCELLED };
        }

        // 如果沒有 session，檢查是否為觸發關鍵字
        if (!session) {
            if (this.isReportTrigger(text)) {
                await this.sessionService.createSession(lineUserId, displayName);
                return { shouldReply: true, replyMessage: MESSAGES.WELCOME };
            }
            return { shouldReply: false };
        }

        // 根據當前狀態處理
        switch (session.state) {
            case ReportSessionState.WAIT_TEXT:
                return this.handleWaitTextState(lineUserId, text);

            case ReportSessionState.WAIT_IMAGE:
                return this.handleWaitImageTextInput(lineUserId, text);

            case ReportSessionState.WAIT_LOCATION:
                return this.handleWaitLocationTextInput(lineUserId, text);

            case ReportSessionState.CONFIRM:
                return this.handleConfirmState(lineUserId, text);

            default:
                return { shouldReply: false };
        }
    }

    /**
     * 處理 WAIT_TEXT 狀態的文字輸入
     */
    private async handleWaitTextState(
        lineUserId: string,
        text: string,
    ): Promise<HandleEventResult> {
        // 驗證文字輸入
        if (!text || text.trim().length < 5) {
            return { shouldReply: true, replyMessage: MESSAGES.ERROR.INVALID_TEXT };
        }

        // 儲存描述並進入下一狀態
        await this.sessionService.setText(lineUserId, text.trim());
        await this.sessionService.updateState(lineUserId, ReportSessionState.WAIT_IMAGE);

        return { shouldReply: true, replyMessage: MESSAGES.WAIT_IMAGE };
    }

    /**
     * 處理 WAIT_IMAGE 狀態的文字輸入（跳過或完成）
     */
    private async handleWaitImageTextInput(
        lineUserId: string,
        text: string,
    ): Promise<HandleEventResult> {
        // 檢查是否跳過或完成
        if (this.isSkipImageCommand(text) || text.includes('完成')) {
            await this.sessionService.updateState(lineUserId, ReportSessionState.WAIT_LOCATION);
            return { shouldReply: true, replyMessage: MESSAGES.WAIT_LOCATION };
        }

        return { shouldReply: true, replyMessage: MESSAGES.ERROR.INVALID_IMAGE };
    }

    /**
     * 處理 WAIT_LOCATION 狀態的文字輸入
     */
    private async handleWaitLocationTextInput(
        lineUserId: string,
        text: string,
    ): Promise<HandleEventResult> {
        // 位置只能透過 location message 提供
        return { shouldReply: true, replyMessage: MESSAGES.ERROR.INVALID_LOCATION };
    }

    /**
     * 處理 CONFIRM 狀態
     */
    private async handleConfirmState(
        lineUserId: string,
        text: string,
    ): Promise<HandleEventResult> {
        if (this.isConfirmCommand(text)) {
            // 送出回報
            return this.submitReport(lineUserId);
        }

        if (this.isCancelCommand(text)) {
            await this.cancelReport(lineUserId);
            return { shouldReply: true, replyMessage: MESSAGES.CANCELLED };
        }

        return { shouldReply: true, replyMessage: MESSAGES.ERROR.INVALID_CONFIRM };
    }

    /**
     * 處理圖片訊息
     */
    async handleImageMessage(
        lineUserId: string,
        messageId: string,
    ): Promise<HandleEventResult> {
        const session = await this.sessionService.getSession(lineUserId);

        if (!session || session.state !== ReportSessionState.WAIT_IMAGE) {
            // 不在等待圖片的狀態
            return { shouldReply: false };
        }

        try {
            // 取得 channel access token
            const channelAccessToken = this.configService.get('LINE_CHANNEL_ACCESS_TOKEN', '');

            // 上傳圖片
            const imageUrl = await this.imageUploadService.uploadFromLine(
                messageId,
                lineUserId,
                channelAccessToken,
            );

            // 新增至 session
            await this.sessionService.addImage(lineUserId, imageUrl);

            const updatedSession = await this.sessionService.getSession(lineUserId);
            const imageCount = updatedSession?.data.imageUrls?.length || 0;

            this.logger.log(`Image received from ${lineUserId}, total: ${imageCount}`);

            return {
                shouldReply: true,
                replyMessage: MESSAGES.IMAGE_RECEIVED,
            };
        } catch (error) {
            this.logger.error(`Failed to process image: ${error.message}`);
            return { shouldReply: true, replyMessage: MESSAGES.ERROR.GENERAL };
        }
    }

    /**
     * 處理位置訊息
     */
    async handleLocationMessage(
        lineUserId: string,
        latitude: number,
        longitude: number,
        address?: string,
    ): Promise<HandleEventResult> {
        const session = await this.sessionService.getSession(lineUserId);

        if (!session || session.state !== ReportSessionState.WAIT_LOCATION) {
            return { shouldReply: false };
        }

        // 儲存位置
        const location: LocationData = {
            lat: latitude,
            lng: longitude,
            address,
        };
        await this.sessionService.setLocation(lineUserId, location);
        await this.sessionService.updateState(lineUserId, ReportSessionState.CONFIRM);

        const updatedSession = await this.sessionService.getSession(lineUserId);
        if (!updatedSession) {
            return { shouldReply: true, replyMessage: MESSAGES.ERROR.GENERAL };
        }

        // 生成確認訊息
        const confirmMessage = MESSAGES.CONFIRM_TEMPLATE({
            text: updatedSession.data.text || '',
            imageCount: updatedSession.data.imageUrls?.length || 0,
            address: location.address,
        });

        return { shouldReply: true, replyMessage: confirmMessage };
    }

    /**
     * 送出災情回報
     */
    private async submitReport(lineUserId: string): Promise<HandleEventResult> {
        const session = await this.sessionService.getSession(lineUserId);

        if (!session || !session.data.text || !session.data.location) {
            return { shouldReply: true, replyMessage: MESSAGES.ERROR.GENERAL };
        }

        try {
            // 判斷災情類型
            const disasterType = detectDisasterType(session.data.text);

            // 建立回報（來自 LINE Bot）
            const report = await this.reportsService.create({
                type: disasterType as any,
                severity: 'medium',
                title: session.data.text.substring(0, 50),
                description: session.data.text,
                latitude: session.data.location.lat,
                longitude: session.data.location.lng,
                address: session.data.location.address,
                photos: session.data.imageUrls,
                contactName: session.displayName,
                // LINE 來源追蹤
                source: 'line',
                reporterLineUserId: lineUserId,
                reporterLineDisplayName: session.displayName,
            });

            this.logger.log(`Report created: ${report.id} by ${lineUserId}`);

            // 清除 session
            await this.sessionService.deleteSession(lineUserId);

            return {
                shouldReply: true,
                replyMessage: MESSAGES.SUCCESS_TEMPLATE(report.id),
            };
        } catch (error) {
            this.logger.error(`Failed to submit report: ${error.message}`);
            return { shouldReply: true, replyMessage: MESSAGES.ERROR.SUBMIT_FAILED };
        }
    }

    /**
     * 取消回報
     */
    private async cancelReport(lineUserId: string): Promise<void> {
        const session = await this.sessionService.getSession(lineUserId);

        // 刪除已上傳的圖片（可選）
        if (session?.data.imageUrls) {
            for (const imageUrl of session.data.imageUrls) {
                await this.imageUploadService.deleteImage(imageUrl);
            }
        }

        await this.sessionService.deleteSession(lineUserId);
        this.logger.log(`Report cancelled by ${lineUserId}`);
    }

    /**
     * 檢查使用者是否在回報流程中
     */
    async isUserInReportFlow(lineUserId: string): Promise<boolean> {
        return this.sessionService.isInReportFlow(lineUserId);
    }

    /**
     * 取得服務統計
     */
    getStats() {
        return this.sessionService.getStats();
    }
}
