/**
 * Report Generator Service
 * Generates various system reports
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

export interface ReportConfig {
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
    startDate?: Date;
    endDate?: Date;
    format?: 'json' | 'csv' | 'html';
    sections?: string[];
}

export interface ReportData {
    id: string;
    type: string;
    generatedAt: Date;
    period: { start: Date; end: Date };
    summary: ReportSummary;
    details: Record<string, any>;
}

export interface ReportSummary {
    totalSosSignals: number;
    acknowledgedSos: number;
    totalReports: number;
    resolvedReports: number;
    totalTasks: number;
    completedTasks: number;
    activeVolunteers: number;
    newUsers: number;
}

@Injectable()
export class ReportGeneratorService {
    private readonly logger = new Logger(ReportGeneratorService.name);

    constructor(private dataSource: DataSource) { }

    // ==================== Report Generation ====================

    /**
     * Generate a report
     */
    async generateReport(config: ReportConfig): Promise<ReportData> {
        const { startDate, endDate } = this.getDateRange(config);

        this.logger.log(`Generating ${config.type} report: ${startDate.toISOString()} - ${endDate.toISOString()}`);

        const summary = await this.generateSummary(startDate, endDate);
        const details = await this.generateDetails(startDate, endDate, config.sections);

        const report: ReportData = {
            id: `report-${Date.now()}`,
            type: config.type,
            generatedAt: new Date(),
            period: { start: startDate, end: endDate },
            summary,
            details,
        };

        return report;
    }

    /**
     * Generate daily summary
     */
    async generateDailySummary(): Promise<ReportData> {
        return this.generateReport({ type: 'daily' });
    }

    /**
     * Generate weekly summary
     */
    async generateWeeklySummary(): Promise<ReportData> {
        return this.generateReport({ type: 'weekly' });
    }

    // ==================== Summary Generation ====================

    private async generateSummary(startDate: Date, endDate: Date): Promise<ReportSummary> {
        // These are placeholder queries - adjust to actual table names
        const summary: ReportSummary = {
            totalSosSignals: 0,
            acknowledgedSos: 0,
            totalReports: 0,
            resolvedReports: 0,
            totalTasks: 0,
            completedTasks: 0,
            activeVolunteers: 0,
            newUsers: 0,
        };

        try {
            // SOS signals
            const sosResult = await this.safeQuery(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'acknowledged' OR status = 'resolved' THEN 1 END) as acknowledged
                FROM sos_signals 
                WHERE created_at BETWEEN $1 AND $2
            `, [startDate, endDate]);

            if (sosResult?.[0]) {
                summary.totalSosSignals = Number(sosResult[0].total) || 0;
                summary.acknowledgedSos = Number(sosResult[0].acknowledged) || 0;
            }

            // Field reports
            const reportsResult = await this.safeQuery(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'resolved' THEN 1 END) as resolved
                FROM field_reports 
                WHERE created_at BETWEEN $1 AND $2
            `, [startDate, endDate]);

            if (reportsResult?.[0]) {
                summary.totalReports = Number(reportsResult[0].total) || 0;
                summary.resolvedReports = Number(reportsResult[0].resolved) || 0;
            }

            // Tasks
            const tasksResult = await this.safeQuery(`
                SELECT 
                    COUNT(*) as total,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
                FROM tasks 
                WHERE created_at BETWEEN $1 AND $2
            `, [startDate, endDate]);

            if (tasksResult?.[0]) {
                summary.totalTasks = Number(tasksResult[0].total) || 0;
                summary.completedTasks = Number(tasksResult[0].completed) || 0;
            }

            // Users
            const usersResult = await this.safeQuery(`
                SELECT COUNT(*) as total
                FROM accounts 
                WHERE created_at BETWEEN $1 AND $2
            `, [startDate, endDate]);

            if (usersResult?.[0]) {
                summary.newUsers = Number(usersResult[0].total) || 0;
            }

        } catch (error) {
            this.logger.warn('Some summary queries failed, using defaults', error);
        }

        return summary;
    }

    // ==================== Details Generation ====================

    private async generateDetails(
        startDate: Date,
        endDate: Date,
        sections?: string[]
    ): Promise<Record<string, any>> {
        const details: Record<string, any> = {};

        const allSections = sections || ['sos', 'reports', 'tasks', 'weather'];

        if (allSections.includes('sos')) {
            details.sosByStatus = await this.getSosByStatus(startDate, endDate);
        }

        if (allSections.includes('reports')) {
            details.reportsByType = await this.getReportsByType(startDate, endDate);
        }

        if (allSections.includes('tasks')) {
            details.tasksByPriority = await this.getTasksByPriority(startDate, endDate);
        }

        return details;
    }

    private async getSosByStatus(startDate: Date, endDate: Date): Promise<Record<string, number>> {
        const result = await this.safeQuery(`
            SELECT status, COUNT(*) as count
            FROM sos_signals
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY status
        `, [startDate, endDate]);

        const byStatus: Record<string, number> = {};
        for (const row of result || []) {
            byStatus[row.status] = Number(row.count);
        }
        return byStatus;
    }

    private async getReportsByType(startDate: Date, endDate: Date): Promise<Record<string, number>> {
        const result = await this.safeQuery(`
            SELECT type, COUNT(*) as count
            FROM field_reports
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY type
        `, [startDate, endDate]);

        const byType: Record<string, number> = {};
        for (const row of result || []) {
            byType[row.type] = Number(row.count);
        }
        return byType;
    }

    private async getTasksByPriority(startDate: Date, endDate: Date): Promise<Record<string, number>> {
        const result = await this.safeQuery(`
            SELECT priority, COUNT(*) as count
            FROM tasks
            WHERE created_at BETWEEN $1 AND $2
            GROUP BY priority
        `, [startDate, endDate]);

        const byPriority: Record<string, number> = {};
        for (const row of result || []) {
            byPriority[row.priority] = Number(row.count);
        }
        return byPriority;
    }

    // ==================== Helpers ====================

    private getDateRange(config: ReportConfig): { startDate: Date; endDate: Date } {
        if (config.startDate && config.endDate) {
            return { startDate: config.startDate, endDate: config.endDate };
        }

        const now = new Date();
        const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

        let startDate: Date;
        switch (config.type) {
            case 'daily':
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
                break;
            case 'weekly':
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 7);
                startDate.setHours(0, 0, 0, 0);
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        }

        return { startDate, endDate };
    }

    private async safeQuery(sql: string, params: any[]): Promise<any[] | null> {
        try {
            return await this.dataSource.query(sql, params);
        } catch {
            return null;
        }
    }
}
