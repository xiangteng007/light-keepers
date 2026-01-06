/**
 * SITREP 服務 (Situation Report Service)
 * 生成、管理與核准情勢報告
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { SITREP, SITREPStatus, KeyEvent, ResourceStatus } from './entities/sitrep.entity';
import { DecisionLog, DecisionType } from './entities/decision-log.entity';
import { FieldReport } from '../field-reports/entities/field-report.entity';

interface CreateSITREPDto {
    missionSessionId: string;
    operationalPeriodId?: string;
    periodStart: Date;
    periodEnd: Date;
    summary?: string;
    createdBy: string;
}

interface LogDecisionDto {
    missionSessionId: string;
    decisionType: DecisionType;
    description: string;
    rationale?: string;
    decidedBy: string;
    decidedByName?: string;
    relatedEntityType?: string;
    relatedEntityId?: string;
    aiAssisted?: boolean;
    aiJobId?: string;
    aiConfidence?: number;
    beforeState?: Record<string, any>;
    afterState?: Record<string, any>;
}

@Injectable()
export class SITREPService {
    constructor(
        @InjectRepository(SITREP)
        private sitrepRepo: Repository<SITREP>,
        @InjectRepository(DecisionLog)
        private decisionRepo: Repository<DecisionLog>,
        @InjectRepository(FieldReport)
        private reportRepo: Repository<FieldReport>,
    ) { }

    // ==================== SITREP ====================

    /**
     * 建立 SITREP
     */
    async createSITREP(dto: CreateSITREPDto): Promise<SITREP> {
        // 取得下一個序號
        const maxSeq = await this.sitrepRepo
            .createQueryBuilder('s')
            .where('s.mission_session_id = :sessionId', { sessionId: dto.missionSessionId })
            .select('MAX(s.sequence)', 'max')
            .getRawOne();

        const sequence = (maxSeq?.max || 0) + 1;

        const sitrep = this.sitrepRepo.create({
            ...dto,
            sequence,
            summary: dto.summary || '',
            status: SITREPStatus.DRAFT,
        });

        return this.sitrepRepo.save(sitrep);
    }

    /**
     * AI 自動生成 SITREP 草稿
     */
    async generateSITREPDraft(
        missionSessionId: string,
        periodStart: Date,
        periodEnd: Date,
        createdBy: string,
    ): Promise<SITREP> {
        // 取得時間範圍內的回報
        const reports = await this.reportRepo.find({
            where: {
                missionSessionId,
                createdAt: Between(periodStart, periodEnd),
            },
            order: { createdAt: 'ASC' },
        });

        // 取得時間範圍內的決策
        const decisions = await this.decisionRepo.find({
            where: {
                missionSessionId,
                createdAt: Between(periodStart, periodEnd),
            },
            order: { timestamp: 'ASC' },
        });

        // 彙整重要事件
        const keyEvents: KeyEvent[] = [
            ...reports
                .filter(r => r.severity >= 3)
                .map(r => ({
                    time: r.createdAt.toISOString(),
                    description: r.message || `${r.type} 事件`,
                    severity: r.severity,
                    location: r.metadata?.address,
                })),
            ...decisions.map(d => ({
                time: d.timestamp.toISOString(),
                description: `[決策] ${d.description}`,
            })),
        ].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        // 統計
        const stats = {
            totalReports: reports.length,
            byType: reports.reduce((acc, r) => {
                acc[r.type] = (acc[r.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            bySeverity: reports.reduce((acc, r) => {
                acc[r.severity] = (acc[r.severity] || 0) + 1;
                return acc;
            }, {} as Record<number, number>),
        };

        // 生成摘要
        const summary = this.generateSummary(stats, decisions.length);

        // 建立 SITREP
        const sitrep = await this.createSITREP({
            missionSessionId,
            periodStart,
            periodEnd,
            summary,
            createdBy,
        });

        sitrep.keyEvents = keyEvents.slice(0, 20); // 最多 20 筆
        sitrep.aiGenerated = true;

        return this.sitrepRepo.save(sitrep);
    }

    private generateSummary(stats: any, decisionCount: number): string {
        const lines = [
            `報告期間共收到 ${stats.totalReports} 筆現場回報。`,
        ];

        if (stats.byType) {
            const types = Object.entries(stats.byType)
                .map(([type, count]) => `${type}: ${count}`)
                .join('、');
            lines.push(`回報類型分布：${types}。`);
        }

        if (stats.bySeverity[4] > 0 || stats.bySeverity[3] > 0) {
            lines.push(`其中嚴重度 4 級有 ${stats.bySeverity[4] || 0} 件，3 級有 ${stats.bySeverity[3] || 0} 件。`);
        }

        if (decisionCount > 0) {
            lines.push(`期間共做出 ${decisionCount} 項重要決策。`);
        }

        return lines.join('\n');
    }

    /**
     * 更新 SITREP
     */
    async updateSITREP(
        sitrepId: string,
        updates: Partial<Pick<SITREP, 'summary' | 'keyEvents' | 'resourceStatus' | 'casualties' | 'nextActions' | 'requests'>>
    ): Promise<SITREP> {
        const sitrep = await this.sitrepRepo.findOne({ where: { id: sitrepId } });
        if (!sitrep) {
            throw new NotFoundException('SITREP not found');
        }

        Object.assign(sitrep, updates);
        sitrep.version++;

        return this.sitrepRepo.save(sitrep);
    }

    /**
     * 核准 SITREP
     */
    async approveSITREP(sitrepId: string, approvedBy: string): Promise<SITREP> {
        const sitrep = await this.sitrepRepo.findOne({ where: { id: sitrepId } });
        if (!sitrep) {
            throw new NotFoundException('SITREP not found');
        }

        sitrep.status = SITREPStatus.APPROVED;
        sitrep.approvedBy = approvedBy;
        sitrep.approvedAt = new Date();

        return this.sitrepRepo.save(sitrep);
    }

    /**
     * 取得任務場次的所有 SITREP
     */
    async getSITREPs(missionSessionId: string): Promise<SITREP[]> {
        return this.sitrepRepo.find({
            where: { missionSessionId },
            order: { sequence: 'DESC' },
        });
    }

    // ==================== Decision Log ====================

    /**
     * 記錄決策
     */
    async logDecision(dto: LogDecisionDto): Promise<DecisionLog> {
        const decision = this.decisionRepo.create(dto);
        return this.decisionRepo.save(decision);
    }

    /**
     * 取得任務場次的所有決策
     */
    async getDecisions(missionSessionId: string, options?: {
        decisionType?: DecisionType;
        limit?: number;
    }): Promise<DecisionLog[]> {
        const query = this.decisionRepo.createQueryBuilder('d')
            .where('d.mission_session_id = :sessionId', { sessionId: missionSessionId });

        if (options?.decisionType) {
            query.andWhere('d.decision_type = :type', { type: options.decisionType });
        }

        query.orderBy('d.timestamp', 'DESC');

        if (options?.limit) {
            query.take(options.limit);
        }

        return query.getMany();
    }

    /**
     * 取得特定實體的相關決策
     */
    async getDecisionsForEntity(entityType: string, entityId: string): Promise<DecisionLog[]> {
        return this.decisionRepo.find({
            where: { relatedEntityType: entityType, relatedEntityId: entityId },
            order: { timestamp: 'DESC' },
        });
    }
}
