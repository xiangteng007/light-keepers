import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PointsRecord, PointsRecordType } from './points-record.entity';

export interface CreatePointsRecordDto {
    volunteerId: string;
    taskId?: string;
    recordType: PointsRecordType;
    hours: number;
    points: number;
    multiplier?: number;
    description?: string;
    recordedBy?: string;
}

export interface PointsSummary {
    totalHours: number;
    totalPoints: number;
    taskCount: number;
    trainingCount: number;
    byType: Record<PointsRecordType, { hours: number; points: number }>;
}

@Injectable()
export class PointsService {
    private readonly logger = new Logger(PointsService.name);

    constructor(
        @InjectRepository(PointsRecord)
        private pointsRepository: Repository<PointsRecord>,
    ) { }

    // 新增積分紀錄
    async create(dto: CreatePointsRecordDto): Promise<PointsRecord> {
        const record = this.pointsRepository.create({
            ...dto,
            multiplier: dto.multiplier || 1.0,
        });
        const saved = await this.pointsRepository.save(record);
        this.logger.log(`Created points record for volunteer ${dto.volunteerId}: ${dto.points} points, ${dto.hours} hours`);
        return saved;
    }

    // 取得志工的所有積分紀錄
    async findByVolunteer(volunteerId: string): Promise<PointsRecord[]> {
        return this.pointsRepository.find({
            where: { volunteerId },
            order: { createdAt: 'DESC' },
        });
    }

    // 取得志工在指定期間的積分紀錄
    async findByVolunteerInPeriod(
        volunteerId: string,
        startDate: Date,
        endDate: Date,
    ): Promise<PointsRecord[]> {
        return this.pointsRepository.find({
            where: {
                volunteerId,
                createdAt: Between(startDate, endDate),
            },
            order: { createdAt: 'DESC' },
        });
    }

    // 取得志工積分統計
    async getVolunteerSummary(volunteerId: string): Promise<PointsSummary> {
        const records = await this.findByVolunteer(volunteerId);
        return this.calculateSummary(records);
    }

    // 取得年度積分統計
    async getYearlySummary(volunteerId: string, year: number): Promise<PointsSummary> {
        const startDate = new Date(year, 0, 1);
        const endDate = new Date(year, 11, 31, 23, 59, 59);
        const records = await this.findByVolunteerInPeriod(volunteerId, startDate, endDate);
        return this.calculateSummary(records);
    }

    // 計算積分摘要
    private calculateSummary(records: PointsRecord[]): PointsSummary {
        const byType: Record<PointsRecordType, { hours: number; points: number }> = {
            task: { hours: 0, points: 0 },
            training: { hours: 0, points: 0 },
            special: { hours: 0, points: 0 },
            adjustment: { hours: 0, points: 0 },
        };

        let totalHours = 0;
        let totalPoints = 0;
        let taskCount = 0;
        let trainingCount = 0;

        for (const record of records) {
            totalHours += Number(record.hours) || 0;
            totalPoints += record.points;

            if (byType[record.recordType]) {
                byType[record.recordType].hours += Number(record.hours) || 0;
                byType[record.recordType].points += record.points;
            }

            if (record.recordType === 'task') taskCount++;
            if (record.recordType === 'training') trainingCount++;
        }

        return {
            totalHours,
            totalPoints,
            taskCount,
            trainingCount,
            byType,
        };
    }

    // 記錄任務積分（含倍率計算）
    async recordTaskPoints(
        volunteerId: string,
        taskId: string,
        hours: number,
        options: {
            isNight?: boolean;
            isHighRisk?: boolean;
            customMultiplier?: number;
            description?: string;
            recordedBy?: string;
        } = {},
    ): Promise<PointsRecord> {
        // 計算倍率
        let multiplier = options.customMultiplier || 1.0;
        if (options.isNight) multiplier += 0.5;
        if (options.isHighRisk) multiplier += 0.5;

        // 計算積分（預設 1 小時 = 10 積分）
        const basePoints = hours * 10;
        const points = Math.round(basePoints * multiplier);

        return this.create({
            volunteerId,
            taskId,
            recordType: 'task',
            hours,
            points,
            multiplier,
            description: options.description || '任務出勤',
            recordedBy: options.recordedBy,
        });
    }

    // 記錄培訓積分
    async recordTrainingPoints(
        volunteerId: string,
        hours: number,
        description: string,
        recordedBy?: string,
    ): Promise<PointsRecord> {
        const points = Math.round(hours * 5); // 培訓 1 小時 = 5 積分

        return this.create({
            volunteerId,
            recordType: 'training',
            hours,
            points,
            multiplier: 1.0,
            description,
            recordedBy,
        });
    }

    // 調整積分
    async adjustPoints(
        volunteerId: string,
        points: number,
        description: string,
        recordedBy: string,
    ): Promise<PointsRecord> {
        return this.create({
            volunteerId,
            recordType: 'adjustment',
            hours: 0,
            points,
            multiplier: 1.0,
            description,
            recordedBy,
        });
    }

    // 匯出報表資料
    async exportReport(startDate: Date, endDate: Date): Promise<{
        volunteerId: string;
        volunteerName?: string;
        totalHours: number;
        totalPoints: number;
        taskCount: number;
    }[]> {
        const result = await this.pointsRepository
            .createQueryBuilder('record')
            .select('record.volunteerId', 'volunteerId')
            .addSelect('SUM(record.hours)', 'totalHours')
            .addSelect('SUM(record.points)', 'totalPoints')
            .addSelect('COUNT(CASE WHEN record.recordType = :taskType THEN 1 END)', 'taskCount')
            .where('record.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
            .setParameter('taskType', 'task')
            .groupBy('record.volunteerId')
            .getRawMany();

        return result.map(r => ({
            volunteerId: r.volunteerId,
            totalHours: parseFloat(r.totalHours) || 0,
            totalPoints: parseInt(r.totalPoints) || 0,
            taskCount: parseInt(r.taskCount) || 0,
        }));
    }
}
