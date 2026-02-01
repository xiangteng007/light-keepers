/**
 * Staff Check-In Service
 * 
 * Emergency check-in and panic button functionality
 */
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, LessThan } from 'typeorm';
import { StaffCheckIn } from '../entities/staff-checkin.entity';

export enum CheckInType {
    ROUTINE = 'routine',
    ARRIVAL = 'arrival',
    DEPARTURE = 'departure',
    PANIC = 'panic',
    WELLNESS = 'wellness',
}

export interface CheckInDto {
    staffId: string;
    type: CheckInType;
    location?: {
        latitude: number;
        longitude: number;
        accuracy?: number;
    };
    message?: string;
    missionId?: string;
}

@Injectable()
export class StaffCheckInService {
    private readonly logger = new Logger(StaffCheckInService.name);

    // Staff expected to check in at least once every 4 hours during operations
    private readonly CHECK_IN_INTERVAL_HOURS = 4;

    constructor(
        @InjectRepository(StaffCheckIn)
        private readonly checkInRepo: Repository<StaffCheckIn>,
    ) { }

    /**
     * Record a staff check-in
     */
    async checkIn(dto: CheckInDto): Promise<StaffCheckIn> {
        if (dto.type === CheckInType.PANIC) {
            this.logger.error(`🚨 PANIC BUTTON ACTIVATED by staff ${dto.staffId}`);
            await this.handlePanicButton(dto);
        }

        const checkIn = this.checkInRepo.create({
            staffId: dto.staffId,
            type: dto.type,
            latitude: dto.location?.latitude,
            longitude: dto.location?.longitude,
            accuracy: dto.location?.accuracy,
            message: dto.message,
            missionId: dto.missionId,
            checkedInAt: new Date(),
        });

        return this.checkInRepo.save(checkIn);
    }

    /**
     * Handle panic button - immediate alert
     */
    private async handlePanicButton(dto: CheckInDto): Promise<void> {
        // TODO: Integrate with notification system for immediate alerts
        // - SMS to security coordinator
        // - Push notification to team leads
        // - Alert on mission command dashboard
        this.logger.error(`Panic alert from ${dto.staffId} at ${dto.location?.latitude}, ${dto.location?.longitude}`);
    }

    /**
     * Get staff who haven't checked in within expected interval
     */
    async getOverdueCheckIns(missionId?: string): Promise<string[]> {
        const threshold = new Date();
        threshold.setHours(threshold.getHours() - this.CHECK_IN_INTERVAL_HOURS);

        // Get all recent check-ins
        const recentCheckIns = await this.checkInRepo.find({
            where: {
                checkedInAt: MoreThan(threshold),
                ...(missionId && { missionId }),
            },
            select: ['staffId'],
        });

        const recentStaffIds = new Set(recentCheckIns.map(c => c.staffId));

        // Get all staff assigned to mission (simplified - should query from volunteers/accounts)
        // For now, return staff who checked in earlier but not recently
        const olderCheckIns = await this.checkInRepo.find({
            where: {
                checkedInAt: LessThan(threshold),
                ...(missionId && { missionId }),
            },
            select: ['staffId'],
        });

        const overdueStaff = olderCheckIns
            .filter(c => !recentStaffIds.has(c.staffId))
            .map(c => c.staffId);

        return [...new Set(overdueStaff)];
    }

    /**
     * Get last known location for a staff member
     */
    async getLastKnownLocation(staffId: string): Promise<{
        latitude?: number;
        longitude?: number;
        checkedInAt: Date;
    } | null> {
        const lastCheckIn = await this.checkInRepo.findOne({
            where: { staffId },
            order: { checkedInAt: 'DESC' },
            select: ['latitude', 'longitude', 'checkedInAt'],
        });

        if (!lastCheckIn) return null;

        return {
            latitude: lastCheckIn.latitude,
            longitude: lastCheckIn.longitude,
            checkedInAt: lastCheckIn.checkedInAt,
        };
    }

    /**
     * Get check-in history for staff
     */
    async getCheckInHistory(
        staffId: string,
        limit: number = 50
    ): Promise<StaffCheckIn[]> {
        return this.checkInRepo.find({
            where: { staffId },
            order: { checkedInAt: 'DESC' },
            take: limit,
        });
    }
}
