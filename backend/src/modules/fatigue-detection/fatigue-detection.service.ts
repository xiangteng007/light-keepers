import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Fatigue Detection Service
 * Monitor volunteer fatigue and recommend rest
 */
@Injectable()
export class FatigueDetectionService {
    private readonly logger = new Logger(FatigueDetectionService.name);
    private fatigueRecords: Map<string, FatigueRecord> = new Map();

    constructor(private eventEmitter: EventEmitter2) { }

    /**
     * 記錄出勤
     */
    recordDuty(volunteerId: string, startTime: Date, endTime: Date): void {
        const record = this.fatigueRecords.get(volunteerId) || this.createNewRecord(volunteerId);

        record.recentDuties.push({ startTime, endTime, hours: (endTime.getTime() - startTime.getTime()) / 3600000 });
        record.last7DaysHours = this.calculateRecentHours(record, 7);
        record.last24HoursHours = this.calculateRecentHours(record, 1);
        record.consecutiveDays = this.calculateConsecutiveDays(record);
        record.lastDutyEnd = endTime;

        this.fatigueRecords.set(volunteerId, record);

        // 檢查疲勞警告
        this.checkFatigueWarnings(volunteerId, record);
    }

    /**
     * 取得疲勞等級
     */
    getFatigueLevel(volunteerId: string): FatigueAssessment {
        const record = this.fatigueRecords.get(volunteerId);

        if (!record) {
            return { volunteerId, level: 'fresh', score: 0, warnings: [], recommendations: ['可正常值勤'] };
        }

        const score = this.calculateFatigueScore(record);
        const level = this.scoreToLevel(score);
        const warnings = this.generateWarnings(record, score);
        const recommendations = this.generateRecommendations(level, record);

        return { volunteerId, level, score, warnings, recommendations, record };
    }

    /**
     * 取得需要休息的志工
     */
    getVolunteersNeedingRest(): FatigueAssessment[] {
        const needRest: FatigueAssessment[] = [];

        for (const [volunteerId] of this.fatigueRecords) {
            const assessment = this.getFatigueLevel(volunteerId);
            if (assessment.level === 'high' || assessment.level === 'critical') {
                needRest.push(assessment);
            }
        }

        return needRest.sort((a, b) => b.score - a.score);
    }

    /**
     * 檢查是否可以排班
     */
    canSchedule(volunteerId: string, proposedShift: ProposedShift): ScheduleCheckResult {
        const assessment = this.getFatigueLevel(volunteerId);
        const record = this.fatigueRecords.get(volunteerId);

        const issues: string[] = [];

        if (assessment.level === 'critical') {
            issues.push('疲勞度過高，建議強制休息');
        }

        if (record && record.consecutiveDays >= 5) {
            issues.push(`已連續出勤 ${record.consecutiveDays} 天`);
        }

        if (record && record.last24HoursHours > 8) {
            issues.push(`過去 24 小時已值勤 ${record.last24HoursHours.toFixed(1)} 小時`);
        }

        const hoursAfterShift = (record?.last7DaysHours || 0) + proposedShift.hours;
        if (hoursAfterShift > 40) {
            issues.push(`本週時數將超過 40 小時 (${hoursAfterShift.toFixed(1)}h)`);
        }

        return {
            canSchedule: issues.length === 0,
            warningLevel: issues.length > 2 ? 'high' : issues.length > 0 ? 'medium' : 'low',
            issues,
            currentFatigue: assessment,
        };
    }

    /**
     * 設定疲勞閾值
     */
    getThresholds(): FatigueThresholds {
        return {
            maxConsecutiveDays: 5,
            maxWeeklyHours: 40,
            maxDailyHours: 12,
            minRestBetweenShifts: 8, // hours
            warningAt24Hours: 8,
            criticalAt24Hours: 12,
        };
    }

    // Private methods
    private createNewRecord(volunteerId: string): FatigueRecord {
        return {
            volunteerId,
            recentDuties: [],
            last7DaysHours: 0,
            last24HoursHours: 0,
            consecutiveDays: 0,
            lastDutyEnd: null,
        };
    }

    private calculateRecentHours(record: FatigueRecord, days: number): number {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return record.recentDuties
            .filter((d) => d.startTime > cutoff)
            .reduce((sum, d) => sum + d.hours, 0);
    }

    private calculateConsecutiveDays(record: FatigueRecord): number {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const dutyDates = new Set(
            record.recentDuties.map((d) => {
                const date = new Date(d.startTime);
                date.setHours(0, 0, 0, 0);
                return date.getTime();
            })
        );

        let consecutive = 0;
        let checkDate = new Date(today);

        while (dutyDates.has(checkDate.getTime())) {
            consecutive++;
            checkDate.setDate(checkDate.getDate() - 1);
        }

        return consecutive;
    }

    private calculateFatigueScore(record: FatigueRecord): number {
        let score = 0;

        // 過去 24 小時
        if (record.last24HoursHours > 12) score += 40;
        else if (record.last24HoursHours > 8) score += 25;
        else if (record.last24HoursHours > 4) score += 10;

        // 過去 7 天
        if (record.last7DaysHours > 50) score += 30;
        else if (record.last7DaysHours > 40) score += 20;
        else if (record.last7DaysHours > 30) score += 10;

        // 連續天數
        if (record.consecutiveDays >= 7) score += 30;
        else if (record.consecutiveDays >= 5) score += 20;
        else if (record.consecutiveDays >= 3) score += 10;

        return Math.min(score, 100);
    }

    private scoreToLevel(score: number): FatigueLevel {
        if (score >= 70) return 'critical';
        if (score >= 50) return 'high';
        if (score >= 30) return 'moderate';
        if (score >= 10) return 'low';
        return 'fresh';
    }

    private generateWarnings(record: FatigueRecord, score: number): string[] {
        const warnings: string[] = [];
        if (record.consecutiveDays >= 5) warnings.push(`連續出勤 ${record.consecutiveDays} 天`);
        if (record.last24HoursHours > 8) warnings.push(`24 小時內已值勤 ${record.last24HoursHours.toFixed(1)} 小時`);
        if (record.last7DaysHours > 40) warnings.push(`本週已值勤 ${record.last7DaysHours.toFixed(1)} 小時`);
        return warnings;
    }

    private generateRecommendations(level: FatigueLevel, record: FatigueRecord): string[] {
        if (level === 'critical') return ['強制休息至少 24 小時', '建議就醫檢查'];
        if (level === 'high') return ['建議休息至少 12 小時', '避免高強度任務'];
        if (level === 'moderate') return ['注意休息', '適當補充水分'];
        return ['狀態良好', '可正常值勤'];
    }

    private checkFatigueWarnings(volunteerId: string, record: FatigueRecord): void {
        const score = this.calculateFatigueScore(record);
        if (score >= 70) {
            this.eventEmitter.emit('fatigue.critical', { volunteerId, record, score });
        } else if (score >= 50) {
            this.eventEmitter.emit('fatigue.high', { volunteerId, record, score });
        }
    }
}

// Types
type FatigueLevel = 'fresh' | 'low' | 'moderate' | 'high' | 'critical';
interface DutyEntry { startTime: Date; endTime: Date; hours: number; }
interface FatigueRecord {
    volunteerId: string; recentDuties: DutyEntry[];
    last7DaysHours: number; last24HoursHours: number;
    consecutiveDays: number; lastDutyEnd: Date | null;
}
interface FatigueAssessment {
    volunteerId: string; level: FatigueLevel; score: number;
    warnings: string[]; recommendations: string[]; record?: FatigueRecord;
}
interface ProposedShift { date: Date; startTime: string; endTime: string; hours: number; }
interface ScheduleCheckResult {
    canSchedule: boolean; warningLevel: string;
    issues: string[]; currentFatigue: FatigueAssessment;
}
interface FatigueThresholds {
    maxConsecutiveDays: number; maxWeeklyHours: number; maxDailyHours: number;
    minRestBetweenShifts: number; warningAt24Hours: number; criticalAt24Hours: number;
}
