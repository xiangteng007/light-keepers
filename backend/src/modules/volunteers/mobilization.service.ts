import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    VolunteerMobilization,
    MobilizationResponse,
    MobilizationStatus,
    ResponseStatus,
} from './entities/mobilization.entity';
import { CreateMobilizationDto, RespondMobilizationDto, CheckinDto } from './dto/mobilization.dto';

@Injectable()
export class MobilizationService {
    constructor(
        @InjectRepository(VolunteerMobilization)
        private mobilizationRepo: Repository<VolunteerMobilization>,
        @InjectRepository(MobilizationResponse)
        private responseRepo: Repository<MobilizationResponse>,
    ) {}

    // ==================== Mobilization CRUD ====================

    async create(dto: CreateMobilizationDto, userId: string): Promise<VolunteerMobilization> {
        const mobilization = new VolunteerMobilization();
        Object.assign(mobilization, {
            ...dto,
            startTime: dto.startTime ? new Date(dto.startTime) : undefined,
            endTime: dto.endTime ? new Date(dto.endTime) : undefined,
            createdBy: userId,
            status: MobilizationStatus.DRAFT,
        });
        return this.mobilizationRepo.save(mobilization);
    }

    async findAll(status?: MobilizationStatus): Promise<VolunteerMobilization[]> {
        const where: Record<string, unknown> = {};
        if (status) where.status = status;

        return this.mobilizationRepo.find({
            where,
            order: { createdAt: 'DESC' },
        });
    }

    async findById(id: string): Promise<VolunteerMobilization> {
        const mobilization = await this.mobilizationRepo.findOne({
            where: { id },
            relations: ['responses'],
        });
        if (!mobilization) {
            throw new NotFoundException(`Mobilization ${id} not found`);
        }
        return mobilization;
    }

    async activate(id: string): Promise<VolunteerMobilization> {
        const mobilization = await this.findById(id);

        if (mobilization.status !== MobilizationStatus.DRAFT) {
            throw new BadRequestException('Only draft mobilizations can be activated');
        }

        mobilization.status = MobilizationStatus.ACTIVE;
        mobilization.notificationSent = true;
        mobilization.notificationSentAt = new Date();

        return this.mobilizationRepo.save(mobilization);
    }

    async complete(id: string): Promise<VolunteerMobilization> {
        const mobilization = await this.findById(id);
        mobilization.status = MobilizationStatus.COMPLETED;
        return this.mobilizationRepo.save(mobilization);
    }

    async cancel(id: string): Promise<VolunteerMobilization> {
        const mobilization = await this.findById(id);
        mobilization.status = MobilizationStatus.CANCELLED;
        return this.mobilizationRepo.save(mobilization);
    }

    // ==================== Volunteer Response ====================

    async respond(
        mobilizationId: string,
        volunteerId: string,
        dto: RespondMobilizationDto,
    ): Promise<MobilizationResponse> {
        const mobilization = await this.findById(mobilizationId);

        if (mobilization.status !== MobilizationStatus.ACTIVE) {
            throw new BadRequestException('Mobilization is not active');
        }

        // Check existing response
        let response = await this.responseRepo.findOne({
            where: { mobilizationId, volunteerId },
        });

        if (response) {
            response.status = dto.status;
            response.notes = dto.notes ?? '';
            response.respondedAt = new Date();
        } else {
            response = this.responseRepo.create({
                mobilizationId,
                volunteerId,
                status: dto.status,
                notes: dto.notes,
                respondedAt: new Date(),
            });
        }

        const saved = await this.responseRepo.save(response);

        // Update counts
        await this.updateCounts(mobilizationId);

        return saved;
    }

    async checkin(
        mobilizationId: string,
        volunteerId: string,
        dto: CheckinDto,
    ): Promise<MobilizationResponse> {
        const response = await this.responseRepo.findOne({
            where: { mobilizationId, volunteerId },
        });

        if (!response) {
            throw new NotFoundException('Response not found');
        }

        if (response.status !== ResponseStatus.CONFIRMED) {
            throw new BadRequestException('Must confirm mobilization before checking in');
        }

        response.status = ResponseStatus.CHECKED_IN;
        response.checkedInAt = new Date();
        response.checkinLatitude = dto.latitude ?? 0;
        response.checkinLongitude = dto.longitude ?? 0;

        const saved = await this.responseRepo.save(response);

        // Update counts
        await this.updateCounts(mobilizationId);

        return saved;
    }

    async getResponses(mobilizationId: string): Promise<MobilizationResponse[]> {
        return this.responseRepo.find({
            where: { mobilizationId },
            order: { respondedAt: 'DESC' },
        });
    }

    // ==================== Statistics ====================

    async getStats(missionSessionId?: string): Promise<{
        total: number;
        active: number;
        totalRequired: number;
        totalConfirmed: number;
        totalCheckedIn: number;
        overallFulfillmentRate: number;
    }> {
        const where: Record<string, unknown> = {};
        if (missionSessionId) where.missionSessionId = missionSessionId;

        const mobilizations = await this.mobilizationRepo.find({ where });

        const active = mobilizations.filter(m => m.status === MobilizationStatus.ACTIVE).length;
        const totalRequired = mobilizations.reduce((sum, m) => sum + m.requiredCount, 0);
        const totalConfirmed = mobilizations.reduce((sum, m) => sum + m.confirmedCount, 0);
        const totalCheckedIn = mobilizations.reduce((sum, m) => sum + m.checkedInCount, 0);

        return {
            total: mobilizations.length,
            active,
            totalRequired,
            totalConfirmed,
            totalCheckedIn,
            overallFulfillmentRate: totalRequired > 0 ? Math.round((totalConfirmed / totalRequired) * 100) : 0,
        };
    }

    // ==================== Helper Methods ====================

    private async updateCounts(mobilizationId: string): Promise<void> {
        const confirmed = await this.responseRepo.count({
            where: { mobilizationId, status: ResponseStatus.CONFIRMED },
        });

        const checkedIn = await this.responseRepo.count({
            where: { mobilizationId, status: ResponseStatus.CHECKED_IN },
        });

        await this.mobilizationRepo.update(mobilizationId, {
            confirmedCount: confirmed + checkedIn, // CHECKED_IN was previously CONFIRMED
            checkedInCount: checkedIn,
        });
    }
}
