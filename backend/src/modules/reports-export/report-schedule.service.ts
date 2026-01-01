import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ReportSchedule, ReportExecution, ReportType, ScheduleFrequency } from './report-schedule.entity';
import { ReportsExportService, ReportData } from './reports-export.service';

export interface CreateScheduleDto {
    name: string;
    description?: string;
    reportType: ReportType;
    frequency: ScheduleFrequency;
    executeAt?: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    periodType?: string;
    deliveryMethod?: 'email' | 'download' | 'storage';
    recipients?: string;
    outputFormat?: 'csv' | 'json' | 'pdf';
    createdBy: string;
}

@Injectable()
export class ReportScheduleService {
    private readonly logger = new Logger(ReportScheduleService.name);

    constructor(
        @InjectRepository(ReportSchedule)
        private readonly scheduleRepo: Repository<ReportSchedule>,
        @InjectRepository(ReportExecution)
        private readonly executionRepo: Repository<ReportExecution>,
        private readonly reportsExportService: ReportsExportService,
    ) { }

    // ===== 排程 CRUD =====

    async create(dto: CreateScheduleDto): Promise<ReportSchedule> {
        const schedule = this.scheduleRepo.create({
            ...dto,
            nextExecuteAt: this.calculateNextExecute(dto.frequency, dto.executeAt, dto.dayOfWeek, dto.dayOfMonth),
        });

        const saved = await this.scheduleRepo.save(schedule);
        this.logger.log(`Report schedule created: ${saved.id} - ${saved.name}`);
        return saved;
    }

    async findAll(): Promise<ReportSchedule[]> {
        return this.scheduleRepo.find({
            order: { createdAt: 'DESC' },
        });
    }

    async findOne(id: string): Promise<ReportSchedule> {
        const schedule = await this.scheduleRepo.findOne({ where: { id } });
        if (!schedule) {
            throw new NotFoundException(`Schedule ${id} not found`);
        }
        return schedule;
    }

    async update(id: string, dto: Partial<CreateScheduleDto>): Promise<ReportSchedule> {
        const schedule = await this.findOne(id);
        Object.assign(schedule, dto);

        if (dto.frequency || dto.executeAt || dto.dayOfWeek || dto.dayOfMonth) {
            schedule.nextExecuteAt = this.calculateNextExecute(
                dto.frequency || schedule.frequency,
                dto.executeAt || schedule.executeAt,
                dto.dayOfWeek ?? schedule.dayOfWeek,
                dto.dayOfMonth ?? schedule.dayOfMonth,
            );
        }

        return this.scheduleRepo.save(schedule);
    }

    async toggleActive(id: string): Promise<ReportSchedule> {
        const schedule = await this.findOne(id);
        schedule.isActive = !schedule.isActive;
        return this.scheduleRepo.save(schedule);
    }

    async delete(id: string): Promise<void> {
        const result = await this.scheduleRepo.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Schedule ${id} not found`);
        }
    }

    // ===== 執行記錄 =====

    async getExecutions(scheduleId: string, limit = 20): Promise<ReportExecution[]> {
        return this.executionRepo.find({
            where: { scheduleId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    // ===== Cron 任務 =====

    @Cron(CronExpression.EVERY_MINUTE)
    async checkAndExecuteSchedules(): Promise<void> {
        const now = new Date();

        // 找出需要執行的排程
        const pendingSchedules = await this.scheduleRepo.find({
            where: {
                isActive: true,
                nextExecuteAt: LessThanOrEqual(now),
            },
        });

        for (const schedule of pendingSchedules) {
            try {
                await this.executeSchedule(schedule);
            } catch (error) {
                this.logger.error(`Failed to execute schedule ${schedule.id}:`, error);
            }
        }
    }

    // 執行單一排程
    async executeSchedule(schedule: ReportSchedule): Promise<ReportExecution> {
        // 計算報表期間
        const { start, end } = this.calculatePeriod(schedule.periodType);

        // 建立執行記錄
        const execution = this.executionRepo.create({
            scheduleId: schedule.id,
            status: 'running',
            periodStart: start,
            periodEnd: end,
            startedAt: new Date(),
        });
        await this.executionRepo.save(execution);

        try {
            // 生成報表
            const report = await this.generateReport(schedule.reportType, start, end);

            // 輸出報表
            let output: string;
            if (schedule.outputFormat === 'csv') {
                output = this.reportsExportService.generateCSV(report);
            } else {
                output = this.reportsExportService.generateJSON(report);
            }

            // 儲存檔案（簡化：記錄到執行記錄）
            const outputPath = `reports/${schedule.id}/${execution.id}.${schedule.outputFormat}`;

            // 更新執行記錄
            execution.status = 'completed';
            execution.completedAt = new Date();
            execution.durationMs = new Date().getTime() - execution.startedAt!.getTime();
            execution.outputPath = outputPath;
            execution.fileSize = output.length;
            await this.executionRepo.save(execution);

            // 更新排程狀態
            schedule.lastExecutedAt = new Date();
            schedule.executionCount++;
            schedule.nextExecuteAt = this.calculateNextExecute(
                schedule.frequency,
                schedule.executeAt,
                schedule.dayOfWeek,
                schedule.dayOfMonth,
            );
            schedule.lastError = undefined;
            await this.scheduleRepo.save(schedule);

            this.logger.log(`Report schedule executed: ${schedule.id}`);

            // TODO: 發送 Email（如果配置）
            if (schedule.deliveryMethod === 'email' && schedule.recipients) {
                this.logger.log(`Would send email to: ${schedule.recipients}`);
            }

            return execution;
        } catch (error) {
            // 執行失敗
            execution.status = 'failed';
            execution.completedAt = new Date();
            execution.durationMs = new Date().getTime() - execution.startedAt!.getTime();
            execution.errorMessage = (error as Error).message;
            await this.executionRepo.save(execution);

            schedule.failureCount++;
            schedule.lastError = (error as Error).message;
            schedule.nextExecuteAt = this.calculateNextExecute(
                schedule.frequency,
                schedule.executeAt,
                schedule.dayOfWeek,
                schedule.dayOfMonth,
            );
            await this.scheduleRepo.save(schedule);

            throw error;
        }
    }

    // 手動執行
    async executeNow(id: string): Promise<ReportExecution> {
        const schedule = await this.findOne(id);
        return this.executeSchedule(schedule);
    }

    // ===== 輔助方法 =====

    private async generateReport(type: ReportType, start: Date, end: Date): Promise<ReportData> {
        switch (type) {
            case 'volunteer_hours':
                return this.reportsExportService.getVolunteerHoursReport(start, end);
            case 'disaster':
                return this.reportsExportService.getDisasterReport(start, end);
            case 'inventory':
                return this.reportsExportService.getInventoryReport();
            case 'inventory_transaction':
                return this.reportsExportService.getInventoryTransactionReport(start, end);
            default:
                throw new Error(`Unknown report type: ${type}`);
        }
    }

    private calculatePeriod(periodType: string): { start: Date; end: Date } {
        const now = new Date();
        let start: Date;
        const end = new Date(now);

        switch (periodType) {
            case 'last_week':
                start = new Date(now);
                start.setDate(start.getDate() - 7);
                break;
            case 'last_month':
                start = new Date(now);
                start.setMonth(start.getMonth() - 1);
                break;
            case 'last_day':
            default:
                start = new Date(now);
                start.setDate(start.getDate() - 1);
                break;
        }

        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);

        return { start, end };
    }

    private calculateNextExecute(
        frequency: ScheduleFrequency,
        executeAt?: string,
        dayOfWeek?: number,
        dayOfMonth?: number,
    ): Date {
        const now = new Date();
        const [hours, minutes] = (executeAt || '00:00').split(':').map(Number);

        let next = new Date(now);
        next.setHours(hours, minutes, 0, 0);

        switch (frequency) {
            case 'daily':
                if (next <= now) {
                    next.setDate(next.getDate() + 1);
                }
                break;

            case 'weekly':
                const targetDay = dayOfWeek ?? 1; // Default Monday
                const currentDay = next.getDay();
                let daysUntil = targetDay - currentDay;
                if (daysUntil <= 0 || (daysUntil === 0 && next <= now)) {
                    daysUntil += 7;
                }
                next.setDate(next.getDate() + daysUntil);
                break;

            case 'monthly':
                const targetDate = dayOfMonth ?? 1;
                next.setDate(targetDate);
                if (next <= now) {
                    next.setMonth(next.getMonth() + 1);
                }
                break;
        }

        return next;
    }
}
