import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { PointsRecord } from './points-record.entity';
import { Volunteer } from '../volunteers.entity';

export interface CheckInRecord {
    id: string;
    volunteerId: string;
    taskId?: string;
    checkInTime: Date;
    checkOutTime?: Date;
    location?: string;
    notes?: string;
}

export interface CheckInDto {
    volunteerId: string;
    taskId?: string;
    location?: string;
    notes?: string;
}

export interface CheckOutDto {
    volunteerId: string;
    taskId?: string;
    notes?: string;
}

@Injectable()
export class CheckInService {
    private readonly logger = new Logger(CheckInService.name);

    // 暫存簽到記錄 (實際應存入資料庫)
    private activeCheckIns: Map<string, CheckInRecord> = new Map();

    constructor(
        @InjectRepository(PointsRecord)
        private pointsRepository: Repository<PointsRecord>,
        @InjectRepository(Volunteer)
        private volunteerRepository: Repository<Volunteer>,
    ) { }

    /**
     * 志工簽到
     */
    async checkIn(dto: CheckInDto): Promise<CheckInRecord> {
        const { volunteerId, taskId } = dto;

        // 檢查是否已簽到
        const key = this.getCheckInKey(volunteerId, taskId);
        if (this.activeCheckIns.has(key)) {
            throw new BadRequestException('您已簽到，請勿重複簽到');
        }

        // 驗證志工存在
        const volunteer = await this.volunteerRepository.findOne({ where: { id: volunteerId } });
        if (!volunteer) {
            throw new BadRequestException('志工不存在');
        }

        // 建立簽到記錄
        const record: CheckInRecord = {
            id: `checkin_${Date.now()}_${volunteerId}`,
            volunteerId,
            taskId: dto.taskId,
            checkInTime: new Date(),
            location: dto.location,
            notes: dto.notes,
        };

        this.activeCheckIns.set(key, record);
        this.logger.log(`Volunteer ${volunteerId} checked in at ${record.checkInTime}`);

        return record;
    }

    /**
     * 志工簽退
     */
    async checkOut(dto: CheckOutDto): Promise<{
        record: CheckInRecord;
        hours: number;
        pointsEarned: number;
    }> {
        const { volunteerId, taskId } = dto;

        // 檢查是否已簽到
        const key = this.getCheckInKey(volunteerId, taskId);
        const checkInRecord = this.activeCheckIns.get(key);

        if (!checkInRecord) {
            throw new BadRequestException('您尚未簽到');
        }

        // 記錄簽退時間
        const checkOutTime = new Date();
        checkInRecord.checkOutTime = checkOutTime;

        // 計算服務時數
        const hours = this.calculateHours(checkInRecord.checkInTime, checkOutTime);

        // 判斷是否為夜間
        const isNight = this.isNightShift(checkInRecord.checkInTime, checkOutTime);

        // 計算積分 (任務 10分/小時，夜間 +50%)
        let multiplier = 1.0;
        if (isNight) multiplier += 0.5;
        const pointsEarned = Math.round(hours * 10 * multiplier);

        // 記錄積分
        const pointsRecord = this.pointsRepository.create({
            volunteerId,
            taskId,
            recordType: 'task',
            hours,
            points: pointsEarned,
            multiplier,
            description: dto.notes || `簽到服務 ${hours.toFixed(1)} 小時`,
        });
        await this.pointsRepository.save(pointsRecord);

        // 更新志工累計時數
        await this.volunteerRepository.increment(
            { id: volunteerId },
            'serviceHours',
            hours
        );
        await this.volunteerRepository.increment(
            { id: volunteerId },
            'totalPoints',
            pointsEarned
        );

        // 移除簽到記錄
        this.activeCheckIns.delete(key);

        this.logger.log(`Volunteer ${volunteerId} checked out. Hours: ${hours}, Points: ${pointsEarned}`);

        return {
            record: checkInRecord,
            hours,
            pointsEarned,
        };
    }

    /**
     * 取得志工目前的簽到狀態
     */
    async getCheckInStatus(volunteerId: string, taskId?: string): Promise<CheckInRecord | null> {
        const key = this.getCheckInKey(volunteerId, taskId);
        return this.activeCheckIns.get(key) || null;
    }

    /**
     * 取得所有進行中的簽到
     */
    async getActiveCheckIns(): Promise<CheckInRecord[]> {
        return Array.from(this.activeCheckIns.values());
    }

    /**
     * 取消簽到
     */
    async cancelCheckIn(volunteerId: string, taskId?: string): Promise<void> {
        const key = this.getCheckInKey(volunteerId, taskId);
        this.activeCheckIns.delete(key);
        this.logger.log(`Check-in cancelled for volunteer ${volunteerId}`);
    }

    private getCheckInKey(volunteerId: string, taskId?: string): string {
        return taskId ? `${volunteerId}_${taskId}` : volunteerId;
    }

    private calculateHours(checkIn: Date, checkOut: Date): number {
        const diffMs = checkOut.getTime() - checkIn.getTime();
        const hours = diffMs / (1000 * 60 * 60);
        return Math.round(hours * 10) / 10; // 四捨五入到小數點一位
    }

    private isNightShift(checkIn: Date, checkOut: Date): boolean {
        const nightStart = 22;  // 22:00
        const nightEnd = 6;     // 06:00

        const checkInHour = checkIn.getHours();
        const checkOutHour = checkOut.getHours();

        // 簡化判斷：任一時間點落在夜間時段
        return (
            checkInHour >= nightStart || checkInHour < nightEnd ||
            checkOutHour >= nightStart || checkOutHour < nightEnd
        );
    }
}
