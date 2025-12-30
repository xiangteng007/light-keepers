import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SensitiveReadLog, AuditTargetType } from './sensitive-read-log.entity';
import { LabelPrintLog, LabelAction, LabelTargetType } from './label-print-log.entity';

/**
 * 稽核日誌服務
 * 負責寫入敏感資料讀取日誌與貼紙列印日誌
 */
@Injectable()
export class AuditLogService {
    constructor(
        @InjectRepository(SensitiveReadLog)
        private readonly sensitiveReadLogRepo: Repository<SensitiveReadLog>,

        @InjectRepository(LabelPrintLog)
        private readonly labelPrintLogRepo: Repository<LabelPrintLog>,
    ) { }

    /**
     * 記錄敏感資料讀取
     * @param data - 稽核資料
     * @returns 稽核日誌 ID
     */
    async logSensitiveRead(data: {
        actorUid: string;
        actorRole: string;
        targetType: AuditTargetType;
        targetId: string;
        fieldsAccessed: string[];
        uiContext: string;
        reasonCode?: string;
        reasonText?: string;
        deviceInfo?: Record<string, any>;
        ip?: string;
        result: 'success' | 'denied';
    }): Promise<string> {
        const log = this.sensitiveReadLogRepo.create(data);
        const saved = await this.sensitiveReadLogRepo.save(log);
        return saved.id;
    }

    /**
     * 記錄貼紙列印操作
     * @param data - 列印資料
     * @returns 列印批次 ID
     */
    async logLabelPrint(data: {
        actorUid: string;
        actorRole: string;
        action: LabelAction;
        targetType: LabelTargetType;
        targetIds: string[];
        controlLevel: string;
        templateId: string;
        labelCount: number;
        relatedTxId?: string;
        revokeReason?: string;
    }): Promise<string> {
        const log = this.labelPrintLogRepo.create(data);
        const saved = await this.labelPrintLogRepo.save(log);
        return saved.id;
    }

    /**
     * 查詢敏感資料讀取日誌（幹部專用）
     * @param filters - 篩選條件
     * @returns 日誌列表
     */
    async querySensitiveReadLogs(filters: {
        startDate?: Date;
        endDate?: Date;
        actorUid?: string;
        targetType?: AuditTargetType;
        result?: 'success' | 'denied';
        limit?: number;
        offset?: number;
    }): Promise<{ logs: SensitiveReadLog[]; total: number }> {
        const query = this.sensitiveReadLogRepo.createQueryBuilder('log');

        if (filters.startDate) {
            query.andWhere('log.createdAt >= :startDate', { startDate: filters.startDate });
        }
        if (filters.endDate) {
            query.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
        }
        if (filters.actorUid) {
            query.andWhere('log.actorUid = :actorUid', { actorUid: filters.actorUid });
        }
        if (filters.targetType) {
            query.andWhere('log.targetType = :targetType', { targetType: filters.targetType });
        }
        if (filters.result) {
            query.andWhere('log.result = :result', { result: filters.result });
        }

        query.orderBy('log.createdAt', 'DESC');

        if (filters.limit) {
            query.take(filters.limit);
        }
        if (filters.offset) {
            query.skip(filters.offset);
        }

        const [logs, total] = await query.getManyAndCount();
        return { logs, total };
    }

    /**
     * 查詢特定目標的讀取日誌（單據「查閱紀錄」Tab）
     * @param targetType - 目標類型
     * @param targetId - 目標 ID
     * @returns 日誌列表
     */
    async getReadLogsByTarget(
        targetType: AuditTargetType,
        targetId: string,
    ): Promise<SensitiveReadLog[]> {
        return this.sensitiveReadLogRepo.find({
            where: { targetType, targetId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * 查詢貼紙列印日誌
     * @param filters - 篩選條件
     * @returns 列印日誌列表
     */
    async queryLabelPrintLogs(filters: {
        startDate?: Date;
        endDate?: Date;
        actorUid?: string;
        action?: LabelAction;
        targetType?: LabelTargetType;
        limit?: number;
        offset?: number;
    }): Promise<{ logs: LabelPrintLog[]; total: number }> {
        const query = this.labelPrintLogRepo.createQueryBuilder('log');

        if (filters.startDate) {
            query.andWhere('log.createdAt >= :startDate', { startDate: filters.startDate });
        }
        if (filters.endDate) {
            query.andWhere('log.createdAt <= :endDate', { endDate: filters.endDate });
        }
        if (filters.actorUid) {
            query.andWhere('log.actorUid = :actorUid', { actorUid: filters.actorUid });
        }
        if (filters.action) {
            query.andWhere('log.action = :action', { action: filters.action });
        }
        if (filters.targetType) {
            query.andWhere('log.targetType = :targetType', { targetType: filters.targetType });
        }

        query.orderBy('log.createdAt', 'DESC');

        if (filters.limit) {
            query.take(filters.limit);
        }
        if (filters.offset) {
            query.skip(filters.offset);
        }

        const [logs, total] = await query.getManyAndCount();
        return { logs, total };
    }
}
