import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AccessLog, AccessAction } from './access-log.entity';

@Injectable()
export class AccessLogService {
    constructor(
        @InjectRepository(AccessLog)
        private readonly accessLogRepository: Repository<AccessLog>,
    ) { }

    /**
     * 記錄敏感資料存取
     */
    async log(params: {
        userId?: string;
        userName?: string;
        userRole?: string;
        action: AccessAction;
        targetTable: string;
        targetId?: string;
        sensitiveFieldsAccessed?: string[];
        ipAddress?: string;
        userAgent?: string;
        requestPath?: string;
        requestMethod?: string;
        success?: boolean;
        errorMessage?: string;
    }): Promise<AccessLog> {
        const log = this.accessLogRepository.create({
            ...params,
            success: params.success ?? true,
        });
        return this.accessLogRepository.save(log);
    }

    /**
     * 查詢存取日誌
     */
    async findByTarget(targetTable: string, targetId: string, limit = 50): Promise<AccessLog[]> {
        return this.accessLogRepository.find({
            where: { targetTable, targetId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * 查詢使用者的存取紀錄
     */
    async findByUser(userId: string, limit = 100): Promise<AccessLog[]> {
        return this.accessLogRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    /**
     * 匯出存取日誌 (管理員功能)
     */
    async exportLogs(startDate: Date, endDate: Date): Promise<AccessLog[]> {
        return this.accessLogRepository
            .createQueryBuilder('log')
            .where('log.createdAt >= :startDate', { startDate })
            .andWhere('log.createdAt <= :endDate', { endDate })
            .orderBy('log.createdAt', 'DESC')
            .getMany();
    }
}
