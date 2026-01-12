import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { IntakeReport, IntakeReportStatus, IntakeReportType } from './entities/intake-report.entity';
import { MissionSession, IncidentSource, IncidentType, MissionStatus } from '../mission-sessions/entities/mission-session.entity';
import { CreateIntakeDto, IntakeResponseDto } from './dto/intake.dto';

@Injectable()
export class IntakeService {
    private readonly logger = new Logger(IntakeService.name);

    constructor(
        @InjectRepository(IntakeReport)
        private readonly intakeRepo: Repository<IntakeReport>,
        @InjectRepository(MissionSession)
        private readonly incidentRepo: Repository<MissionSession>,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * 建立通報（統一入口）
     * 如果沒有關聯 incidentId，會自動建立新 Incident
     */
    async createIntake(
        dto: CreateIntakeDto,
        reporterId?: string,
    ): Promise<IntakeResponseDto> {
        let incident: MissionSession;
        let isNewIncident = false;

        // 如果有指定 incidentId，關聯到現有 Incident
        if (dto.incidentId) {
            const existingIncident = await this.incidentRepo.findOne({
                where: { id: dto.incidentId },
            });
            if (!existingIncident) {
                throw new NotFoundException(`Incident ${dto.incidentId} not found`);
            }
            incident = existingIncident;
        } else {
            // 自動建立新 Incident
            incident = this.incidentRepo.create({
                title: dto.title,
                description: dto.description,
                type: IncidentType.INCIDENT,
                source: IncidentSource.INTAKE,
                status: MissionStatus.PREPARING,
                location: dto.geo,
                adminCode: dto.adminCode,
                metadata: {
                    intakeType: dto.sourceType,
                    createdVia: 'intake',
                },
            });
            incident = await this.incidentRepo.save(incident);
            isNewIncident = true;

            this.logger.log(`Created new Incident: ${incident.id}`);
            this.eventEmitter.emit('incidents.created', {
                incidentId: incident.id,
                source: 'intake',
            });
        }

        // 建立 IntakeReport
        const intakeReport = this.intakeRepo.create({
            sourceType: dto.sourceType,
            status: IntakeReportStatus.RECEIVED,
            title: dto.title,
            description: dto.description,
            payload: dto.payload,
            media: dto.media,
            geo: dto.geo,
            adminCode: dto.adminCode,
            incidentId: incident.id,
            reporterId,
            reporterName: dto.reporterName,
            reporterPhone: dto.reporterPhone,
            notes: dto.notes,
        });

        const savedReport = await this.intakeRepo.save(intakeReport);
        this.logger.log(`Created IntakeReport: ${savedReport.id} -> Incident: ${incident.id}`);

        this.eventEmitter.emit('intake.submitted', {
            intakeId: savedReport.id,
            incidentId: incident.id,
            sourceType: dto.sourceType,
        });

        return {
            intakeId: savedReport.id,
            incidentId: incident.id,
            isNewIncident,
        };
    }

    /**
     * 取得所有通報
     */
    async findAll(options?: {
        status?: IntakeReportStatus;
        sourceType?: IntakeReportType;
        limit?: number;
        offset?: number;
    }): Promise<IntakeReport[]> {
        const qb = this.intakeRepo.createQueryBuilder('intake');

        if (options?.status) {
            qb.andWhere('intake.status = :status', { status: options.status });
        }
        if (options?.sourceType) {
            qb.andWhere('intake.sourceType = :sourceType', { sourceType: options.sourceType });
        }

        qb.orderBy('intake.createdAt', 'DESC');
        qb.take(options?.limit || 50);
        qb.skip(options?.offset || 0);

        return qb.getMany();
    }

    /**
     * 取得單一通報
     */
    async findOne(id: string): Promise<IntakeReport> {
        const report = await this.intakeRepo.findOne({
            where: { id },
            relations: ['incident'],
        });
        if (!report) {
            throw new NotFoundException(`IntakeReport ${id} not found`);
        }
        return report;
    }

    /**
     * 取得 Incident 關聯的所有通報
     */
    async findByIncident(incidentId: string): Promise<IntakeReport[]> {
        return this.intakeRepo.find({
            where: { incidentId },
            order: { createdAt: 'DESC' },
        });
    }

    /**
     * 更新通報狀態
     */
    async updateStatus(id: string, status: IntakeReportStatus): Promise<IntakeReport> {
        const report = await this.findOne(id);
        report.status = status;
        return this.intakeRepo.save(report);
    }
}
