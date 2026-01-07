/**
 * AAR 服務 (After Action Review Service)
 * 事後復盤：時間軸生成、報表匯出、經驗教訓管理
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    AfterActionReview,
    AARStatus,
    TimelineEvent,
    DecisionReview,
    LessonLearned,
} from './entities/aar.entity';
import { MissionSession } from './entities/mission-session.entity';
import { DecisionLog } from './entities/decision-log.entity';
import { SITREP } from './entities/sitrep.entity';
import { FieldReport } from '../field-reports/entities/field-report.entity';
import { Task } from '../tasks/entities/task.entity';
import { AuditLog } from '../field-reports/entities/audit-log.entity';

@Injectable()
export class AARService {
    constructor(
        @InjectRepository(AfterActionReview)
        private aarRepo: Repository<AfterActionReview>,
        @InjectRepository(MissionSession)
        private sessionRepo: Repository<MissionSession>,
        @InjectRepository(DecisionLog)
        private decisionRepo: Repository<DecisionLog>,
        @InjectRepository(FieldReport)
        private reportRepo: Repository<FieldReport>,
        @InjectRepository(Task)
        private taskRepo: Repository<Task>,
        @InjectRepository(AuditLog)
        private auditRepo: Repository<AuditLog>,
    ) { }

    /**
     * 建立 AAR
     */
    async createAAR(missionSessionId: string, createdBy: string): Promise<AfterActionReview> {
        const session = await this.sessionRepo.findOne({ where: { id: missionSessionId } });
        if (!session) {
            throw new NotFoundException('Mission session not found');
        }

        const aar = this.aarRepo.create({
            missionSessionId,
            title: `${session.title} - 事後復盤報告`,
            createdBy,
        });

        return this.aarRepo.save(aar);
    }

    /**
     * 自動生成時間軸
     */
    async generateTimeline(missionSessionId: string): Promise<TimelineEvent[]> {
        const timeline: TimelineEvent[] = [];

        // 取得回報
        const reports = await this.reportRepo.find({
            where: { missionSessionId },
            order: { createdAt: 'ASC' },
        });

        for (const report of reports) {
            timeline.push({
                timestamp: report.createdAt.toISOString(),
                eventType: report.type === 'sos' ? 'sos' : 'report',
                title: `${report.type} 回報`,
                description: report.message || '無訊息',
                severity: report.severity,
                actorName: report.reporterName,
                relatedEntityType: 'field_report',
                relatedEntityId: report.id,
            });
        }

        // 取得決策
        const decisions = await this.decisionRepo.find({
            where: { missionSessionId },
            order: { timestamp: 'ASC' },
        });

        for (const decision of decisions) {
            timeline.push({
                timestamp: decision.timestamp.toISOString(),
                eventType: 'decision',
                title: `[決策] ${decision.decisionType}`,
                description: decision.description,
                actorName: decision.decidedByName || decision.decidedBy,
                relatedEntityType: 'decision',
                relatedEntityId: decision.id,
            });
        }

        // 取得任務狀態變更 (從 audit log)
        const taskAudits = await this.auditRepo.find({
            where: { missionSessionId, entityType: 'task' },
            order: { createdAt: 'ASC' },
        });

        for (const audit of taskAudits) {
            if (audit.action.includes('status') || audit.action.includes('complete')) {
                timeline.push({
                    timestamp: audit.createdAt.toISOString(),
                    eventType: 'status_change',
                    title: `任務狀態變更`,
                    description: audit.action,
                    actorName: audit.actorName || audit.actorUserId,
                    relatedEntityType: 'task',
                    relatedEntityId: audit.entityId,
                });
            }
        }

        // 排序
        timeline.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        return timeline;
    }

    /**
     * 自動生成統計數據
     */
    async generateStatistics(missionSessionId: string): Promise<Record<string, any>> {
        const session = await this.sessionRepo.findOne({ where: { id: missionSessionId } });

        const [totalReports, totalTasks, completedTasks, sosCount] = await Promise.all([
            this.reportRepo.count({ where: { missionSessionId } as any }),
            this.taskRepo.count({ where: { sessionId: missionSessionId } as any }),
            this.taskRepo.count({ where: { sessionId: missionSessionId, status: 'completed' } as any }),
            this.reportRepo.count({ where: { missionSessionId, type: 'sos' } as any }),
        ]);

        const duration = session?.startedAt && session?.endedAt
            ? Math.round((session.endedAt.getTime() - session.startedAt.getTime()) / 60000)
            : null;

        return {
            duration,
            totalReports,
            totalTasks,
            completedTasks,
            taskCompletionRate: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
            sosCount,
        };
    }

    /**
     * 更新 AAR
     */
    async updateAAR(
        aarId: string,
        updates: Partial<Pick<AfterActionReview,
            'timeline' | 'statistics' | 'decisionsReview' | 'lessonsLearned' |
            'recommendations' | 'executiveSummary' | 'successes' | 'challenges'
        >>
    ): Promise<AfterActionReview> {
        const aar = await this.aarRepo.findOne({ where: { id: aarId } });
        if (!aar) {
            throw new NotFoundException('AAR not found');
        }

        Object.assign(aar, updates);
        aar.version++;

        return this.aarRepo.save(aar);
    }

    /**
     * 完整生成 AAR 草稿 (AI-assisted)
     */
    async generateAARDraft(missionSessionId: string, createdBy: string): Promise<AfterActionReview> {
        // 建立 AAR
        const aar = await this.createAAR(missionSessionId, createdBy);

        // 生成時間軸
        const timeline = await this.generateTimeline(missionSessionId);

        // 生成統計
        const statistics = await this.generateStatistics(missionSessionId);

        // 取得決策並轉換為 review 格式
        const decisions = await this.decisionRepo.find({
            where: { missionSessionId },
            order: { timestamp: 'ASC' },
        });

        const decisionsReview: DecisionReview[] = decisions.map(d => ({
            decisionId: d.id,
            timestamp: d.timestamp.toISOString(),
            description: d.description,
            rationale: d.rationale || '',
            outcome: 'pending',
        }));

        // 更新 AAR
        aar.timeline = timeline;
        aar.statistics = statistics;
        aar.decisionsReview = decisionsReview;
        aar.aiGenerated = true;

        return this.aarRepo.save(aar);
    }

    /**
     * 定稿 AAR
     */
    async finalizeAAR(aarId: string, finalizedBy: string): Promise<AfterActionReview> {
        const aar = await this.aarRepo.findOne({ where: { id: aarId } });
        if (!aar) {
            throw new NotFoundException('AAR not found');
        }

        aar.status = AARStatus.FINALIZED;
        aar.finalizedBy = finalizedBy;
        aar.finalizedAt = new Date();

        return this.aarRepo.save(aar);
    }

    /**
     * 取得 AAR
     */
    async getAAR(missionSessionId: string): Promise<AfterActionReview | null> {
        return this.aarRepo.findOne({
            where: { missionSessionId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * 匯出 AAR (JSON 格式，可進一步轉 PDF)
     */
    async exportAAR(aarId: string): Promise<{
        aar: AfterActionReview;
        session: MissionSession | null;
        exportedAt: Date;
    }> {
        const aar = await this.aarRepo.findOne({ where: { id: aarId } });
        if (!aar) {
            throw new NotFoundException('AAR not found');
        }

        const session = await this.sessionRepo.findOne({ where: { id: aar.missionSessionId } });

        return {
            aar,
            session,
            exportedAt: new Date(),
        };
    }
}
