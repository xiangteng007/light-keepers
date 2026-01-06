import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Scheduled Tasks Service
 * Manage and monitor scheduled background jobs
 */
@Injectable()
export class ScheduledTasksService {
    private readonly logger = new Logger(ScheduledTasksService.name);
    private taskHistory: TaskExecution[] = [];

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private eventEmitter: EventEmitter2,
    ) { }

    // ==========================================
    // 定時任務
    // ==========================================

    @Cron(CronExpression.EVERY_10_MINUTES)
    async syncNcdrAlerts() {
        await this.executeTask('sync_ncdr_alerts', async () => {
            this.eventEmitter.emit('scheduled.ncdr.sync');
            // Actual sync happens in NCDR module
        });
    }

    @Cron(CronExpression.EVERY_HOUR)
    async updateWeatherData() {
        await this.executeTask('update_weather', async () => {
            this.eventEmitter.emit('scheduled.weather.update');
        });
    }

    @Cron(CronExpression.EVERY_DAY_AT_6AM)
    async generateDailyReport() {
        await this.executeTask('daily_report', async () => {
            this.eventEmitter.emit('scheduled.report.daily');
        });
    }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async cleanupOldData() {
        await this.executeTask('cleanup_old_data', async () => {
            this.eventEmitter.emit('scheduled.cleanup');
        });
    }

    @Cron('0 0 1 * *') // 每月 1 號
    async generateMonthlyReport() {
        await this.executeTask('monthly_report', async () => {
            this.eventEmitter.emit('scheduled.report.monthly');
        });
    }

    @Cron(CronExpression.EVERY_5_MINUTES)
    async checkFatigueAlerts() {
        await this.executeTask('fatigue_check', async () => {
            this.eventEmitter.emit('scheduled.fatigue.check');
        });
    }

    // ==========================================
    // 任務管理
    // ==========================================

    private async executeTask(taskName: string, fn: () => Promise<void>) {
        const start = Date.now();
        const execution: TaskExecution = {
            taskName,
            startedAt: new Date(),
            status: 'running',
        };

        try {
            await fn();
            execution.status = 'success';
        } catch (error) {
            execution.status = 'failed';
            execution.error = String(error);
            this.logger.error(`Task ${taskName} failed`, error);
        } finally {
            execution.completedAt = new Date();
            execution.durationMs = Date.now() - start;
            this.taskHistory.push(execution);

            // 保留最近 500 筆
            if (this.taskHistory.length > 500) {
                this.taskHistory = this.taskHistory.slice(-500);
            }

            this.logger.log(`Task ${taskName} completed in ${execution.durationMs}ms`);
        }
    }

    /**
     * 取得任務清單
     */
    getScheduledTasks(): ScheduledTaskInfo[] {
        const cronJobs = this.schedulerRegistry.getCronJobs();
        const tasks: ScheduledTaskInfo[] = [];

        cronJobs.forEach((job, name) => {
            tasks.push({
                name,
                cronExpression: (job as any).cronTime?.source || 'unknown',
                nextRun: (job as any).nextDate()?.toJSDate(),
                running: (job as any).running ?? true,
            });
        });

        return tasks;
    }

    /**
     * 取得執行歷史
     */
    getTaskHistory(taskName?: string, limit: number = 50): TaskExecution[] {
        let history = [...this.taskHistory];
        if (taskName) {
            history = history.filter((h) => h.taskName === taskName);
        }
        return history.slice(-limit);
    }

    /**
     * 手動觸發任務
     */
    async triggerTask(taskName: string): Promise<TaskExecution> {
        const taskMap: Record<string, () => Promise<void>> = {
            sync_ncdr_alerts: () => this.syncNcdrAlerts(),
            update_weather: () => this.updateWeatherData(),
            daily_report: () => this.generateDailyReport(),
            monthly_report: () => this.generateMonthlyReport(),
            cleanup_old_data: () => this.cleanupOldData(),
            fatigue_check: () => this.checkFatigueAlerts(),
        };

        const task = taskMap[taskName];
        if (!task) throw new Error(`Unknown task: ${taskName}`);

        await task();
        return this.taskHistory[this.taskHistory.length - 1];
    }

    /**
     * 取得任務統計
     */
    getTaskStats(): TaskStats {
        const now = Date.now();
        const last24h = this.taskHistory.filter((h) => h.startedAt.getTime() > now - 24 * 3600000);

        return {
            totalExecutions: last24h.length,
            successful: last24h.filter((h) => h.status === 'success').length,
            failed: last24h.filter((h) => h.status === 'failed').length,
            avgDuration: last24h.reduce((sum, h) => sum + (h.durationMs || 0), 0) / (last24h.length || 1),
            byTask: this.groupByTask(last24h),
        };
    }

    private groupByTask(history: TaskExecution[]): Record<string, { count: number; failures: number }> {
        return history.reduce((acc, h) => {
            if (!acc[h.taskName]) acc[h.taskName] = { count: 0, failures: 0 };
            acc[h.taskName].count++;
            if (h.status === 'failed') acc[h.taskName].failures++;
            return acc;
        }, {} as Record<string, { count: number; failures: number }>);
    }
}

// Types
interface TaskExecution {
    taskName: string;
    startedAt: Date;
    completedAt?: Date;
    durationMs?: number;
    status: 'running' | 'success' | 'failed';
    error?: string;
}
interface ScheduledTaskInfo { name: string; cronExpression: string; nextRun?: Date; running: boolean; }
interface TaskStats { totalExecutions: number; successful: number; failed: number; avgDuration: number; byTask: Record<string, { count: number; failures: number }>; }
