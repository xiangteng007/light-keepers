/**
 * Report Scheduler Service
 * 
 * NestJS cron-based scheduled report generation
 * v1.0: Weekly digests, daily summaries, custom schedules
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CronJob } from 'cron';
import { getErrorMessage } from '../../../common/utils/error-utils';

export interface ScheduledReport {
    id: string;
    name: string;
    type: 'daily_summary' | 'weekly_digest' | 'monthly_report' | 'custom';
    schedule: string; // Cron expression
    recipients: string[]; // Account IDs or email addresses
    format: 'pdf' | 'csv' | 'json';
    filters?: Record<string, any>;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    createdBy: string;
    createdAt: Date;
}

export interface ReportResult {
    reportId: string;
    generatedAt: Date;
    format: string;
    size: number;
    downloadUrl?: string;
    sentTo: string[];
    status: 'success' | 'failed';
    error?: string;
}

@Injectable()
export class ReportSchedulerService {
    private readonly logger = new Logger(ReportSchedulerService.name);
    private readonly scheduledReports: Map<string, ScheduledReport> = new Map();
    private readonly reportHistory: ReportResult[] = [];

    constructor(
        private readonly schedulerRegistry: SchedulerRegistry,
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.initializeDefaultReports();
    }

    // ===== Default Scheduled Reports =====

    private initializeDefaultReports(): void {
        // Daily Summary at 08:00
        this.addScheduledReport({
            id: 'daily-summary',
            name: '每日作業摘要',
            type: 'daily_summary',
            schedule: '0 8 * * *',
            recipients: [],
            format: 'pdf',
            enabled: true,
            createdBy: 'system',
            createdAt: new Date(),
        });

        // Weekly Digest on Monday 09:00
        this.addScheduledReport({
            id: 'weekly-digest',
            name: '週報',
            type: 'weekly_digest',
            schedule: '0 9 * * 1',
            recipients: [],
            format: 'pdf',
            enabled: true,
            createdBy: 'system',
            createdAt: new Date(),
        });

        // Monthly Report on 1st at 10:00
        this.addScheduledReport({
            id: 'monthly-report',
            name: '月報',
            type: 'monthly_report',
            schedule: '0 10 1 * *',
            recipients: [],
            format: 'pdf',
            enabled: true,
            createdBy: 'system',
            createdAt: new Date(),
        });
    }

    // ===== Built-in Cron Jobs =====

    @Cron(CronExpression.EVERY_DAY_AT_8AM, { name: 'daily-summary' })
    async handleDailySummary(): Promise<void> {
        this.logger.log('Generating daily summary report...');
        await this.generateReport('daily-summary');
    }

    @Cron('0 9 * * 1', { name: 'weekly-digest' })
    async handleWeeklyDigest(): Promise<void> {
        this.logger.log('Generating weekly digest report...');
        await this.generateReport('weekly-digest');
    }

    @Cron('0 10 1 * *', { name: 'monthly-report' })
    async handleMonthlyReport(): Promise<void> {
        this.logger.log('Generating monthly report...');
        await this.generateReport('monthly-report');
    }

    // ===== Report Management =====

    /**
     * Add a new scheduled report
     */
    addScheduledReport(report: ScheduledReport): void {
        this.scheduledReports.set(report.id, report);

        // If custom schedule and enabled, add to registry
        if (report.type === 'custom' && report.enabled) {
            this.addCustomCronJob(report);
        }

        this.logger.log(`Scheduled report added: ${report.name}`);
    }

    /**
     * Update an existing scheduled report
     */
    updateScheduledReport(id: string, updates: Partial<ScheduledReport>): ScheduledReport | null {
        const report = this.scheduledReports.get(id);
        if (!report) return null;

        const updated = { ...report, ...updates };
        this.scheduledReports.set(id, updated);

        // Update cron job if schedule changed
        if (updated.type === 'custom') {
            try {
                this.schedulerRegistry.deleteCronJob(id);
            } catch (e) {
                // Job might not exist
            }

            if (updated.enabled) {
                this.addCustomCronJob(updated);
            }
        }

        return updated;
    }

    /**
     * Delete a scheduled report
     */
    deleteScheduledReport(id: string): boolean {
        const exists = this.scheduledReports.delete(id);

        if (exists) {
            try {
                this.schedulerRegistry.deleteCronJob(id);
            } catch (e) {
                // Job might not exist
            }
        }

        return exists;
    }

    /**
     * Get all scheduled reports
     */
    getScheduledReports(): ScheduledReport[] {
        return Array.from(this.scheduledReports.values());
    }

    /**
     * Get scheduled report by ID
     */
    getScheduledReport(id: string): ScheduledReport | undefined {
        return this.scheduledReports.get(id);
    }

    /**
     * Enable or disable a scheduled report
     */
    setReportEnabled(id: string, enabled: boolean): boolean {
        const report = this.scheduledReports.get(id);
        if (!report) return false;

        report.enabled = enabled;
        this.scheduledReports.set(id, report);

        if (report.type === 'custom') {
            try {
                const job = this.schedulerRegistry.getCronJob(id);
                enabled ? job.start() : job.stop();
            } catch (e) {
                if (enabled) {
                    this.addCustomCronJob(report);
                }
            }
        }

        return true;
    }

    // ===== Report Generation =====

    /**
     * Generate a report immediately or by schedule
     */
    async generateReport(reportId: string): Promise<ReportResult> {
        const report = this.scheduledReports.get(reportId);
        const result: ReportResult = {
            reportId,
            generatedAt: new Date(),
            format: report?.format || 'pdf',
            size: 0,
            sentTo: [],
            status: 'success',
        };

        try {
            if (!report) {
                throw new Error(`Report not found: ${reportId}`);
            }

            if (!report.enabled) {
                throw new Error(`Report is disabled: ${reportId}`);
            }

            // Generate report content based on type
            const content = await this.generateReportContent(report);

            result.size = content.length;
            result.downloadUrl = `/reports/download/${reportId}/${Date.now()}`;

            // Send to recipients
            if (report.recipients.length > 0) {
                result.sentTo = await this.sendToRecipients(report.recipients, reportId, content);
            }

            // Update last run time
            report.lastRun = new Date();
            this.scheduledReports.set(reportId, report);

            // Emit event
            this.eventEmitter.emit('report.generated', {
                reportId,
                reportName: report.name,
                generatedAt: result.generatedAt,
            });

            this.logger.log(`Report generated: ${report.name}`);
        } catch (error: unknown) {
            result.status = 'failed';
            result.error = getErrorMessage(error);
            this.logger.error(`Report generation failed: ${getErrorMessage(error)}`);
        }

        this.reportHistory.push(result);
        return result;
    }

    /**
     * Get report generation history
     */
    getReportHistory(limit: number = 50): ReportResult[] {
        return this.reportHistory.slice(-limit);
    }

    // ===== Private Methods =====

    private addCustomCronJob(report: ScheduledReport): void {
        try {
            const job = new CronJob(report.schedule, () => {
                this.generateReport(report.id);
            });

            this.schedulerRegistry.addCronJob(report.id, job);
            job.start();
        } catch (error: unknown) {
            this.logger.error(`Failed to add cron job for ${report.id}: ${getErrorMessage(error)}`);
        }
    }

    private async generateReportContent(report: ScheduledReport): Promise<string> {
        // Mock report content generation
        const now = new Date();
        let content = '';

        switch (report.type) {
            case 'daily_summary':
                content = JSON.stringify({
                    type: 'daily_summary',
                    date: now.toISOString().split('T')[0],
                    tasksSummary: {
                        total: Math.floor(Math.random() * 50) + 10,
                        completed: Math.floor(Math.random() * 40),
                        pending: Math.floor(Math.random() * 15),
                    },
                    alertsSummary: {
                        critical: Math.floor(Math.random() * 3),
                        warning: Math.floor(Math.random() * 10),
                    },
                    resourceUsage: {
                        dispatched: Math.floor(Math.random() * 100),
                        returned: Math.floor(Math.random() * 80),
                    },
                });
                break;

            case 'weekly_digest':
                content = JSON.stringify({
                    type: 'weekly_digest',
                    weekOf: now.toISOString(),
                    highlights: [
                        '完成 32 項任務',
                        '新增 15 名志工',
                        '處理 5 起緊急事件',
                    ],
                    statistics: {
                        totalTasks: 32,
                        averageResponseTime: '15 分鐘',
                        volunteerHours: 256,
                    },
                });
                break;

            case 'monthly_report':
                content = JSON.stringify({
                    type: 'monthly_report',
                    month: now.toLocaleDateString('zh-TW', { year: 'numeric', month: 'long' }),
                    executiveSummary: '本月運作正常',
                    detailedStatistics: {},
                });
                break;

            default:
                content = JSON.stringify({ type: 'custom', generatedAt: now });
        }

        return content;
    }

    private async sendToRecipients(recipients: string[], reportId: string, content: string): Promise<string[]> {
        // Mock sending to recipients
        this.logger.log(`Sending report ${reportId} to ${recipients.length} recipients`);
        return recipients;
    }
}
