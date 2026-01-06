import { Injectable, Logger } from '@nestjs/common';

/**
 * Session Timeout Service
 * Automatic logout on idle
 */
@Injectable()
export class SessionTimeoutService {
    private readonly logger = new Logger(SessionTimeoutService.name);
    private sessions: Map<string, SessionData> = new Map();
    private defaultTimeout = 30 * 60 * 1000; // 30 minutes

    /**
     * 建立 Session
     */
    createSession(userId: string, deviceId?: string): SessionData {
        const session: SessionData = {
            id: `sess-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            userId,
            deviceId,
            createdAt: new Date(),
            lastActivity: new Date(),
            expiresAt: new Date(Date.now() + this.defaultTimeout),
            active: true,
        };

        this.sessions.set(session.id, session);
        return session;
    }

    /**
     * 更新活動
     */
    touch(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session || !session.active) return false;

        session.lastActivity = new Date();
        session.expiresAt = new Date(Date.now() + this.defaultTimeout);
        return true;
    }

    /**
     * 檢查是否過期
     */
    isExpired(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return true;
        return new Date() > session.expiresAt || !session.active;
    }

    /**
     * 終止 Session
     */
    terminate(sessionId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (!session) return false;

        session.active = false;
        session.terminatedAt = new Date();
        return true;
    }

    /**
     * 取得活動 Sessions
     */
    getActiveSessions(userId: string): SessionData[] {
        return Array.from(this.sessions.values())
            .filter((s) => s.userId === userId && s.active && new Date() < s.expiresAt);
    }

    /**
     * 設定逾時時間
     */
    setDefaultTimeout(minutes: number): void {
        this.defaultTimeout = minutes * 60 * 1000;
    }

    /**
     * 清除過期 Sessions
     */
    purgeExpired(): number {
        const now = new Date();
        let purged = 0;

        for (const [id, session] of this.sessions) {
            if (now > session.expiresAt || !session.active) {
                this.sessions.delete(id);
                purged++;
            }
        }

        return purged;
    }

    /**
     * 取得 Session 資訊
     */
    getSession(sessionId: string): SessionData | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * 延長 Session
     */
    extend(sessionId: string, minutes: number): boolean {
        const session = this.sessions.get(sessionId);
        if (!session || !session.active) return false;

        session.expiresAt = new Date(session.expiresAt.getTime() + minutes * 60 * 1000);
        return true;
    }
}

// Types
interface SessionData { id: string; userId: string; deviceId?: string; createdAt: Date; lastActivity: Date; expiresAt: Date; active: boolean; terminatedAt?: Date; }
