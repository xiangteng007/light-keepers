import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    VolunteerBadge,
    VolunteerEarnedBadge,
    VolunteerRecognition,
    RecognitionType,
    MILESTONES,
} from './recognition.entity';
import { Volunteer } from '../volunteers.entity';

export interface AwardBadgeDto {
    volunteerId: string;
    badgeId: string;
    reason?: string;
    awardedBy?: string;
}

export interface CreateRecognitionDto {
    volunteerId: string;
    type: RecognitionType;
    title: string;
    description?: string;
    year?: number;
    month?: number;
    certificateNumber?: string;
    milestoneValue?: number;
    badgeId?: string;
    isPublic?: boolean;
    awardedBy?: string;
}

@Injectable()
export class RecognitionService {
    private readonly logger = new Logger(RecognitionService.name);

    constructor(
        @InjectRepository(VolunteerBadge)
        private readonly badgeRepo: Repository<VolunteerBadge>,
        @InjectRepository(VolunteerEarnedBadge)
        private readonly earnedBadgeRepo: Repository<VolunteerEarnedBadge>,
        @InjectRepository(VolunteerRecognition)
        private readonly recognitionRepo: Repository<VolunteerRecognition>,
        @InjectRepository(Volunteer)
        private readonly volunteerRepo: Repository<Volunteer>,
    ) { }

    // ===== 徽章管理 =====

    async createBadge(data: Partial<VolunteerBadge>): Promise<VolunteerBadge> {
        const badge = this.badgeRepo.create(data);
        return this.badgeRepo.save(badge);
    }

    async getBadges(): Promise<VolunteerBadge[]> {
        return this.badgeRepo.find({
            where: { isActive: true },
            order: { sortOrder: 'ASC' },
        });
    }

    async getBadge(id: string): Promise<VolunteerBadge> {
        const badge = await this.badgeRepo.findOne({ where: { id } });
        if (!badge) throw new NotFoundException('Badge not found');
        return badge;
    }

    // ===== 頒發徽章 =====

    async awardBadge(dto: AwardBadgeDto): Promise<VolunteerEarnedBadge> {
        // 檢查是否已獲得
        const existing = await this.earnedBadgeRepo.findOne({
            where: { volunteerId: dto.volunteerId, badgeId: dto.badgeId },
        });
        if (existing) {
            this.logger.warn(`Volunteer ${dto.volunteerId} already has badge ${dto.badgeId}`);
            return existing;
        }

        const earnedBadge = this.earnedBadgeRepo.create({
            ...dto,
            earnedAt: new Date(),
        });

        const saved = await this.earnedBadgeRepo.save(earnedBadge);

        // 加積分
        const badge = await this.getBadge(dto.badgeId);
        if (badge.pointValue > 0) {
            await this.volunteerRepo.increment(
                { id: dto.volunteerId },
                'totalPoints',
                badge.pointValue,
            );
        }

        this.logger.log(`Awarded badge ${badge.name} to volunteer ${dto.volunteerId}`);
        return saved;
    }

    async getVolunteerBadges(volunteerId: string): Promise<VolunteerEarnedBadge[]> {
        return this.earnedBadgeRepo.find({
            where: { volunteerId },
            relations: ['badge'],
            order: { earnedAt: 'DESC' },
        });
    }

    // ===== 表揚記錄 =====

    async createRecognition(dto: CreateRecognitionDto): Promise<VolunteerRecognition> {
        const recognition = this.recognitionRepo.create({
            ...dto,
            awardedAt: new Date(),
        });

        const saved = await this.recognitionRepo.save(recognition);
        this.logger.log(`Recognition created: ${saved.title} for volunteer ${dto.volunteerId}`);

        // 如果關聯徽章，也頒發徽章
        if (dto.badgeId) {
            await this.awardBadge({
                volunteerId: dto.volunteerId,
                badgeId: dto.badgeId,
                reason: dto.title,
                awardedBy: dto.awardedBy,
            });
        }

        return saved;
    }

    async getVolunteerRecognitions(volunteerId: string): Promise<VolunteerRecognition[]> {
        return this.recognitionRepo.find({
            where: { volunteerId },
            relations: ['badge', 'awarder'],
            order: { awardedAt: 'DESC' },
        });
    }

    async getPublicRecognitions(limit = 20): Promise<VolunteerRecognition[]> {
        return this.recognitionRepo.find({
            where: { isPublic: true },
            relations: ['volunteer', 'badge'],
            order: { awardedAt: 'DESC' },
            take: limit,
        });
    }

    // ===== 里程碑檢查 =====

    async checkMilestones(volunteerId: string): Promise<VolunteerRecognition[]> {
        const volunteer = await this.volunteerRepo.findOne({ where: { id: volunteerId } });
        if (!volunteer) return [];

        const newRecognitions: VolunteerRecognition[] = [];

        // 檢查時數里程碑
        for (const [key, milestone] of Object.entries(MILESTONES)) {
            if ('hours' in milestone && volunteer.serviceHours >= milestone.hours) {
                const existing = await this.recognitionRepo.findOne({
                    where: {
                        volunteerId,
                        type: 'milestone',
                        milestoneValue: milestone.hours,
                    },
                });

                if (!existing) {
                    const recognition = await this.createRecognition({
                        volunteerId,
                        type: 'milestone',
                        title: milestone.title,
                        description: `累計服務時數達 ${milestone.hours} 小時`,
                        milestoneValue: milestone.hours,
                    });
                    newRecognitions.push(recognition);
                }
            }

            // 檢查任務里程碑
            if ('tasks' in milestone && volunteer.taskCount >= milestone.tasks) {
                const existing = await this.recognitionRepo.findOne({
                    where: {
                        volunteerId,
                        type: 'milestone',
                        milestoneValue: milestone.tasks * 1000, // 區分時數和任務
                    },
                });

                if (!existing) {
                    const recognition = await this.createRecognition({
                        volunteerId,
                        type: 'milestone',
                        title: milestone.title,
                        description: `累計完成 ${milestone.tasks} 項任務`,
                        milestoneValue: milestone.tasks * 1000,
                    });
                    newRecognitions.push(recognition);
                }
            }
        }

        return newRecognitions;
    }

    // ===== 排行榜 =====

    async getLeaderboard(
        type: 'hours' | 'tasks' | 'points' = 'hours',
        limit = 10,
    ): Promise<{ volunteer: Volunteer; value: number }[]> {
        const orderField = {
            hours: 'serviceHours',
            tasks: 'taskCount',
            points: 'totalPoints',
        }[type];

        const volunteers = await this.volunteerRepo.find({
            where: { approvalStatus: 'approved' },
            order: { [orderField]: 'DESC' },
            take: limit,
            select: ['id', 'name', 'region', 'serviceHours', 'taskCount', 'totalPoints', 'photoUrl'],
        });

        return volunteers.map(v => ({
            volunteer: v,
            value: v[orderField as keyof Volunteer] as number,
        }));
    }

    // ===== 統計 =====

    async getRecognitionStats(): Promise<{
        totalBadges: number;
        totalRecognitions: number;
        recentRecognitions: VolunteerRecognition[];
        topRecognized: { volunteerId: string; name: string; count: number }[];
    }> {
        const [totalBadges, totalRecognitions] = await Promise.all([
            this.earnedBadgeRepo.count(),
            this.recognitionRepo.count(),
        ]);

        const recentRecognitions = await this.recognitionRepo.find({
            where: { isPublic: true },
            relations: ['volunteer'],
            order: { awardedAt: 'DESC' },
            take: 5,
        });

        // 最多表揚的志工
        const topRecognizedRaw = await this.recognitionRepo
            .createQueryBuilder('r')
            .select('r.volunteerId', 'volunteerId')
            .addSelect('COUNT(*)', 'count')
            .groupBy('r.volunteerId')
            .orderBy('count', 'DESC')
            .limit(5)
            .getRawMany();

        const topRecognized = await Promise.all(
            topRecognizedRaw.map(async (r) => {
                const volunteer = await this.volunteerRepo.findOne({
                    where: { id: r.volunteerId },
                    select: ['name'],
                });
                return {
                    volunteerId: r.volunteerId,
                    name: volunteer?.name || 'Unknown',
                    count: parseInt(r.count, 10),
                };
            }),
        );

        return {
            totalBadges,
            totalRecognitions,
            recentRecognitions,
            topRecognized,
        };
    }
}
