/**
 * Dashboard Statistics Service
 * Real-time KPIs and statistics for Emergency Response dashboard
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { FieldReport, SosSignal } from '../field-reports/entities';
import { DispatchTask } from '../task-dispatch/entities/dispatch-task.entity';

export interface DashboardStats {
    timestamp: Date;
    fieldReports: {
        total: number;
        last24h: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
        bySeverity: Record<number, number>;
        trendHourly: { hour: string; count: number }[];
    };
    sosSignals: {
        total: number;
        active: number;
        acknowledged: number;
        resolved: number;
        avgResponseMinutes: number | null;
        trendHourly: { hour: string; count: number }[];
    };
    tasks: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        overdue: number;
        completionRate: number;
    };
    recentActivity: ActivityItem[];
}

export interface ActivityItem {
    id: string;
    type: 'report' | 'sos' | 'task';
    action: string;
    description: string;
    timestamp: Date;
    severity?: number;
}

export interface TimeSeriesData {
    label: string;
    data: { timestamp: Date; value: number }[];
}

@Injectable()
export class DashboardStatsService {
    private readonly logger = new Logger(DashboardStatsService.name);

    constructor(
        @InjectRepository(FieldReport)
        private fieldReportsRepo: Repository<FieldReport>,
        @InjectRepository(SosSignal)
        private sosRepo: Repository<SosSignal>,
        @InjectRepository(DispatchTask)
        private tasksRepo: Repository<DispatchTask>,
    ) { }

    /**
     * Get comprehensive dashboard statistics
     */
    async getDashboardStats(missionSessionId?: string): Promise<DashboardStats> {
        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const whereClause = missionSessionId ? { missionSessionId } : {};
        const where24h = missionSessionId
            ? { missionSessionId, createdAt: MoreThan(last24h) }
            : { createdAt: MoreThan(last24h) };

        // Parallel queries
        const [
            allReports,
            reports24h,
            allSos,
            activeSos,
            allTasks,
        ] = await Promise.all([
            this.fieldReportsRepo.find({ where: whereClause }),
            this.fieldReportsRepo.find({ where: where24h }),
            this.sosRepo.find({ where: whereClause }),
            this.sosRepo.find({ where: { ...whereClause, status: 'active' } }),
            missionSessionId
                ? this.tasksRepo.find({ where: { missionSessionId } })
                : this.tasksRepo.find(),
        ]);

        // Calculate field report stats
        const reportsByStatus: Record<string, number> = {};
        const reportsByType: Record<string, number> = {};
        const reportsBySeverity: Record<number, number> = {};

        for (const r of allReports) {
            reportsByStatus[r.status] = (reportsByStatus[r.status] || 0) + 1;
            reportsByType[r.type] = (reportsByType[r.type] || 0) + 1;
            reportsBySeverity[r.severity] = (reportsBySeverity[r.severity] || 0) + 1;
        }

        // Calculate SOS stats
        const acknowledgedSos = allSos.filter(s => s.status === 'acked').length;
        const resolvedSos = allSos.filter(s => s.status === 'resolved').length;
        const avgResponseMinutes = this.calculateAvgResponseTime(allSos);

        // Calculate task stats
        const pendingTasks = allTasks.filter(t => t.status === 'pending' || t.status === 'assigned').length;
        const inProgressTasks = allTasks.filter(t => t.status === 'accepted' || t.status === 'in_progress').length;
        const completedTasks = allTasks.filter(t => t.status === 'completed').length;
        const overdueTasks = allTasks.filter(t =>
            t.dueAt && new Date(t.dueAt) < now && t.status !== 'completed' && t.status !== 'cancelled'
        ).length;
        const completionRate = allTasks.length > 0
            ? Math.round(completedTasks / allTasks.length * 100)
            : 0;

        // Hourly trends (last 24h)
        const reportsTrend = this.calculateHourlyTrend(reports24h.map(r => r.createdAt));
        const sosTrend = this.calculateHourlyTrend(
            allSos.filter(s => s.createdAt > last24h).map(s => s.createdAt)
        );

        // Recent activity
        const recentActivity = await this.getRecentActivity(missionSessionId, 10);

        return {
            timestamp: now,
            fieldReports: {
                total: allReports.length,
                last24h: reports24h.length,
                byStatus: reportsByStatus,
                byType: reportsByType,
                bySeverity: reportsBySeverity,
                trendHourly: reportsTrend,
            },
            sosSignals: {
                total: allSos.length,
                active: activeSos.length,
                acknowledged: acknowledgedSos,
                resolved: resolvedSos,
                avgResponseMinutes,
                trendHourly: sosTrend,
            },
            tasks: {
                total: allTasks.length,
                pending: pendingTasks,
                inProgress: inProgressTasks,
                completed: completedTasks,
                overdue: overdueTasks,
                completionRate,
            },
            recentActivity,
        };
    }

    /**
     * Get time series data for charts
     */
    async getTimeSeries(
        missionSessionId: string,
        metric: 'reports' | 'sos' | 'tasks',
        startDate: Date,
        endDate: Date,
        interval: 'hour' | 'day' = 'hour'
    ): Promise<TimeSeriesData> {
        let data: { timestamp: Date; value: number }[] = [];
        const whereClause = {
            missionSessionId,
            createdAt: Between(startDate, endDate),
        };

        if (metric === 'reports') {
            const reports = await this.fieldReportsRepo.find({ where: whereClause });
            data = this.aggregateByInterval(reports.map(r => r.createdAt), startDate, endDate, interval);
        } else if (metric === 'sos') {
            const signals = await this.sosRepo.find({ where: whereClause });
            data = this.aggregateByInterval(signals.map(s => s.createdAt), startDate, endDate, interval);
        } else if (metric === 'tasks') {
            const tasks = await this.tasksRepo.find({
                where: { missionSessionId, createdAt: Between(startDate, endDate) }
            });
            data = this.aggregateByInterval(tasks.map(t => t.createdAt), startDate, endDate, interval);
        }

        return { label: metric, data };
    }

    /**
     * Get severity distribution over time
     */
    async getSeverityTrend(
        missionSessionId: string,
        days: number = 7
    ): Promise<Record<number, TimeSeriesData>> {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const reports = await this.fieldReportsRepo.find({
            where: {
                missionSessionId,
                createdAt: Between(startDate, endDate),
            },
        });

        const result: Record<number, TimeSeriesData> = {};
        for (let severity = 1; severity <= 5; severity++) {
            const filtered = reports.filter(r => r.severity === severity);
            result[severity] = {
                label: `Severity ${severity}`,
                data: this.aggregateByInterval(
                    filtered.map(r => r.createdAt),
                    startDate,
                    endDate,
                    'day'
                ),
            };
        }

        return result;
    }

    /**
     * Get top reporters
     */
    async getTopReporters(missionSessionId: string, limit: number = 10): Promise<{
        name: string;
        count: number;
    }[]> {
        const reports = await this.fieldReportsRepo.find({
            where: { missionSessionId },
        });

        const countByReporter: Record<string, number> = {};
        for (const r of reports) {
            const name = r.reporterName || 'Unknown';
            countByReporter[name] = (countByReporter[name] || 0) + 1;
        }

        return Object.entries(countByReporter)
            .sort((a, b) => b[1] - a[1])
            .slice(0, limit)
            .map(([name, count]) => ({ name, count }));
    }

    // ==================== Private Helpers ====================

    private calculateAvgResponseTime(signals: SosSignal[]): number | null {
        const ackedSignals = signals.filter(s => s.ackedAt);
        if (ackedSignals.length === 0) return null;

        const totalMs = ackedSignals.reduce((sum, s) => {
            const created = new Date(s.createdAt).getTime();
            const acked = new Date(s.ackedAt!).getTime();
            return sum + (acked - created);
        }, 0);

        return Math.round(totalMs / ackedSignals.length / 60000 * 10) / 10;
    }

    private calculateHourlyTrend(timestamps: Date[]): { hour: string; count: number }[] {
        const now = new Date();
        const result: { hour: string; count: number }[] = [];

        for (let i = 23; i >= 0; i--) {
            const hourStart = new Date(now.getTime() - i * 60 * 60 * 1000);
            hourStart.setMinutes(0, 0, 0);
            const hourEnd = new Date(hourStart.getTime() + 60 * 60 * 1000);

            const count = timestamps.filter(t => {
                const ts = new Date(t);
                return ts >= hourStart && ts < hourEnd;
            }).length;

            result.push({
                hour: hourStart.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }),
                count,
            });
        }

        return result;
    }

    private aggregateByInterval(
        timestamps: Date[],
        startDate: Date,
        endDate: Date,
        interval: 'hour' | 'day'
    ): { timestamp: Date; value: number }[] {
        const result: { timestamp: Date; value: number }[] = [];
        const intervalMs = interval === 'hour' ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

        let current = new Date(startDate);
        while (current < endDate) {
            const next = new Date(current.getTime() + intervalMs);
            const count = timestamps.filter(t => {
                const ts = new Date(t);
                return ts >= current && ts < next;
            }).length;

            result.push({ timestamp: new Date(current), value: count });
            current = next;
        }

        return result;
    }

    private async getRecentActivity(
        missionSessionId: string | undefined,
        limit: number
    ): Promise<ActivityItem[]> {
        const activities: ActivityItem[] = [];
        const whereClause = missionSessionId ? { missionSessionId } : {};

        // Get recent reports
        const recentReports = await this.fieldReportsRepo.find({
            where: whereClause,
            order: { createdAt: 'DESC' },
            take: limit,
        });

        for (const r of recentReports) {
            activities.push({
                id: r.id,
                type: 'report',
                action: 'created',
                description: `${r.reporterName || '匿名'} 回報了 ${r.type}`,
                timestamp: r.createdAt,
                severity: r.severity,
            });
        }

        // Get recent SOS
        const recentSos = await this.sosRepo.find({
            where: whereClause,
            order: { createdAt: 'DESC' },
            take: limit,
        });

        for (const s of recentSos) {
            activities.push({
                id: s.id,
                type: 'sos',
                action: s.status,
                description: `${s.userName} 發送 SOS 求救`,
                timestamp: s.createdAt,
                severity: 5,
            });
        }

        // Sort by timestamp and limit
        return activities
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, limit);
    }
}
