import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportBuilderService } from './report-builder.service';

export interface ReportSchedule {
    id: string;
    name: string;
    definitionId: string;
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';
    cronExpression?: string;
    recipients: string[];
    format: 'pdf' | 'excel' | 'csv';
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    createdBy: string;
}

/**
 * 報表排程服務
 */
@Injectable()
export class ReportSchedulerService {
    private readonly logger = new Logger(ReportSchedulerService.name);
    private schedules: Map<string, ReportSchedule> = new Map();

    constructor(private readonly reportBuilder: ReportBuilderService) {}

    /**
     * 每日執行排程報表
     */
    @Cron(CronExpression.EVERY_DAY_AT_6AM)
    async executeDailyReports(): Promise<void> {
        await this.executeScheduledReports('daily');
    }

    /**
     * 每週一執行排程報表
     */
    @Cron(CronExpression.EVERY_WEEK)
    async executeWeeklyReports(): Promise<void> {
        await this.executeScheduledReports('weekly');
    }

    /**
     * 每月一號執行排程報表
     */
    @Cron('0 6 1 * *')
    async executeMonthlyReports(): Promise<void> {
        await this.executeScheduledReports('monthly');
    }

    /**
     * 建立排程
     */
    createSchedule(data: Omit<ReportSchedule, 'id' | 'nextRun'>): ReportSchedule {
        const schedule: ReportSchedule = {
            ...data,
            id: `schedule-${Date.now()}`,
            nextRun: this.calculateNextRun(data.frequency),
        };
        this.schedules.set(schedule.id, schedule);
        return schedule;
    }

    /**
     * 取得排程
     */
    getSchedule(id: string): ReportSchedule | undefined {
        return this.schedules.get(id);
    }

    /**
     * 列出排程
     */
    listSchedules(): ReportSchedule[] {
        return Array.from(this.schedules.values());
    }

    /**
     * 更新排程
     */
    updateSchedule(id: string, updates: Partial<ReportSchedule>): ReportSchedule | null {
        const schedule = this.schedules.get(id);
        if (!schedule) return null;

        const updated = { ...schedule, ...updates };
        if (updates.frequency) {
            updated.nextRun = this.calculateNextRun(updates.frequency);
        }
        this.schedules.set(id, updated);
        return updated;
    }

    /**
     * 刪除排程
     */
    deleteSchedule(id: string): boolean {
        return this.schedules.delete(id);
    }

    /**
     * 手動觸發排程
     */
    async triggerSchedule(id: string): Promise<any> {
        const schedule = this.schedules.get(id);
        if (!schedule) {
            throw new Error(`Schedule not found: ${id}`);
        }

        return this.executeSchedule(schedule);
    }

    // === Private ===

    private async executeScheduledReports(frequency: string): Promise<void> {
        const schedules = Array.from(this.schedules.values())
            .filter(s => s.enabled && s.frequency === frequency);

        this.logger.log(`Executing ${schedules.length} ${frequency} scheduled reports`);

        for (const schedule of schedules) {
            try {
                await this.executeSchedule(schedule);
            } catch (error) {
                this.logger.error(`Failed to execute schedule ${schedule.id}: ${error}`);
            }
        }
    }

    private async executeSchedule(schedule: ReportSchedule): Promise<any> {
        this.logger.log(`Executing scheduled report: ${schedule.name}`);

        const report = await this.reportBuilder.generateReport(schedule.definitionId);
        
        schedule.lastRun = new Date();
        schedule.nextRun = this.calculateNextRun(schedule.frequency);

        // TODO: Export and send to recipients
        this.logger.log(`Report ${report.id} generated, sending to ${schedule.recipients.length} recipients`);

        return {
            scheduleId: schedule.id,
            reportId: report.id,
            sentTo: schedule.recipients,
            executedAt: schedule.lastRun,
        };
    }

    private calculateNextRun(frequency: string): Date {
        const now = new Date();
        switch (frequency) {
            case 'daily':
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
            case 'weekly':
                return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            case 'monthly':
                const next = new Date(now);
                next.setMonth(next.getMonth() + 1);
                return next;
            default:
                return new Date(now.getTime() + 24 * 60 * 60 * 1000);
        }
    }
}
