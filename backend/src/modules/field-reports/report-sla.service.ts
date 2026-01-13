/**
 * Report SLA Service
 * 案件服務等級協議監控
 * 
 * 根據嚴重度自動計算 SLA 期限，監控逾期案件
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { FieldReport, FieldReportStatus } from './entities/field-report.entity';

/**
 * SLA 配置 (以分鐘為單位)
 */
export interface SlaConfig {
    /** 嚴重度 -> 回應時限 (分鐘) */
    responseDeadline: Record<number, number>;
    /** 嚴重度 -> 解決時限 (分鐘) */
    resolutionDeadline: Record<number, number>;
}

/**
 * 預設 SLA 配置
 * Severity 4 (Critical): 15分鐘回應, 2小時解決
 * Severity 3 (High): 30分鐘回應, 4小時解決
 * Severity 2 (Medium): 1小時回應, 8小時解決
 * Severity 1 (Low): 2小時回應, 24小時解決
 * Severity 0 (Info): 4小時回應, 48小時解決
 */
const DEFAULT_SLA_CONFIG: SlaConfig = {
    responseDeadline: {
        4: 15,       // 15 分鐘
        3: 30,       // 30 分鐘
        2: 60,       // 1 小時
        1: 120,      // 2 小時
        0: 240,      // 4 小時
    },
    resolutionDeadline: {
        4: 120,      // 2 小時
        3: 240,      // 4 小時
        2: 480,      // 8 小時
        1: 1440,     // 24 小時
        0: 2880,     // 48 小時
    },
};

export interface SlaStatus {
    reportId: string;
    severity: number;
    status: FieldReportStatus;
    createdAt: Date;
    responseDeadline: Date;
    resolutionDeadline: Date;
    isResponseOverdue: boolean;
    isResolutionOverdue: boolean;
    responseTimeRemaining: number;  // minutes (negative if overdue)
    resolutionTimeRemaining: number;
}

export interface OverdueReport extends SlaStatus {
    missionSessionId: string;
    message: string;
    reporterName: string;
    overdueMinutes: number;
}

@Injectable()
export class ReportSlaService {
    private readonly logger = new Logger(ReportSlaService.name);
    private config: SlaConfig = DEFAULT_SLA_CONFIG;

    constructor(
        @InjectRepository(FieldReport)
        private readonly reportRepo: Repository<FieldReport>,
    ) { }

    /**
     * 更新 SLA 配置
     */
    setConfig(config: Partial<SlaConfig>): void {
        this.config = { ...this.config, ...config };
    }

    /**
     * 取得案件的 SLA 狀態
     */
    getSlaStatus(report: FieldReport): SlaStatus {
        const now = new Date();
        const responseDeadline = this.calculateResponseDeadline(report);
        const resolutionDeadline = this.calculateResolutionDeadline(report);

        // 已回應的案件 (status != 'new') 不再計算回應逾期
        const isResponseOverdue =
            report.status === 'new' && now > responseDeadline;

        // 未結案的案件計算解決逾期
        const isResolutionOverdue =
            !['closed', 'cancelled'].includes(report.status) && now > resolutionDeadline;

        return {
            reportId: report.id,
            severity: report.severity,
            status: report.status,
            createdAt: report.createdAt,
            responseDeadline,
            resolutionDeadline,
            isResponseOverdue,
            isResolutionOverdue,
            responseTimeRemaining: Math.round((responseDeadline.getTime() - now.getTime()) / 60000),
            resolutionTimeRemaining: Math.round((resolutionDeadline.getTime() - now.getTime()) / 60000),
        };
    }

    /**
     * 計算回應期限
     */
    calculateResponseDeadline(report: FieldReport): Date {
        const minutes = this.config.responseDeadline[report.severity] || 60;
        const deadline = new Date(report.createdAt);
        deadline.setMinutes(deadline.getMinutes() + minutes);
        return deadline;
    }

    /**
     * 計算解決期限
     */
    calculateResolutionDeadline(report: FieldReport): Date {
        const minutes = this.config.resolutionDeadline[report.severity] || 480;
        const deadline = new Date(report.createdAt);
        deadline.setMinutes(deadline.getMinutes() + minutes);
        return deadline;
    }

    /**
     * 查詢回應逾期的案件
     */
    async findResponseOverdue(missionSessionId?: string): Promise<OverdueReport[]> {
        const now = new Date();
        const overdueReports: OverdueReport[] = [];

        // 查詢所有 status='new' 的案件
        const query = this.reportRepo.createQueryBuilder('r')
            .where('r.status = :status', { status: 'new' })
            .andWhere('r.deleted_at IS NULL');

        if (missionSessionId) {
            query.andWhere('r.mission_session_id = :missionSessionId', { missionSessionId });
        }

        const reports = await query.getMany();

        for (const report of reports) {
            const deadline = this.calculateResponseDeadline(report);
            if (now > deadline) {
                const slaStatus = this.getSlaStatus(report);
                overdueReports.push({
                    ...slaStatus,
                    missionSessionId: report.missionSessionId,
                    message: report.message,
                    reporterName: report.reporterName,
                    overdueMinutes: Math.abs(slaStatus.responseTimeRemaining),
                });
            }
        }

        return overdueReports.sort((a, b) => b.overdueMinutes - a.overdueMinutes);
    }

    /**
     * 查詢解決逾期的案件
     */
    async findResolutionOverdue(missionSessionId?: string): Promise<OverdueReport[]> {
        const now = new Date();
        const overdueReports: OverdueReport[] = [];

        // 查詢所有未結案的案件
        const query = this.reportRepo.createQueryBuilder('r')
            .where('r.status NOT IN (:...closedStatuses)', {
                closedStatuses: ['closed', 'cancelled'],
            })
            .andWhere('r.deleted_at IS NULL');

        if (missionSessionId) {
            query.andWhere('r.mission_session_id = :missionSessionId', { missionSessionId });
        }

        const reports = await query.getMany();

        for (const report of reports) {
            const deadline = this.calculateResolutionDeadline(report);
            if (now > deadline) {
                const slaStatus = this.getSlaStatus(report);
                overdueReports.push({
                    ...slaStatus,
                    missionSessionId: report.missionSessionId,
                    message: report.message,
                    reporterName: report.reporterName,
                    overdueMinutes: Math.abs(slaStatus.resolutionTimeRemaining),
                });
            }
        }

        return overdueReports.sort((a, b) => b.overdueMinutes - a.overdueMinutes);
    }

    /**
     * 取得 SLA 統計
     */
    async getSlaStats(missionSessionId: string): Promise<{
        total: number;
        responseOverdue: number;
        resolutionOverdue: number;
        withinSla: number;
        avgResponseTime: number;
        avgResolutionTime: number;
    }> {
        const reports = await this.reportRepo.find({
            where: { missionSessionId, deletedAt: undefined as any },
        });

        let responseOverdue = 0;
        let resolutionOverdue = 0;
        let totalResponseTime = 0;
        let totalResolutionTime = 0;
        let respondedCount = 0;
        let resolvedCount = 0;

        const now = new Date();

        for (const report of reports) {
            const slaStatus = this.getSlaStatus(report);

            if (slaStatus.isResponseOverdue) responseOverdue++;
            if (slaStatus.isResolutionOverdue) resolutionOverdue++;

            // 計算已回應案件的回應時間
            if (report.status !== 'new') {
                const responseTime = (report.updatedAt.getTime() - report.createdAt.getTime()) / 60000;
                totalResponseTime += responseTime;
                respondedCount++;
            }

            // 計算已結案案件的解決時間
            if (['closed', 'cancelled'].includes(report.status)) {
                const resolutionTime = (report.updatedAt.getTime() - report.createdAt.getTime()) / 60000;
                totalResolutionTime += resolutionTime;
                resolvedCount++;
            }
        }

        return {
            total: reports.length,
            responseOverdue,
            resolutionOverdue,
            withinSla: reports.length - responseOverdue - resolutionOverdue,
            avgResponseTime: respondedCount > 0 ? Math.round(totalResponseTime / respondedCount) : 0,
            avgResolutionTime: resolvedCount > 0 ? Math.round(totalResolutionTime / resolvedCount) : 0,
        };
    }

    /**
     * 取得即將逾期的案件 (預警)
     */
    async findApproachingDeadline(
        missionSessionId: string,
        warningMinutes: number = 15,
    ): Promise<OverdueReport[]> {
        const now = new Date();
        const warnings: OverdueReport[] = [];

        const reports = await this.reportRepo.find({
            where: {
                missionSessionId,
                status: In(['new', 'triaged', 'task_created', 'assigned', 'in_progress']),
                deletedAt: undefined as any,
            },
        });

        for (const report of reports) {
            const slaStatus = this.getSlaStatus(report);

            // 回應即將逾期
            if (
                report.status === 'new' &&
                slaStatus.responseTimeRemaining > 0 &&
                slaStatus.responseTimeRemaining <= warningMinutes
            ) {
                warnings.push({
                    ...slaStatus,
                    missionSessionId: report.missionSessionId,
                    message: report.message,
                    reporterName: report.reporterName,
                    overdueMinutes: -slaStatus.responseTimeRemaining, // 負數表示剩餘時間
                });
            }

            // 解決即將逾期
            if (
                slaStatus.resolutionTimeRemaining > 0 &&
                slaStatus.resolutionTimeRemaining <= warningMinutes
            ) {
                warnings.push({
                    ...slaStatus,
                    missionSessionId: report.missionSessionId,
                    message: report.message,
                    reporterName: report.reporterName,
                    overdueMinutes: -slaStatus.resolutionTimeRemaining,
                });
            }
        }

        return warnings.sort((a, b) => a.overdueMinutes - b.overdueMinutes);
    }
}
