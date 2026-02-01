import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IcsForm, IcsFormType, IcsFormStatus } from './entities/ics-form.entity';
import { CreateIcsFormDto, UpdateIcsFormDto, QueryIcsFormsDto } from './dto/ics-form.dto';

@Injectable()
export class IcsFormsService {
    private readonly logger = new Logger(IcsFormsService.name);

    constructor(
        @InjectRepository(IcsForm)
        private readonly icsFormRepository: Repository<IcsForm>,
    ) {}

    /**
     * Create a new ICS form
     */
    async create(
        dto: CreateIcsFormDto,
        preparedBy: string,
        preparedByName: string,
    ): Promise<IcsForm> {
        const form = this.icsFormRepository.create({
            ...dto,
            preparedBy,
            preparedByName,
            operationalPeriodFrom: dto.operationalPeriodFrom
                ? new Date(dto.operationalPeriodFrom)
                : undefined,
            operationalPeriodTo: dto.operationalPeriodTo
                ? new Date(dto.operationalPeriodTo)
                : undefined,
            formData: dto.formData || {},
            attachments: dto.attachments || [],
            status: IcsFormStatus.DRAFT,
            version: 1,
        });

        const saved = await this.icsFormRepository.save(form);
        this.logger.log(`Created ICS form ${saved.formType} (${saved.id}) for incident ${saved.incidentId}`);
        return saved;
    }

    /**
     * Find all ICS forms with optional filters
     */
    async findAll(query: QueryIcsFormsDto): Promise<{ data: IcsForm[]; total: number }> {
        const qb = this.icsFormRepository
            .createQueryBuilder('form')
            .orderBy('form.created_at', 'DESC');

        if (query.incidentId) {
            qb.andWhere('form.incident_id = :incidentId', { incidentId: query.incidentId });
        }
        if (query.missionSessionId) {
            qb.andWhere('form.mission_session_id = :missionSessionId', {
                missionSessionId: query.missionSessionId,
            });
        }
        if (query.formType) {
            qb.andWhere('form.form_type = :formType', { formType: query.formType });
        }
        if (query.status) {
            qb.andWhere('form.status = :status', { status: query.status });
        }

        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }

    /**
     * Find a single ICS form by ID
     */
    async findOne(id: string): Promise<IcsForm> {
        const form = await this.icsFormRepository.findOne({ where: { id } });
        if (!form) {
            throw new NotFoundException(`ICS form ${id} not found`);
        }
        return form;
    }

    /**
     * Update an ICS form
     */
    async update(id: string, dto: UpdateIcsFormDto): Promise<IcsForm> {
        const form = await this.findOne(id);

        if (form.status === IcsFormStatus.APPROVED) {
            throw new ForbiddenException('Cannot modify approved forms. Create a new version instead.');
        }

        // Apply updates
        if (dto.incidentName) form.incidentName = dto.incidentName;
        if (dto.operationalPeriodFrom) {
            form.operationalPeriodFrom = new Date(dto.operationalPeriodFrom);
        }
        if (dto.operationalPeriodTo) {
            form.operationalPeriodTo = new Date(dto.operationalPeriodTo);
        }
        if (dto.status) form.status = dto.status;
        if (dto.formData) form.formData = { ...form.formData, ...dto.formData };
        if (dto.attachments) form.attachments = dto.attachments;

        return this.icsFormRepository.save(form);
    }

    /**
     * Approve an ICS form
     */
    async approve(
        id: string,
        approvedBy: string,
        approvedByName: string,
        comments?: string,
    ): Promise<IcsForm> {
        const form = await this.findOne(id);

        if (form.status === IcsFormStatus.APPROVED) {
            throw new ForbiddenException('Form is already approved');
        }

        form.status = IcsFormStatus.APPROVED;
        form.approvedBy = approvedBy;
        form.approvedByName = approvedByName;
        form.approvedAt = new Date();
        if (comments) {
            form.formData = { ...form.formData, approvalComments: comments };
        }

        const saved = await this.icsFormRepository.save(form);
        this.logger.log(`ICS form ${form.formType} (${id}) approved by ${approvedByName}`);
        return saved;
    }

    /**
     * Create a new version of an ICS form (supersedes previous)
     */
    async createNewVersion(id: string, preparedBy: string, preparedByName: string): Promise<IcsForm> {
        const original = await this.findOne(id);

        // Mark original as superseded
        original.status = IcsFormStatus.SUPERSEDED;
        await this.icsFormRepository.save(original);

        // Create new version
        const newForm = this.icsFormRepository.create({
            ...original,
            id: undefined, // Let TypeORM generate new ID
            version: original.version + 1,
            status: IcsFormStatus.DRAFT,
            preparedBy,
            preparedByName,
            approvedBy: undefined,
            approvedByName: undefined,
            approvedAt: undefined,
            createdAt: undefined,
            updatedAt: undefined,
        });

        const saved = await this.icsFormRepository.save(newForm);
        this.logger.log(`Created new version ${saved.version} of ICS form ${saved.formType}`);
        return saved;
    }

    /**
     * Delete an ICS form (soft delete or hard delete for drafts)
     */
    async remove(id: string): Promise<void> {
        const form = await this.findOne(id);

        if (form.status !== IcsFormStatus.DRAFT) {
            throw new ForbiddenException('Only draft forms can be deleted');
        }

        await this.icsFormRepository.delete(id);
        this.logger.log(`Deleted ICS form ${id}`);
    }

    /**
     * Export form to JSON format
     */
    async exportToJson(id: string): Promise<object> {
        const form = await this.findOne(id);

        return {
            meta: {
                formType: form.formType,
                version: form.version,
                status: form.status,
                incidentId: form.incidentId,
                incidentName: form.incidentName,
                exportedAt: new Date().toISOString(),
            },
            operationalPeriod: {
                from: form.operationalPeriodFrom?.toISOString(),
                to: form.operationalPeriodTo?.toISOString(),
            },
            preparedBy: {
                id: form.preparedBy,
                name: form.preparedByName,
            },
            approvedBy: form.approvedBy
                ? {
                      id: form.approvedBy,
                      name: form.approvedByName,
                      at: form.approvedAt?.toISOString(),
                  }
                : null,
            data: form.formData,
            attachments: form.attachments,
        };
    }

    /**
     * Get form type description
     */
    getFormTypeDescription(formType: IcsFormType): string {
        const descriptions: Record<IcsFormType, string> = {
            [IcsFormType.ICS_201]: 'Incident Briefing',
            [IcsFormType.ICS_202]: 'Incident Objectives',
            [IcsFormType.ICS_203]: 'Organization Assignment List',
            [IcsFormType.ICS_204]: 'Assignment List',
            [IcsFormType.ICS_205]: 'Incident Radio Communications Plan',
            [IcsFormType.ICS_206]: 'Medical Plan',
            [IcsFormType.ICS_207]: 'Incident Organization Chart',
            [IcsFormType.ICS_209]: 'Incident Status Summary',
            [IcsFormType.ICS_213]: 'General Message',
            [IcsFormType.ICS_214]: 'Activity Log',
        };
        return descriptions[formType] || formType;
    }
}
