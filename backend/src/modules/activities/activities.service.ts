import { Injectable, Logger, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Activity, ActivityRegistration, ActivityCategory, ActivityStatus, RegistrationStatus } from './activities.entity';

export interface CreateActivityDto {
    title: string;
    description?: string;
    summary?: string;
    category?: ActivityCategory;
    startAt: Date;
    endAt: Date;
    registrationDeadline?: Date;
    location?: string;
    latitude?: number;
    longitude?: number;
    onlineUrl?: string;
    maxParticipants?: number;
    waitlistLimit?: number;
    requireApproval?: boolean;
    organizerId: string;
    organizerName?: string;
    contactPhone?: string;
    contactEmail?: string;
    coverImage?: string;
    tags?: string[];
}

export interface RegisterActivityDto {
    activityId: string;
    userId: string;
    userName: string;
    userPhone?: string;
    userEmail?: string;
    remarks?: string;
}

export interface ActivityFilter {
    category?: ActivityCategory;
    status?: ActivityStatus;
    upcoming?: boolean;
    limit?: number;
    offset?: number;
}

@Injectable()
export class ActivitiesService {
    private readonly logger = new Logger(ActivitiesService.name);

    constructor(
        @InjectRepository(Activity)
        private readonly activityRepo: Repository<Activity>,
        @InjectRepository(ActivityRegistration)
        private readonly registrationRepo: Repository<ActivityRegistration>,
    ) { }

    // ===== 活動 CRUD =====

    async createActivity(dto: CreateActivityDto): Promise<Activity> {
        const activity = this.activityRepo.create({
            ...dto,
            status: 'draft',
            currentParticipants: 0,
        });

        const saved = await this.activityRepo.save(activity);
        this.logger.log(`Activity created: ${saved.id} - ${saved.title}`);
        return saved;
    }

    async findActivities(filter: ActivityFilter = {}): Promise<Activity[]> {
        const query = this.activityRepo.createQueryBuilder('a')
            .where('a.status != :draft', { draft: 'draft' });

        if (filter.category) {
            query.andWhere('a.category = :category', { category: filter.category });
        }

        if (filter.status) {
            query.andWhere('a.status = :status', { status: filter.status });
        }

        if (filter.upcoming) {
            query.andWhere('a.startAt > :now', { now: new Date() });
        }

        query.orderBy('a.startAt', 'ASC');

        if (filter.limit) query.take(filter.limit);
        if (filter.offset) query.skip(filter.offset);

        return query.getMany();
    }

    async findActivity(id: string): Promise<Activity> {
        const activity = await this.activityRepo.findOne({ where: { id } });
        if (!activity) {
            throw new NotFoundException(`Activity ${id} not found`);
        }
        return activity;
    }

    async updateActivity(id: string, dto: Partial<CreateActivityDto>): Promise<Activity> {
        const activity = await this.findActivity(id);
        Object.assign(activity, dto);
        return this.activityRepo.save(activity);
    }

    async publishActivity(id: string): Promise<Activity> {
        const activity = await this.findActivity(id);
        if (activity.status !== 'draft') {
            throw new BadRequestException('Only draft activities can be published');
        }
        activity.status = 'open';
        return this.activityRepo.save(activity);
    }

    async closeRegistration(id: string): Promise<Activity> {
        const activity = await this.findActivity(id);
        activity.status = 'closed';
        return this.activityRepo.save(activity);
    }

    async cancelActivity(id: string): Promise<Activity> {
        const activity = await this.findActivity(id);
        activity.status = 'cancelled';
        // TODO: 通知已報名者
        return this.activityRepo.save(activity);
    }

    async completeActivity(id: string): Promise<Activity> {
        const activity = await this.findActivity(id);
        activity.status = 'completed';
        return this.activityRepo.save(activity);
    }

    // ===== 報名功能 =====

    async register(dto: RegisterActivityDto): Promise<ActivityRegistration> {
        const activity = await this.findActivity(dto.activityId);

        // 檢查活動狀態
        if (activity.status !== 'open') {
            throw new BadRequestException('Activity is not open for registration');
        }

        // 檢查報名截止
        if (activity.registrationDeadline && new Date() > activity.registrationDeadline) {
            throw new BadRequestException('Registration deadline has passed');
        }

        // 檢查重複報名
        const existing = await this.registrationRepo.findOne({
            where: { activityId: dto.activityId, userId: dto.userId },
        });
        if (existing) {
            throw new ConflictException('Already registered for this activity');
        }

        // 決定報名狀態
        let status: RegistrationStatus = 'pending';
        let waitlistPosition: number | undefined;

        const isFull = activity.maxParticipants > 0 &&
            activity.currentParticipants >= activity.maxParticipants;

        if (isFull) {
            // 進入候補
            const waitlistCount = await this.registrationRepo.count({
                where: { activityId: dto.activityId, status: 'waitlist' },
            });

            if (activity.waitlistLimit > 0 && waitlistCount >= activity.waitlistLimit) {
                throw new BadRequestException('Activity is full and waitlist is also full');
            }

            status = 'waitlist';
            waitlistPosition = waitlistCount + 1;
        } else if (!activity.requireApproval) {
            // 不需審核，直接確認
            status = 'confirmed';
        }

        const registration = this.registrationRepo.create({
            ...dto,
            status,
            waitlistPosition,
        });

        const saved = await this.registrationRepo.save(registration);

        // 更新報名人數
        if (status === 'confirmed') {
            activity.currentParticipants++;
            await this.activityRepo.save(activity);
        }

        this.logger.log(`Registration: ${saved.id} for activity ${dto.activityId} - status: ${status}`);
        return saved;
    }

    async getRegistrations(activityId: string): Promise<ActivityRegistration[]> {
        return this.registrationRepo.find({
            where: { activityId },
            order: { createdAt: 'ASC' },
        });
    }

    async getUserRegistrations(userId: string): Promise<ActivityRegistration[]> {
        return this.registrationRepo.find({
            where: { userId },
            relations: ['activity'],
            order: { createdAt: 'DESC' },
        });
    }

    async approveRegistration(registrationId: string, reviewedBy: string, note?: string): Promise<ActivityRegistration> {
        const registration = await this.registrationRepo.findOne({
            where: { id: registrationId },
            relations: ['activity'],
        });

        if (!registration) {
            throw new NotFoundException('Registration not found');
        }

        if (registration.status !== 'pending') {
            throw new BadRequestException('Can only approve pending registrations');
        }

        const activity = registration.activity;

        // 檢查是否還有名額
        const isFull = activity.maxParticipants > 0 &&
            activity.currentParticipants >= activity.maxParticipants;

        if (isFull) {
            registration.status = 'waitlist';
            const waitlistCount = await this.registrationRepo.count({
                where: { activityId: activity.id, status: 'waitlist' },
            });
            registration.waitlistPosition = waitlistCount + 1;
        } else {
            registration.status = 'confirmed';
            activity.currentParticipants++;
            await this.activityRepo.save(activity);
        }

        registration.reviewedBy = reviewedBy;
        registration.reviewedAt = new Date();
        registration.reviewNote = note;

        return this.registrationRepo.save(registration);
    }

    async cancelRegistration(registrationId: string, userId: string): Promise<void> {
        const registration = await this.registrationRepo.findOne({
            where: { id: registrationId },
            relations: ['activity'],
        });

        if (!registration) {
            throw new NotFoundException('Registration not found');
        }

        if (registration.userId !== userId) {
            throw new BadRequestException('Cannot cancel other user registration');
        }

        const wasConfirmed = registration.status === 'confirmed';
        registration.status = 'cancelled';
        await this.registrationRepo.save(registration);

        // 更新報名人數
        if (wasConfirmed) {
            const activity = registration.activity;
            activity.currentParticipants = Math.max(0, activity.currentParticipants - 1);
            await this.activityRepo.save(activity);

            // 自動遞補候補者
            await this.promoteFromWaitlist(activity.id);
        }
    }

    async markAttendance(registrationId: string, attended: boolean): Promise<ActivityRegistration> {
        const registration = await this.registrationRepo.findOne({
            where: { id: registrationId },
        });

        if (!registration) {
            throw new NotFoundException('Registration not found');
        }

        registration.attended = attended;
        registration.attendedAt = attended ? new Date() : undefined;
        registration.status = attended ? 'attended' : registration.status;

        return this.registrationRepo.save(registration);
    }

    // 遞補候補者
    private async promoteFromWaitlist(activityId: string): Promise<void> {
        const waitlisted = await this.registrationRepo.findOne({
            where: { activityId, status: 'waitlist' },
            order: { waitlistPosition: 'ASC' },
        });

        if (waitlisted) {
            waitlisted.status = 'confirmed';
            waitlisted.waitlistPosition = undefined;
            await this.registrationRepo.save(waitlisted);

            const activity = await this.findActivity(activityId);
            activity.currentParticipants++;
            await this.activityRepo.save(activity);

            // TODO: 發送通知給遞補者
            this.logger.log(`Promoted from waitlist: ${waitlisted.id}`);
        }
    }

    // 統計
    async getActivityStats(activityId: string): Promise<{
        confirmed: number;
        pending: number;
        waitlist: number;
        cancelled: number;
        attended: number;
    }> {
        const results = await this.registrationRepo
            .createQueryBuilder('r')
            .select('r.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .where('r.activityId = :activityId', { activityId })
            .groupBy('r.status')
            .getRawMany();

        const stats = {
            confirmed: 0,
            pending: 0,
            waitlist: 0,
            cancelled: 0,
            attended: 0,
        };

        for (const r of results) {
            if (r.status in stats) {
                stats[r.status as keyof typeof stats] = parseInt(r.count, 10);
            }
        }

        return stats;
    }
}
