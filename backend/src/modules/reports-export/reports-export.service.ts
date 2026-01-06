import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Volunteer } from '../volunteers/volunteers.entity';
import { VolunteerAssignment } from '../volunteers/volunteer-assignments.entity';
import { Report } from '../reports/reports.entity';
import { Resource } from '../resources/resources.entity';
import { ResourceTransaction } from '../resources/resource-transaction.entity';
import { FieldReport, SosSignal } from '../field-reports/entities';

export interface ReportData {
    title: string;
    generatedAt: Date;
    period: { start: Date; end: Date };
    data: any;
}

@Injectable()
export class ReportsExportService {
    private readonly logger = new Logger(ReportsExportService.name);

    constructor(
        @InjectRepository(Volunteer)
        private volunteersRepo: Repository<Volunteer>,
        @InjectRepository(VolunteerAssignment)
        private assignmentsRepo: Repository<VolunteerAssignment>,
        @InjectRepository(Report)
        private reportsRepo: Repository<Report>,
        @InjectRepository(Resource)
        private resourcesRepo: Repository<Resource>,
        @InjectRepository(ResourceTransaction)
        private transactionsRepo: Repository<ResourceTransaction>,
        @InjectRepository(FieldReport)
        private fieldReportsRepo: Repository<FieldReport>,
        @InjectRepository(SosSignal)
        private sosRepo: Repository<SosSignal>,
    ) { }

    // 志工時數報表
    async getVolunteerHoursReport(startDate: Date, endDate: Date): Promise<ReportData> {
        const assignments = await this.assignmentsRepo.find({
            where: {
                status: 'completed' as const,
                checkOutAt: Between(startDate, endDate),
            },
            relations: ['volunteer'],
        });

        const volunteerHours: Record<string, { name: string; totalMinutes: number; taskCount: number }> = {};
        for (const a of assignments) {
            const vid = a.volunteerId;
            if (!volunteerHours[vid]) {
                volunteerHours[vid] = { name: a.volunteer?.name || 'Unknown', totalMinutes: 0, taskCount: 0 };
            }
            volunteerHours[vid].totalMinutes += a.minutesLogged;
            volunteerHours[vid].taskCount++;
        }

        const rows = Object.entries(volunteerHours).map(([id, data]) => ({
            volunteerId: id,
            name: data.name,
            hours: Math.round(data.totalMinutes / 60 * 10) / 10,
            taskCount: data.taskCount,
        }));

        return {
            title: '志工服務時數報表',
            generatedAt: new Date(),
            period: { start: startDate, end: endDate },
            data: {
                totalVolunteers: rows.length,
                totalHours: rows.reduce((sum, r) => sum + r.hours, 0),
                totalTasks: rows.reduce((sum, r) => sum + r.taskCount, 0),
                rows: rows.sort((a, b) => b.hours - a.hours),
            },
        };
    }

    // 災情統計報表
    async getDisasterReport(startDate: Date, endDate: Date): Promise<ReportData> {
        const reports = await this.reportsRepo.find({
            where: { createdAt: Between(startDate, endDate) },
        });

        const byType: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};
        const byStatus: Record<string, number> = {};
        for (const r of reports) {
            byType[r.type] = (byType[r.type] || 0) + 1;
            bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
            byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        }

        return {
            title: '災情回報統計報表',
            generatedAt: new Date(),
            period: { start: startDate, end: endDate },
            data: { total: reports.length, byType, bySeverity, byStatus },
        };
    }

    // ==================== 現場回報 (Emergency Response) ====================

    // 現場回報報表
    async getFieldReportsExport(missionSessionId: string, startDate?: Date, endDate?: Date): Promise<ReportData> {
        const whereClause: any = { missionSessionId };
        if (startDate && endDate) {
            whereClause.createdAt = Between(startDate, endDate);
        }

        const reports = await this.fieldReportsRepo.find({
            where: whereClause,
            order: { createdAt: 'DESC' },
        });

        const byType: Record<string, number> = {};
        const bySeverity: Record<number, number> = {};
        const byStatus: Record<string, number> = {};
        for (const r of reports) {
            byType[r.type] = (byType[r.type] || 0) + 1;
            bySeverity[r.severity] = (bySeverity[r.severity] || 0) + 1;
            byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        }

        const rows = reports.map(r => ({
            id: r.id,
            type: r.type,
            severity: r.severity,
            status: r.status,
            reporterName: r.reporterName,
            message: (r.message || '').replace(/,/g, ' '),
            category: r.category || '',
            occurredAt: r.occurredAt?.toISOString() || '',
            createdAt: r.createdAt.toISOString(),
        }));

        return {
            title: '現場回報報表',
            generatedAt: new Date(),
            period: { start: startDate || new Date(0), end: endDate || new Date() },
            data: { missionSessionId, total: reports.length, byType, bySeverity, byStatus, rows },
        };
    }

    // SOS 信號報表
    async getSosExport(missionSessionId: string, startDate?: Date, endDate?: Date): Promise<ReportData> {
        const whereClause: any = { missionSessionId };
        if (startDate && endDate) {
            whereClause.createdAt = Between(startDate, endDate);
        }

        const signals = await this.sosRepo.find({
            where: whereClause,
            order: { createdAt: 'DESC' },
        });

        const byStatus: Record<string, number> = {};
        for (const s of signals) {
            byStatus[s.status] = (byStatus[s.status] || 0) + 1;
        }

        const rows = signals.map(s => ({
            id: s.id,
            userName: s.userName,
            status: s.status,
            createdAt: s.createdAt.toISOString(),
            ackedAt: s.ackedAt?.toISOString() || '',
            ackedBy: s.ackedBy || '',
            resolvedAt: s.resolvedAt?.toISOString() || '',
            resolvedBy: s.resolvedBy || '',
        }));

        const ackedSignals = signals.filter(s => s.ackedAt);
        let avgResponseTime: number | null = null;
        if (ackedSignals.length > 0) {
            const totalMs = ackedSignals.reduce((sum, s) => {
                return sum + (new Date(s.ackedAt!).getTime() - new Date(s.createdAt).getTime());
            }, 0);
            avgResponseTime = Math.round(totalMs / ackedSignals.length / 60000 * 10) / 10;
        }

        return {
            title: 'SOS 求救信號報表',
            generatedAt: new Date(),
            period: { start: startDate || new Date(0), end: endDate || new Date() },
            data: { missionSessionId, total: signals.length, byStatus, avgResponseTimeMinutes: avgResponseTime, rows },
        };
    }

    // 任務統計摘要
    async getMissionSummary(missionSessionId: string): Promise<ReportData> {
        const [fieldReports, sosSignals] = await Promise.all([
            this.fieldReportsRepo.find({ where: { missionSessionId } }),
            this.sosRepo.find({ where: { missionSessionId } }),
        ]);

        const countBy = <T>(items: T[], field: keyof T): Record<string, number> => {
            const counts: Record<string, number> = {};
            for (const item of items) {
                const key = String(item[field]);
                counts[key] = (counts[key] || 0) + 1;
            }
            return counts;
        };

        return {
            title: '任務統計摘要',
            generatedAt: new Date(),
            period: { start: new Date(), end: new Date() },
            data: {
                missionSessionId,
                fieldReports: {
                    total: fieldReports.length,
                    byType: countBy(fieldReports, 'type'),
                    bySeverity: countBy(fieldReports, 'severity'),
                    byStatus: countBy(fieldReports, 'status'),
                },
                sosSignals: {
                    total: sosSignals.length,
                    byStatus: countBy(sosSignals, 'status'),
                },
            },
        };
    }

    // ==================== 庫存報表 ====================

    // 庫存報表
    async getInventoryReport(): Promise<ReportData> {
        const resources = await this.resourcesRepo.find({
            order: { category: 'ASC', name: 'ASC' },
        });

        const byCategory: Record<string, { count: number; totalQuantity: number; lowStock: number; depleted: number }> = {};
        let totalLowStock = 0;
        let totalDepleted = 0;
        let totalExpiringSoon = 0;

        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        for (const r of resources) {
            if (!byCategory[r.category]) {
                byCategory[r.category] = { count: 0, totalQuantity: 0, lowStock: 0, depleted: 0 };
            }
            byCategory[r.category].count++;
            byCategory[r.category].totalQuantity += r.quantity;
            if (r.status === 'low') { byCategory[r.category].lowStock++; totalLowStock++; }
            if (r.status === 'depleted') { byCategory[r.category].depleted++; totalDepleted++; }
            if (r.expiresAt && new Date(r.expiresAt) <= thirtyDaysLater) { totalExpiringSoon++; }
        }

        const rows = resources.map(r => ({
            id: r.id, name: r.name, category: r.category, quantity: r.quantity, unit: r.unit,
            minQuantity: r.minQuantity, status: r.status, location: r.location || '',
            expiresAt: r.expiresAt ? new Date(r.expiresAt).toISOString().split('T')[0] : '',
        }));

        return {
            title: '物資庫存報表',
            generatedAt: new Date(),
            period: { start: new Date(), end: new Date() },
            data: { total: resources.length, totalLowStock, totalDepleted, totalExpiringSoon, byCategory, rows },
        };
    }

    // 庫存異動報表
    async getInventoryTransactionReport(startDate: Date, endDate: Date): Promise<ReportData> {
        const transactions = await this.transactionsRepo.find({
            where: { createdAt: Between(startDate, endDate) },
            order: { createdAt: 'DESC' },
        });

        const byType: Record<string, { count: number; totalQuantity: number }> = {};
        for (const t of transactions) {
            if (!byType[t.type]) { byType[t.type] = { count: 0, totalQuantity: 0 }; }
            byType[t.type].count++;
            byType[t.type].totalQuantity += t.quantity;
        }

        const rows = transactions.map(t => ({
            id: t.id, resourceId: t.resourceId, type: t.type, quantity: t.quantity,
            beforeQuantity: t.beforeQuantity, afterQuantity: t.afterQuantity,
            operatorName: t.operatorName, notes: t.notes || '', createdAt: t.createdAt.toISOString(),
        }));

        return {
            title: '物資異動報表',
            generatedAt: new Date(),
            period: { start: startDate, end: endDate },
            data: { total: transactions.length, byType, rows },
        };
    }

    // 產生 CSV 格式
    generateCSV(report: ReportData): string {
        const rows = report.data.rows || [];
        if (rows.length === 0) return '';

        const headers = Object.keys(rows[0]).join(',');
        const data = rows.map((r: any) =>
            Object.values(r).map(v =>
                typeof v === 'string' && (v.includes(',') || v.includes('"')) ? `"${v.replace(/"/g, '""')}"` : v
            ).join(',')
        ).join('\n');

        return `${headers}\n${data}`;
    }

    // 產生 JSON 格式匯出
    generateJSON(report: ReportData): string {
        return JSON.stringify(report, null, 2);
    }
}
