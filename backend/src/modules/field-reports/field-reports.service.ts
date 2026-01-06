import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FieldReport } from './entities';
import { CreateFieldReportDto, UpdateFieldReportDto, FieldReportQueryDto } from './dto';
import { AuditService } from './audit.service';
import { FieldReportsGateway } from './field-reports.gateway';

interface AuthUser {
    uid: string;
    displayName?: string;
}

@Injectable()
export class FieldReportsService {
    constructor(
        @InjectRepository(FieldReport)
        private reportRepo: Repository<FieldReport>,
        private auditService: AuditService,
        private gateway: FieldReportsGateway,
    ) { }

    async create(missionSessionId: string, dto: CreateFieldReportDto, user: AuthUser): Promise<FieldReport> {
        // Use query builder for PostGIS geometry insertion
        const result = await this.reportRepo
            .createQueryBuilder()
            .insert()
            .into(FieldReport)
            .values({
                missionSessionId,
                reporterUserId: user.uid,
                reporterName: user.displayName || 'Unknown',
                type: dto.type as any,
                category: dto.category,
                severity: dto.severity,
                confidence: dto.confidence ?? 50,
                message: dto.message,
                geom: () => `ST_SetSRID(ST_Point(${dto.longitude}, ${dto.latitude}), 4326)`,
                accuracyM: dto.accuracyM,
                occurredAt: dto.occurredAt ? new Date(dto.occurredAt) : new Date(),
                metadata: dto.metadata ?? {},
            })
            .returning('*')
            .execute();

        const saved = result.generatedMaps[0] as FieldReport;

        await this.auditService.log({
            actorUserId: user.uid,
            actorName: user.displayName,
            action: 'field_report:create',
            entityType: 'field_report',
            entityId: saved.id,
            missionSessionId,
            afterSnapshot: { ...saved },
        });

        // Broadcast to mission room
        this.gateway.emitReportCreated(missionSessionId, saved);

        return saved;
    }

    async findBySession(missionSessionId: string, query: FieldReportQueryDto): Promise<{ data: FieldReport[]; cursor: string; hasMore: boolean }> {
        const qb = this.reportRepo.createQueryBuilder('r')
            .where('r.mission_session_id = :missionSessionId', { missionSessionId })
            .andWhere('r.deleted_at IS NULL');

        if (query.since) {
            qb.andWhere('r.updated_at > :since', { since: new Date(query.since) });
        }

        if (query.bbox) {
            const [minLng, minLat, maxLng, maxLat] = query.bbox.split(',').map(Number);
            qb.andWhere(`ST_Intersects(r.geom, ST_MakeEnvelope(:minLng, :minLat, :maxLng, :maxLat, 4326))`, {
                minLng, minLat, maxLng, maxLat,
            });
        }

        if (query.type) {
            const types = query.type.split(',');
            qb.andWhere('r.type IN (:...types)', { types });
        }

        if (query.severity) {
            const severities = query.severity.split(',').map(Number);
            qb.andWhere('r.severity IN (:...severities)', { severities });
        }

        if (query.status) {
            const statuses = query.status.split(',');
            qb.andWhere('r.status IN (:...statuses)', { statuses });
        }

        const limit = query.limit ?? 100;
        qb.orderBy('r.updated_at', 'ASC').take(limit + 1);

        const results = await qb.getMany();
        const hasMore = results.length > limit;
        const data = hasMore ? results.slice(0, limit) : results;
        const cursor = data.length > 0 ? data[data.length - 1].updatedAt.toISOString() : '';

        return { data, cursor, hasMore };
    }

    async update(reportId: string, dto: UpdateFieldReportDto, version: number, user: AuthUser): Promise<FieldReport> {
        const report = await this.reportRepo.findOne({ where: { id: reportId } });
        if (!report) throw new NotFoundException('Report not found');
        if (report.version !== version) {
            throw new ConflictException({ error: 'VERSION_CONFLICT', currentVersion: report.version });
        }

        const before = { ...report };
        Object.assign(report, dto, {
            version: report.version + 1,
            updatedBy: user.uid,
        });

        const saved = await this.reportRepo.save(report);

        await this.auditService.log({
            actorUserId: user.uid,
            actorName: user.displayName,
            action: 'field_report:update',
            entityType: 'field_report',
            entityId: saved.id,
            missionSessionId: saved.missionSessionId,
            beforeSnapshot: before,
            afterSnapshot: { ...saved },
        });

        // Broadcast to mission room
        this.gateway.emitReportUpdated(saved.missionSessionId, saved.id, dto, saved.version);

        return saved;
    }

    async findById(reportId: string): Promise<FieldReport | null> {
        return this.reportRepo.findOne({ where: { id: reportId, deletedAt: undefined as any } });
    }

    async softDelete(reportId: string, user: AuthUser): Promise<void> {
        const report = await this.reportRepo.findOne({ where: { id: reportId } });
        if (!report) throw new NotFoundException('Report not found');

        report.deletedAt = new Date();
        report.updatedBy = user.uid;
        await this.reportRepo.save(report);

        await this.auditService.log({
            actorUserId: user.uid,
            action: 'field_report:delete',
            entityType: 'field_report',
            entityId: reportId,
            missionSessionId: report.missionSessionId,
        });
    }
}
