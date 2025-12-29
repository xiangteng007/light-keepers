/**
 * 災情回報 Session 狀態管理服務
 * BOT-REPORT-001-02
 * 
 * 目前使用記憶體存儲，未來可遷移至 Firestore
 * 注意：多實例部署時需改用 Firestore 或 Redis
 */

import { Injectable, Logger } from '@nestjs/common';
import {
    ReportSession,
    ReportSessionState,
    ReportSessionData,
    LocationData,
} from './disaster-report.types';
import { SESSION_TIMEOUT_MS } from './disaster-report.constants';

@Injectable()
export class SessionStateService {
    private readonly logger = new Logger(SessionStateService.name);

    // 記憶體存儲（key: lineUserId）
    private sessions: Map<string, ReportSession> = new Map();

    /**
     * 取得或建立 Session
     */
    async getSession(lineUserId: string): Promise<ReportSession | null> {
        const session = this.sessions.get(lineUserId);

        if (!session) {
            return null;
        }

        // 檢查是否過期
        if (new Date() > session.expiresAt) {
            this.logger.log(`Session expired for user ${lineUserId}`);
            await this.deleteSession(lineUserId);
            return null;
        }

        return session;
    }

    /**
     * 建立新 Session（開始回報流程）
     */
    async createSession(lineUserId: string, displayName?: string): Promise<ReportSession> {
        const now = new Date();
        const session: ReportSession = {
            lineUserId,
            displayName,
            state: ReportSessionState.WAIT_TEXT,
            data: {},
            startedAt: now,
            expiresAt: new Date(now.getTime() + SESSION_TIMEOUT_MS),
            updatedAt: now,
        };

        this.sessions.set(lineUserId, session);
        this.logger.log(`Session created for user ${lineUserId}`);

        return session;
    }

    /**
     * 更新 Session 狀態
     */
    async updateState(lineUserId: string, state: ReportSessionState): Promise<ReportSession | null> {
        const session = await this.getSession(lineUserId);
        if (!session) {
            return null;
        }

        session.state = state;
        session.updatedAt = new Date();
        this.sessions.set(lineUserId, session);

        this.logger.log(`Session state updated: ${lineUserId} -> ${state}`);
        return session;
    }

    /**
     * 更新 Session 資料
     */
    async updateData(lineUserId: string, data: Partial<ReportSessionData>): Promise<ReportSession | null> {
        const session = await this.getSession(lineUserId);
        if (!session) {
            return null;
        }

        session.data = { ...session.data, ...data };
        session.updatedAt = new Date();
        this.sessions.set(lineUserId, session);

        return session;
    }

    /**
     * 設定災情描述文字
     */
    async setText(lineUserId: string, text: string): Promise<ReportSession | null> {
        return this.updateData(lineUserId, { text });
    }

    /**
     * 新增圖片 URL
     */
    async addImage(lineUserId: string, imageUrl: string): Promise<ReportSession | null> {
        const session = await this.getSession(lineUserId);
        if (!session) {
            return null;
        }

        const imageUrls = session.data.imageUrls || [];
        imageUrls.push(imageUrl);

        return this.updateData(lineUserId, { imageUrls });
    }

    /**
     * 設定位置資料
     */
    async setLocation(lineUserId: string, location: LocationData): Promise<ReportSession | null> {
        return this.updateData(lineUserId, { location });
    }

    /**
     * 刪除 Session（完成或取消）
     */
    async deleteSession(lineUserId: string): Promise<void> {
        this.sessions.delete(lineUserId);
        this.logger.log(`Session deleted for user ${lineUserId}`);
    }

    /**
     * 檢查使用者是否在回報流程中
     */
    async isInReportFlow(lineUserId: string): Promise<boolean> {
        const session = await this.getSession(lineUserId);
        return session !== null && session.state !== ReportSessionState.IDLE;
    }

    /**
     * 取得 Session 統計（除錯用）
     */
    getStats(): { activeSessions: number } {
        // 清理過期 session
        const now = new Date();
        for (const [userId, session] of this.sessions) {
            if (now > session.expiresAt) {
                this.sessions.delete(userId);
            }
        }

        return {
            activeSessions: this.sessions.size,
        };
    }

    /**
     * 清理所有過期 Session（定期執行）
     */
    async cleanupExpiredSessions(): Promise<number> {
        const now = new Date();
        let cleanedCount = 0;

        for (const [userId, session] of this.sessions) {
            if (now > session.expiresAt) {
                this.sessions.delete(userId);
                cleanedCount++;
            }
        }

        if (cleanedCount > 0) {
            this.logger.log(`Cleaned up ${cleanedCount} expired sessions`);
        }

        return cleanedCount;
    }
}
