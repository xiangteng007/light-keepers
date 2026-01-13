/**
 * Report Deduplication Service
 * 案件去重服務
 * 
 * 使用 PostGIS 空間查詢 + 文字相似度來偵測可能重複的案件
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FieldReport, FieldReportStatus } from './entities/field-report.entity';

export interface DuplicateCandidate {
    reportId: string;
    matchedReportId: string;
    matchScore: number;
    matchReasons: string[];
    distance: number;  // meters
    timeDiff: number;  // minutes
}

export interface DeduplicationResult {
    reportId: string;
    hasDuplicates: boolean;
    candidates: DuplicateCandidate[];
    autoMerged: boolean;
}

export interface DeduplicationConfig {
    /** 距離閾值 (公尺，預設 100m) */
    maxDistanceM: number;
    /** 時間窗口 (分鐘，預設 30 分鐘) */
    timeWindowMinutes: number;
    /** 自動合併門檻分數 (0-100，預設 90) */
    autoMergeThreshold: number;
    /** 嚴重度必須相同才能合併 */
    requireSameSeverity: boolean;
}

const DEFAULT_CONFIG: DeduplicationConfig = {
    maxDistanceM: 100,
    timeWindowMinutes: 30,
    autoMergeThreshold: 90,
    requireSameSeverity: true,
};

@Injectable()
export class ReportDeduplicationService {
    private readonly logger = new Logger(ReportDeduplicationService.name);

    constructor(
        @InjectRepository(FieldReport)
        private readonly reportRepo: Repository<FieldReport>,
    ) { }

    /**
     * 檢查新案件是否與現有案件重複
     */
    async checkDuplicates(
        reportId: string,
        config: Partial<DeduplicationConfig> = {},
    ): Promise<DeduplicationResult> {
        const cfg = { ...DEFAULT_CONFIG, ...config };
        const report = await this.reportRepo.findOne({ where: { id: reportId } });

        if (!report) {
            return {
                reportId,
                hasDuplicates: false,
                candidates: [],
                autoMerged: false,
            };
        }

        const candidates = await this.findSimilarReports(report, cfg);

        return {
            reportId,
            hasDuplicates: candidates.length > 0,
            candidates,
            autoMerged: false, // Auto-merge logic would go here
        };
    }

    /**
     * 找出可能相似的案件
     * 使用 PostGIS ST_DWithin 進行空間查詢
     */
    async findSimilarReports(
        report: FieldReport,
        config: DeduplicationConfig,
    ): Promise<DuplicateCandidate[]> {
        const timeWindowStart = new Date(report.occurredAt);
        timeWindowStart.setMinutes(timeWindowStart.getMinutes() - config.timeWindowMinutes);

        const timeWindowEnd = new Date(report.occurredAt);
        timeWindowEnd.setMinutes(timeWindowEnd.getMinutes() + config.timeWindowMinutes);

        // 使用 PostGIS ST_DWithin 查詢
        // 需要將公尺轉換為度數 (約略計算: 1度 ≈ 111320m)
        const distanceInDegrees = config.maxDistanceM / 111320;

        const query = this.reportRepo
            .createQueryBuilder('r')
            .select([
                'r.id',
                'r.message',
                'r.type',
                'r.severity',
                'r.status',
                'r.occurred_at',
                'r.reporter_name',
            ])
            .addSelect(
                `ST_Distance(r.geom, (SELECT geom FROM field_reports WHERE id = :reportId))`,
                'distance',
            )
            .where('r.id != :reportId', { reportId: report.id })
            .andWhere('r.mission_session_id = :missionSessionId', {
                missionSessionId: report.missionSessionId,
            })
            .andWhere('r.deleted_at IS NULL')
            .andWhere('r.occurred_at BETWEEN :start AND :end', {
                start: timeWindowStart,
                end: timeWindowEnd,
            })
            .andWhere(
                `ST_DWithin(r.geom, (SELECT geom FROM field_reports WHERE id = :reportId), :distance)`,
                { reportId: report.id, distance: distanceInDegrees },
            );

        // 可選: 嚴重度必須相同
        if (config.requireSameSeverity) {
            query.andWhere('r.severity = :severity', { severity: report.severity });
        }

        // 同類型優先
        query.andWhere('r.type = :type', { type: report.type });

        query.orderBy('distance', 'ASC').limit(10);

        const results = await query.getRawMany();

        return results.map((r) => ({
            reportId: report.id,
            matchedReportId: r.r_id,
            matchScore: this.calculateMatchScore(report, r),
            matchReasons: this.getMatchReasons(report, r),
            distance: Math.round((r.distance || 0) * 111320), // 轉回公尺
            timeDiff: Math.abs(
                (new Date(r.r_occurred_at).getTime() - report.occurredAt.getTime()) / 60000,
            ),
        }));
    }

    /**
     * 計算匹配分數 (0-100)
     */
    private calculateMatchScore(report: FieldReport, candidate: any): number {
        let score = 0;

        // 距離分數 (越近分數越高)
        const distanceM = (candidate.distance || 0) * 111320;
        if (distanceM < 10) score += 40;
        else if (distanceM < 30) score += 30;
        else if (distanceM < 50) score += 20;
        else if (distanceM < 100) score += 10;

        // 類型相同
        if (report.type === candidate.r_type) {
            score += 20;
        }

        // 嚴重度相同
        if (report.severity === candidate.r_severity) {
            score += 15;
        }

        // 時間接近度
        const timeDiffMin = Math.abs(
            (new Date(candidate.r_occurred_at).getTime() - report.occurredAt.getTime()) / 60000,
        );
        if (timeDiffMin < 5) score += 15;
        else if (timeDiffMin < 15) score += 10;
        else if (timeDiffMin < 30) score += 5;

        // 文字相似度 (簡化版本)
        if (report.message && candidate.r_message) {
            const similarity = this.calculateTextSimilarity(report.message, candidate.r_message);
            score += Math.round(similarity * 10);
        }

        return Math.min(100, score);
    }

    /**
     * 簡單文字相似度計算 (Jaccard 相似度)
     */
    private calculateTextSimilarity(text1: string, text2: string): number {
        if (!text1 || !text2) return 0;

        // 分詞 (簡單用空格和標點分割)
        const words1 = new Set(text1.toLowerCase().match(/[\u4e00-\u9fa5]+|\w+/g) || []);
        const words2 = new Set(text2.toLowerCase().match(/[\u4e00-\u9fa5]+|\w+/g) || []);

        if (words1.size === 0 || words2.size === 0) return 0;

        // 計算交集
        const intersection = new Set([...words1].filter((x) => words2.has(x)));

        // Jaccard = |A ∩ B| / |A ∪ B|
        const union = new Set([...words1, ...words2]);

        return intersection.size / union.size;
    }

    /**
     * 取得匹配原因
     */
    private getMatchReasons(report: FieldReport, candidate: any): string[] {
        const reasons: string[] = [];
        const distanceM = Math.round((candidate.distance || 0) * 111320);

        if (distanceM < 50) {
            reasons.push(`位置接近 (${distanceM}m)`);
        }

        if (report.type === candidate.r_type) {
            reasons.push('類型相同');
        }

        if (report.severity === candidate.r_severity) {
            reasons.push('嚴重度相同');
        }

        const timeDiffMin = Math.abs(
            (new Date(candidate.r_occurred_at).getTime() - report.occurredAt.getTime()) / 60000,
        );
        if (timeDiffMin < 15) {
            reasons.push(`時間接近 (${Math.round(timeDiffMin)}分鐘內)`);
        }

        return reasons;
    }

    /**
     * 合併重複案件
     */
    async mergeReports(
        primaryId: string,
        duplicateId: string,
        mergedBy: string,
    ): Promise<FieldReport> {
        const primary = await this.reportRepo.findOne({ where: { id: primaryId } });
        const duplicate = await this.reportRepo.findOne({ where: { id: duplicateId } });

        if (!primary || !duplicate) {
            throw new Error('Report not found');
        }

        // 更新主案件的 metadata 記錄合併資訊
        primary.metadata = {
            ...primary.metadata,
            mergedFrom: [
                ...(primary.metadata?.mergedFrom || []),
                {
                    reportId: duplicateId,
                    reporterName: duplicate.reporterName,
                    message: duplicate.message,
                    mergedAt: new Date().toISOString(),
                    mergedBy,
                },
            ],
        };

        // 如果重複案件嚴重度更高，提升主案件嚴重度
        if (duplicate.severity > primary.severity) {
            primary.severity = duplicate.severity;
        }

        // 軟刪除重複案件
        duplicate.deletedAt = new Date();
        duplicate.metadata = {
            ...duplicate.metadata,
            mergedInto: primaryId,
            mergedAt: new Date().toISOString(),
            mergedBy,
        };

        await this.reportRepo.save([primary, duplicate]);

        this.logger.log(`Merged report ${duplicateId} into ${primaryId}`);

        return primary;
    }

    /**
     * 取得案件的所有關聯案件 (雙向)
     */
    async getRelatedReports(reportId: string): Promise<{
        mergedFrom: string[];
        mergedInto: string | null;
    }> {
        const report = await this.reportRepo.findOne({ where: { id: reportId } });

        if (!report) {
            return { mergedFrom: [], mergedInto: null };
        }

        return {
            mergedFrom: (report.metadata?.mergedFrom || []).map((m: any) => m.reportId),
            mergedInto: report.metadata?.mergedInto || null,
        };
    }
}
