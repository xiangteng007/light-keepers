import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Volunteer } from '../volunteers/volunteers.entity';
import { VolunteerAssignment } from '../volunteers/volunteer-assignments.entity';
import { Report } from '../reports/reports.entity';

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

        // 按志工彙總
        const volunteerHours: Record<string, { name: string; totalMinutes: number; taskCount: number }> = {};

        for (const a of assignments) {
            const vid = a.volunteerId;
            if (!volunteerHours[vid]) {
                volunteerHours[vid] = {
                    name: a.volunteer?.name || 'Unknown',
                    totalMinutes: 0,
                    taskCount: 0,
                };
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
            where: {
                createdAt: Between(startDate, endDate),
            },
        });

        // 依類型統計
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
            data: {
                total: reports.length,
                byType,
                bySeverity,
                byStatus,
            },
        };
    }

    // 產生 CSV 格式
    generateCSV(report: ReportData): string {
        const rows = report.data.rows || [];
        if (rows.length === 0) return '';

        const headers = Object.keys(rows[0]).join(',');
        const data = rows.map((r: any) => Object.values(r).join(',')).join('\n');

        return `${headers}\n${data}`;
    }

    // 產生 JSON 格式匯出
    generateJSON(report: ReportData): string {
        return JSON.stringify(report, null, 2);
    }
}
