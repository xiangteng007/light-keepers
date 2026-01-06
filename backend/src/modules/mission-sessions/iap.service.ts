/**
 * IAP 服務 (Incident Action Plan Service)
 * 管理作戰週期與 IAP 文件生命週期
 */

import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    OperationalPeriod,
    OperationalPeriodStatus,
    Objective,
    RiskAssessment,
    ResourceAllocation,
} from './entities/operational-period.entity';
import { IAPDocument, IAPDocumentType, IAPDocumentStatus } from './entities/iap-document.entity';
import { MissionSession } from './entities/mission-session.entity';

interface CreatePeriodDto {
    missionSessionId: string;
    name?: string;
    startTime: Date;
    endTime?: Date;
    objectives?: Objective[];
    priorities?: string[];
    commanderGuidance?: string;
    createdBy: string;
}

interface UpdatePeriodDto {
    name?: string;
    objectives?: Objective[];
    priorities?: string[];
    riskAssessment?: RiskAssessment[];
    resourceAllocation?: ResourceAllocation[];
    commanderGuidance?: string;
    endTime?: Date;
}

@Injectable()
export class IAPService {
    constructor(
        @InjectRepository(OperationalPeriod)
        private periodRepo: Repository<OperationalPeriod>,
        @InjectRepository(IAPDocument)
        private documentRepo: Repository<IAPDocument>,
        @InjectRepository(MissionSession)
        private sessionRepo: Repository<MissionSession>,
    ) { }

    // ==================== Operational Period ====================

    /**
     * 建立新的作戰週期
     */
    async createPeriod(dto: CreatePeriodDto): Promise<OperationalPeriod> {
        // 取得下一個週期編號
        const maxPeriod = await this.periodRepo
            .createQueryBuilder('op')
            .where('op.mission_session_id = :sessionId', { sessionId: dto.missionSessionId })
            .select('MAX(op.period_number)', 'max')
            .getRawOne();

        const periodNumber = (maxPeriod?.max || 0) + 1;

        const period = this.periodRepo.create({
            ...dto,
            periodNumber,
            status: OperationalPeriodStatus.DRAFT,
        });

        return this.periodRepo.save(period);
    }

    /**
     * 更新作戰週期
     */
    async updatePeriod(periodId: string, dto: UpdatePeriodDto): Promise<OperationalPeriod> {
        const period = await this.periodRepo.findOne({ where: { id: periodId } });
        if (!period) {
            throw new NotFoundException('Operational period not found');
        }

        if (period.status === OperationalPeriodStatus.CLOSED) {
            throw new BadRequestException('Cannot update a closed period');
        }

        Object.assign(period, dto);
        period.version++;

        return this.periodRepo.save(period);
    }

    /**
     * 核准作戰週期
     */
    async approvePeriod(periodId: string, approvedBy: string): Promise<OperationalPeriod> {
        const period = await this.periodRepo.findOne({ where: { id: periodId } });
        if (!period) {
            throw new NotFoundException('Operational period not found');
        }

        period.status = OperationalPeriodStatus.APPROVED;
        period.approvedBy = approvedBy;
        period.approvedAt = new Date();

        return this.periodRepo.save(period);
    }

    /**
     * 啟動作戰週期
     */
    async activatePeriod(periodId: string): Promise<OperationalPeriod> {
        const period = await this.periodRepo.findOne({ where: { id: periodId } });
        if (!period) {
            throw new NotFoundException('Operational period not found');
        }

        if (period.status !== OperationalPeriodStatus.APPROVED) {
            throw new BadRequestException('Period must be approved before activation');
        }

        // 關閉目前活躍的週期
        await this.periodRepo.update(
            { missionSessionId: period.missionSessionId, status: OperationalPeriodStatus.ACTIVE },
            { status: OperationalPeriodStatus.CLOSED, endTime: new Date() }
        );

        period.status = OperationalPeriodStatus.ACTIVE;
        period.startTime = new Date();

        return this.periodRepo.save(period);
    }

    /**
     * 關閉作戰週期
     */
    async closePeriod(periodId: string): Promise<OperationalPeriod> {
        const period = await this.periodRepo.findOne({ where: { id: periodId } });
        if (!period) {
            throw new NotFoundException('Operational period not found');
        }

        period.status = OperationalPeriodStatus.CLOSED;
        period.endTime = new Date();

        return this.periodRepo.save(period);
    }

    /**
     * 取得任務場次的所有作戰週期
     */
    async getPeriods(missionSessionId: string): Promise<OperationalPeriod[]> {
        return this.periodRepo.find({
            where: { missionSessionId },
            order: { periodNumber: 'ASC' },
        });
    }

    /**
     * 取得目前活躍的作戰週期
     */
    async getActivePeriod(missionSessionId: string): Promise<OperationalPeriod | null> {
        return this.periodRepo.findOne({
            where: { missionSessionId, status: OperationalPeriodStatus.ACTIVE },
        });
    }

    // ==================== IAP Documents ====================

    /**
     * 建立或更新 IAP 文件
     */
    async upsertDocument(
        operationalPeriodId: string,
        documentType: IAPDocumentType,
        content: Record<string, any>,
        createdBy: string,
    ): Promise<IAPDocument> {
        let doc = await this.documentRepo.findOne({
            where: { operationalPeriodId, documentType },
        });

        if (doc) {
            doc.content = content;
            doc.version++;
            doc.updatedBy = createdBy;
            doc.status = IAPDocumentStatus.DRAFT;
        } else {
            doc = this.documentRepo.create({
                operationalPeriodId,
                documentType,
                content,
                createdBy,
            });
        }

        return this.documentRepo.save(doc);
    }

    /**
     * 核准 IAP 文件
     */
    async approveDocument(documentId: string, approvedBy: string): Promise<IAPDocument> {
        const doc = await this.documentRepo.findOne({ where: { id: documentId } });
        if (!doc) {
            throw new NotFoundException('IAP document not found');
        }

        doc.status = IAPDocumentStatus.APPROVED;
        doc.approvedBy = approvedBy;
        doc.approvedAt = new Date();

        return this.documentRepo.save(doc);
    }

    /**
     * 取得作戰週期的所有 IAP 文件
     */
    async getDocuments(operationalPeriodId: string): Promise<IAPDocument[]> {
        return this.documentRepo.find({
            where: { operationalPeriodId },
            order: { documentType: 'ASC' },
        });
    }

    /**
     * 取得特定類型的 IAP 文件
     */
    async getDocument(operationalPeriodId: string, documentType: IAPDocumentType): Promise<IAPDocument | null> {
        return this.documentRepo.findOne({
            where: { operationalPeriodId, documentType },
        });
    }

    // ==================== Export ====================

    /**
     * 匯出 IAP (組合所有已核准文件)
     */
    async exportIAP(operationalPeriodId: string): Promise<{
        period: OperationalPeriod;
        documents: IAPDocument[];
        exportedAt: Date;
    }> {
        const period = await this.periodRepo.findOne({ where: { id: operationalPeriodId } });
        if (!period) {
            throw new NotFoundException('Operational period not found');
        }

        const documents = await this.documentRepo.find({
            where: { operationalPeriodId, status: IAPDocumentStatus.APPROVED },
        });

        return {
            period,
            documents,
            exportedAt: new Date(),
        };
    }
}
