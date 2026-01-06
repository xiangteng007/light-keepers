import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

/**
 * Report Scheduler Service
 * Schedule and send periodic reports
 */
@Injectable()
export class ReportSchedulerService {
    private readonly logger = new Logger(ReportSchedulerService.name);
    private schedules: Map<string, ReportSchedule> = new Map();

    /**
     * 建立報表排程
     */
    createSchedule(input: ScheduleInput): ReportSchedule {
        const schedule: ReportSchedule = {
            id: `sched-${Date.now()}`,
            name: input.name,
            reportType: input.reportType,
            frequency: input.frequency,
            recipients: input.recipients,
            enabled: true,
            nextRun: this.calculateNextRun(input.frequency),
            createdAt: new Date(),
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
    updateSchedule(id: string, updates: Partial<ScheduleInput>): ReportSchedule | null {
        const schedule = this.schedules.get(id);
        if (!schedule) return null;

        if (updates.name) schedule.name = updates.name;
        if (updates.recipients) schedule.recipients = updates.recipients;
        if (updates.frequency) {
            schedule.frequency = updates.frequency;
            schedule.nextRun = this.calculateNextRun(updates.frequency);
        }

        return schedule;
    }

    /**
     * 停用排程
     */
    disableSchedule(id: string): boolean {
        const schedule = this.schedules.get(id);
        if (!schedule) return false;
        schedule.enabled = false;
        return true;
    }

    /**
     * 啟用排程
     */
    enableSchedule(id: string): boolean {
        const schedule = this.schedules.get(id);
        if (!schedule) return false;
        schedule.enabled = true;
        schedule.nextRun = this.calculateNextRun(schedule.frequency);
        return true;
    }

    /**
     * 刪除排程
     */
    deleteSchedule(id: string): boolean {
        return this.schedules.delete(id);
    }

    /**
     * 手動觸發
     */
    async triggerNow(id: string): Promise<TriggerResult> {
        const schedule = this.schedules.get(id);
        if (!schedule) {
            return { success: false, error: 'Schedule not found' };
        }

        return this.executeReport(schedule);
    }

    /**
     * 每日報表 (每天早上 8:00)
     */
    @Cron('0 8 * * *')
    async handleDailyReports() {
        const dailySchedules = Array.from(this.schedules.values())
            .filter((s) => s.enabled && s.frequency === 'daily');

        for (const schedule of dailySchedules) {
            await this.executeReport(schedule);
        }
    }

    /**
     * 每週報表 (每週一早上 9:00)
     */
    @Cron('0 9 * * 1')
    async handleWeeklyReports() {
        const weeklySchedules = Array.from(this.schedules.values())
            .filter((s) => s.enabled && s.frequency === 'weekly');

        for (const schedule of weeklySchedules) {
            await this.executeReport(schedule);
        }
    }

    /**
     * 每月報表 (每月1日早上 10:00)
     */
    @Cron('0 10 1 * *')
    async handleMonthlyReports() {
        const monthlySchedules = Array.from(this.schedules.values())
            .filter((s) => s.enabled && s.frequency === 'monthly');

        for (const schedule of monthlySchedules) {
            await this.executeReport(schedule);
        }
    }

    private async executeReport(schedule: ReportSchedule): Promise<TriggerResult> {
        this.logger.log(`Executing report: ${schedule.name}`);

        schedule.lastRun = new Date();
        schedule.nextRun = this.calculateNextRun(schedule.frequency);

        // TODO: 產生報表並寄送
        return {
            success: true,
            reportId: `report-${Date.now()}`,
            sentTo: schedule.recipients,
            executedAt: new Date(),
        };
    }

    private calculateNextRun(frequency: string): Date {
        const now = new Date();
        switch (frequency) {
            case 'daily': return new Date(now.getTime() + 24 * 3600000);
            case 'weekly': return new Date(now.getTime() + 7 * 24 * 3600000);
            case 'monthly': return new Date(now.getFullYear(), now.getMonth() + 1, 1, 10, 0, 0);
            default: return new Date(now.getTime() + 24 * 3600000);
        }
    }
}

// Types
interface ScheduleInput { name: string; reportType: string; frequency: 'daily' | 'weekly' | 'monthly'; recipients: string[]; }
interface ReportSchedule { id: string; name: string; reportType: string; frequency: string; recipients: string[]; enabled: boolean; nextRun: Date; lastRun?: Date; createdAt: Date; }
interface TriggerResult { success: boolean; reportId?: string; sentTo?: string[]; executedAt?: Date; error?: string; }
