/**
 * 心情追蹤服務 (Mood Tracker Service)
 * 模組 C: 心理韌性與支持
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MoodLog, BlessingMessage } from './entities/mood-log.entity';

export interface MoodEntry {
    userId: string;
    score: number;
    tags?: string[];
    note?: string;
    taskId?: string;
}

export interface MoodTrend {
    date: string;
    averageScore: number;
    count: number;
}

export interface UserMoodSummary {
    userId: string;
    currentScore: number;
    weeklyAverage: number;
    trend: 'improving' | 'stable' | 'declining';
    alertLevel: 'normal' | 'attention' | 'concern' | 'critical';
    recentTags: string[];
}

@Injectable()
export class MoodTrackerService {
    private readonly logger = new Logger(MoodTrackerService.name);

    // 警報閾值
    private readonly CONCERN_THRESHOLD = 4; // 連續 3 次低於此分數觸發預警
    private readonly CRITICAL_THRESHOLD = 3;
    private readonly CONSECUTIVE_COUNT = 3;

    constructor(
        @InjectRepository(MoodLog)
        private moodLogRepository: Repository<MoodLog>,
        @InjectRepository(BlessingMessage)
        private blessingRepository: Repository<BlessingMessage>,
        private eventEmitter: EventEmitter2,
    ) { }

    // ==================== 心情記錄 ====================

    /**
     * 記錄心情分數
     */
    async logMood(entry: MoodEntry): Promise<MoodLog> {
        const moodLog = this.moodLogRepository.create(entry);
        const savedLog = await this.moodLogRepository.save(moodLog);

        // 檢查是否需要觸發預警
        await this.checkAlertThreshold(entry.userId);

        this.logger.log(`Mood logged for user ${entry.userId}: ${entry.score}/10`);
        return savedLog;
    }

    /**
     * 取得使用者最近心情
     */
    async getUserMoodHistory(userId: string, days: number = 30): Promise<MoodLog[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        return this.moodLogRepository
            .createQueryBuilder('mood')
            .where('mood.userId = :userId', { userId })
            .andWhere('mood.createdAt >= :startDate', { startDate })
            .orderBy('mood.createdAt', 'DESC')
            .getMany();
    }

    /**
     * 取得使用者心情摘要
     */
    async getUserMoodSummary(userId: string): Promise<UserMoodSummary> {
        const recentLogs = await this.getUserMoodHistory(userId, 7);

        if (recentLogs.length === 0) {
            return {
                userId,
                currentScore: 0,
                weeklyAverage: 0,
                trend: 'stable',
                alertLevel: 'normal',
                recentTags: [],
            };
        }

        const currentScore = recentLogs[0].score;
        const weeklyAverage = recentLogs.reduce((sum, log) => sum + log.score, 0) / recentLogs.length;

        // 判斷趨勢
        let trend: 'improving' | 'stable' | 'declining' = 'stable';
        if (recentLogs.length >= 3) {
            const recent3Avg = recentLogs.slice(0, 3).reduce((s, l) => s + l.score, 0) / 3;
            const older3Avg = recentLogs.slice(-3).reduce((s, l) => s + l.score, 0) / 3;
            if (recent3Avg > older3Avg + 1) trend = 'improving';
            else if (recent3Avg < older3Avg - 1) trend = 'declining';
        }

        // 判斷警報等級
        let alertLevel: 'normal' | 'attention' | 'concern' | 'critical' = 'normal';
        const lowScores = recentLogs.slice(0, this.CONSECUTIVE_COUNT).filter(l => l.score < this.CONCERN_THRESHOLD);
        if (lowScores.length >= this.CONSECUTIVE_COUNT && lowScores.some(l => l.score < this.CRITICAL_THRESHOLD)) {
            alertLevel = 'critical';
        } else if (lowScores.length >= this.CONSECUTIVE_COUNT) {
            alertLevel = 'concern';
        } else if (currentScore < this.CONCERN_THRESHOLD) {
            alertLevel = 'attention';
        }

        // 收集最近標籤
        const allTags = recentLogs.flatMap(log => log.tags || []);
        const tagCounts = allTags.reduce((acc, tag) => {
            acc[tag] = (acc[tag] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const recentTags = Object.entries(tagCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag]) => tag);

        return {
            userId,
            currentScore,
            weeklyAverage: Math.round(weeklyAverage * 10) / 10,
            trend,
            alertLevel,
            recentTags,
        };
    }

    /**
     * 取得團隊心情趨勢
     */
    async getTeamMoodTrend(days: number = 14): Promise<MoodTrend[]> {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        const results = await this.moodLogRepository
            .createQueryBuilder('mood')
            .select("DATE(mood.createdAt)", 'date')
            .addSelect('AVG(mood.score)', 'averageScore')
            .addSelect('COUNT(*)', 'count')
            .where('mood.createdAt >= :startDate', { startDate })
            .groupBy('DATE(mood.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany();

        return results.map(r => ({
            date: r.date,
            averageScore: parseFloat(r.averageScore),
            count: parseInt(r.count),
        }));
    }

    // ==================== 預警系統 ====================

    private async checkAlertThreshold(userId: string): Promise<void> {
        const summary = await this.getUserMoodSummary(userId);

        if (summary.alertLevel === 'concern' || summary.alertLevel === 'critical') {
            // 檢查是否已經觸發過
            const recentAlert = await this.moodLogRepository.findOne({
                where: { userId, isAlertTriggered: true },
                order: { createdAt: 'DESC' },
            });

            // 24 小時內只觸發一次
            if (recentAlert && (Date.now() - recentAlert.createdAt.getTime()) < 24 * 60 * 60 * 1000) {
                return;
            }

            // 標記已觸發
            await this.moodLogRepository.update(
                { userId },
                { isAlertTriggered: true }
            );

            // 發送預警事件
            this.eventEmitter.emit('mood.alert.triggered', {
                userId,
                alertLevel: summary.alertLevel,
                currentScore: summary.currentScore,
                weeklyAverage: summary.weeklyAverage,
                trend: summary.trend,
            });

            this.logger.warn(`Mood alert triggered for user ${userId}: ${summary.alertLevel}`);
        }
    }

    /**
     * 取得需要關注的使用者列表
     */
    async getUsersNeedingAttention(): Promise<UserMoodSummary[]> {
        // 取得最近 7 天有記錄的所有使用者
        const userIds = await this.moodLogRepository
            .createQueryBuilder('mood')
            .select('DISTINCT mood.userId', 'userId')
            .where('mood.createdAt >= :startDate', { startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
            .getRawMany();

        const summaries: UserMoodSummary[] = [];

        for (const { userId } of userIds) {
            const summary = await this.getUserMoodSummary(userId);
            if (summary.alertLevel !== 'normal') {
                summaries.push(summary);
            }
        }

        // 按警報等級排序
        const levelOrder = { critical: 0, concern: 1, attention: 2, normal: 3 };
        return summaries.sort((a, b) => levelOrder[a.alertLevel] - levelOrder[b.alertLevel]);
    }

    // ==================== 祈福牆 ====================

    /**
     * 發送祝福訊息
     */
    async postBlessing(data: {
        userId?: string;
        displayName: string;
        message: string;
        iconType?: string;
    }): Promise<BlessingMessage> {
        const blessing = this.blessingRepository.create({
            ...data,
            iconType: data.iconType || 'candle',
        });
        return this.blessingRepository.save(blessing);
    }

    /**
     * 取得祈福牆訊息
     */
    async getBlessings(limit: number = 50): Promise<BlessingMessage[]> {
        return this.blessingRepository.find({
            where: { isVisible: true },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * 按讚祝福訊息
     */
    async likeBlessing(id: string): Promise<void> {
        await this.blessingRepository.increment({ id }, 'likes', 1);
    }

    // ==================== 統計 ====================

    async getStats(): Promise<{
        totalLogs: number;
        todayLogs: number;
        averageScore: number;
        usersNeedingAttention: number;
        totalBlessings: number;
    }> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const [totalLogs, todayLogs, avgResult, usersNeedingAttention, totalBlessings] = await Promise.all([
            this.moodLogRepository.count(),
            this.moodLogRepository.count({ where: { createdAt: today } }),
            this.moodLogRepository
                .createQueryBuilder('mood')
                .select('AVG(mood.score)', 'avg')
                .getRawOne(),
            this.getUsersNeedingAttention().then(list => list.length),
            this.blessingRepository.count(),
        ]);

        return {
            totalLogs,
            todayLogs,
            averageScore: parseFloat(avgResult?.avg || '0'),
            usersNeedingAttention,
            totalBlessings,
        };
    }
}
