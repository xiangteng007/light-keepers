import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SosSignal, FieldReport } from './entities';
import { CreateSosDto, AckSosDto, ResolveSosDto } from './dto';
import { AuditService } from './audit.service';

interface AuthUser {
    uid: string;
    displayName?: string;
}

@Injectable()
export class SosService {
    constructor(
        @InjectRepository(SosSignal)
        private sosRepo: Repository<SosSignal>,
        @InjectRepository(FieldReport)
        private reportRepo: Repository<FieldReport>,
        private auditService: AuditService,
    ) { }

    async trigger(missionSessionId: string, dto: CreateSosDto, user: AuthUser): Promise<{ sosId: string; reportId: string; status: string }> {
        // Create auto-report for SOS using query builder for PostGIS geometry
        const reportResult = await this.reportRepo
            .createQueryBuilder()
            .insert()
            .into(FieldReport)
            .values({
                missionSessionId,
                reporterUserId: user.uid,
                reporterName: user.displayName || 'Unknown',
                type: 'sos' as any,
                severity: 4,
                message: dto.message || 'SOS SIGNAL',
                geom: () => `ST_SetSRID(ST_Point(${dto.longitude}, ${dto.latitude}), 4326)`,
                accuracyM: dto.accuracyM,
                status: 'new' as any,
            })
            .returning('id')
            .execute();

        const reportId = reportResult.generatedMaps[0].id;

        // Create SOS signal using query builder for PostGIS geometry
        const sosResult = await this.sosRepo
            .createQueryBuilder()
            .insert()
            .into(SosSignal)
            .values({
                missionSessionId,
                reportId,
                userId: user.uid,
                userName: user.displayName || 'Unknown',
                triggerGeom: () => `ST_SetSRID(ST_Point(${dto.longitude}, ${dto.latitude}), 4326)`,
                triggerAccuracyM: dto.accuracyM,
                status: 'active' as any,
                ttlExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            })
            .returning('id, status')
            .execute();

        const sosId = sosResult.generatedMaps[0].id;
        const status = sosResult.generatedMaps[0].status;

        await this.auditService.log({
            actorUserId: user.uid,
            action: 'sos:trigger',
            entityType: 'sos_signal',
            entityId: sosId,
            missionSessionId,
        });

        return { sosId, reportId, status };
    }

    async ack(sosId: string, dto: AckSosDto, user: AuthUser): Promise<SosSignal> {
        const sos = await this.sosRepo.findOne({ where: { id: sosId } });
        if (!sos) throw new NotFoundException('SOS signal not found');
        if (sos.status !== 'active') {
            throw new ConflictException('SOS already acknowledged or resolved');
        }

        sos.status = 'acked';
        sos.ackedBy = user.uid;
        sos.ackedAt = new Date();

        const saved = await this.sosRepo.save(sos);

        await this.auditService.log({
            actorUserId: user.uid,
            action: 'sos:ack',
            entityType: 'sos_signal',
            entityId: sosId,
            missionSessionId: sos.missionSessionId,
        });

        return saved;
    }

    async resolve(sosId: string, dto: ResolveSosDto, user: AuthUser): Promise<SosSignal> {
        const sos = await this.sosRepo.findOne({ where: { id: sosId } });
        if (!sos) throw new NotFoundException('SOS signal not found');

        sos.status = 'resolved';
        sos.resolvedBy = user.uid;
        sos.resolvedAt = new Date();
        sos.resolutionNote = dto.resolutionNote || null as any;

        const saved = await this.sosRepo.save(sos);

        await this.auditService.log({
            actorUserId: user.uid,
            action: 'sos:resolve',
            entityType: 'sos_signal',
            entityId: sosId,
            missionSessionId: sos.missionSessionId,
        });

        return saved;
    }

    async findActive(missionSessionId: string): Promise<SosSignal[]> {
        return this.sosRepo.find({
            where: { missionSessionId, status: 'active' as any },
            order: { createdAt: 'DESC' },
        });
    }
}
