import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities';

export interface CreateAuditLogDto {
    actorUserId: string;
    actorName?: string;
    action: string;
    entityType: string;
    entityId: string;
    missionSessionId?: string;
    beforeSnapshot?: Record<string, any>;
    afterSnapshot?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
}

@Injectable()
export class AuditService {
    constructor(
        @InjectRepository(AuditLog)
        private auditRepo: Repository<AuditLog>,
    ) { }

    async log(dto: CreateAuditLogDto): Promise<AuditLog> {
        const entry = this.auditRepo.create(dto);
        return this.auditRepo.save(entry);
    }

    async findByEntity(entityType: string, entityId: string): Promise<AuditLog[]> {
        return this.auditRepo.find({
            where: { entityType, entityId },
            order: { createdAt: 'DESC' },
        });
    }

    async findBySession(missionSessionId: string, limit = 100): Promise<AuditLog[]> {
        return this.auditRepo.find({
            where: { missionSessionId },
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }
}
