import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VolunteerAssignment, AssignmentStatus } from './volunteer-assignments.entity';
import { VolunteersService } from './volunteers.service';

export interface CreateAssignmentDto {
    volunteerId: string;
    taskTitle: string;
    taskDescription?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    scheduledStart: Date;
    scheduledEnd?: Date;
    assignedBy?: string;
}

export interface CheckInDto {
    latitude?: number;
    longitude?: number;
}

export interface CheckOutDto {
    latitude?: number;
    longitude?: number;
    completionNotes?: string;
}

@Injectable()
export class AssignmentsService {
    private readonly logger = new Logger(AssignmentsService.name);

    constructor(
        @InjectRepository(VolunteerAssignment)
        private assignmentsRepository: Repository<VolunteerAssignment>,
        private volunteersService: VolunteersService,
    ) { }

    // 建立任務指派
    async create(dto: CreateAssignmentDto): Promise<VolunteerAssignment> {
        // 驗證志工存在
        await this.volunteersService.findOne(dto.volunteerId);

        const assignment = this.assignmentsRepository.create({
            ...dto,
            status: 'assigned',
        });

        const saved = await this.assignmentsRepository.save(assignment);
        this.logger.log(`Assignment created: ${saved.id} for volunteer ${dto.volunteerId}`);
        return saved;
    }

    // 取得志工的所有任務
    async findByVolunteer(volunteerId: string): Promise<VolunteerAssignment[]> {
        return this.assignmentsRepository.find({
            where: { volunteerId },
            order: { scheduledStart: 'DESC' },
        });
    }

    // 取得單一任務
    async findOne(id: string): Promise<VolunteerAssignment> {
        const assignment = await this.assignmentsRepository.findOne({
            where: { id },
            relations: ['volunteer'],
        });
        if (!assignment) {
            throw new NotFoundException(`Assignment ${id} not found`);
        }
        return assignment;
    }

    // 志工接受任務
    async accept(id: string): Promise<VolunteerAssignment> {
        const assignment = await this.findOne(id);

        if (assignment.status !== 'assigned') {
            throw new BadRequestException('只能接受待處理的任務');
        }

        assignment.status = 'accepted';
        assignment.respondedAt = new Date();

        // 更新志工狀態為執勤中
        await this.volunteersService.updateStatus(assignment.volunteerId, 'busy');

        const updated = await this.assignmentsRepository.save(assignment);
        this.logger.log(`Assignment ${id} accepted`);
        return updated;
    }

    // 志工拒絕任務
    async decline(id: string, reason?: string): Promise<VolunteerAssignment> {
        const assignment = await this.findOne(id);

        if (assignment.status !== 'assigned') {
            throw new BadRequestException('只能拒絕待處理的任務');
        }

        assignment.status = 'declined';
        assignment.respondedAt = new Date();
        assignment.declineReason = reason;

        const updated = await this.assignmentsRepository.save(assignment);
        this.logger.log(`Assignment ${id} declined`);
        return updated;
    }

    // 簽到
    async checkIn(id: string, dto: CheckInDto): Promise<VolunteerAssignment> {
        const assignment = await this.findOne(id);

        if (assignment.status !== 'accepted') {
            throw new BadRequestException('只能對已接受的任務簽到');
        }

        assignment.status = 'in_progress';
        assignment.checkInAt = new Date();
        assignment.checkInLatitude = dto.latitude;
        assignment.checkInLongitude = dto.longitude;

        const updated = await this.assignmentsRepository.save(assignment);
        this.logger.log(`Assignment ${id} checked in`);
        return updated;
    }

    // 簽退
    async checkOut(id: string, dto: CheckOutDto): Promise<VolunteerAssignment> {
        const assignment = await this.findOne(id);

        if (assignment.status !== 'in_progress') {
            throw new BadRequestException('只能對進行中的任務簽退');
        }

        const checkOutTime = new Date();
        const checkInTime = assignment.checkInAt;

        // 計算服務時數 (分鐘)
        const minutesLogged = checkInTime
            ? Math.round((checkOutTime.getTime() - checkInTime.getTime()) / 60000)
            : 0;

        assignment.status = 'completed';
        assignment.checkOutAt = checkOutTime;
        assignment.checkOutLatitude = dto.latitude;
        assignment.checkOutLongitude = dto.longitude;
        assignment.minutesLogged = minutesLogged;
        assignment.completionNotes = dto.completionNotes;

        // 更新志工累計時數
        const hoursToAdd = Math.round(minutesLogged / 60 * 10) / 10; // 四捨五入到小數一位
        await this.volunteersService.addServiceRecord(assignment.volunteerId, hoursToAdd);

        // 更新志工狀態為可用
        await this.volunteersService.updateStatus(assignment.volunteerId, 'available');

        const updated = await this.assignmentsRepository.save(assignment);
        this.logger.log(`Assignment ${id} completed with ${minutesLogged} minutes`);
        return updated;
    }

    // 取消任務
    async cancel(id: string): Promise<VolunteerAssignment> {
        const assignment = await this.findOne(id);

        if (assignment.status === 'completed') {
            throw new BadRequestException('已完成的任務無法取消');
        }

        assignment.status = 'cancelled';

        const updated = await this.assignmentsRepository.save(assignment);
        this.logger.log(`Assignment ${id} cancelled`);
        return updated;
    }

    // 取得待處理任務 (指派給志工但未回應)
    async findPending(): Promise<VolunteerAssignment[]> {
        return this.assignmentsRepository.find({
            where: { status: 'assigned' },
            relations: ['volunteer'],
            order: { createdAt: 'DESC' },
        });
    }

    // 取得進行中任務
    async findActive(): Promise<VolunteerAssignment[]> {
        return this.assignmentsRepository.find({
            where: [
                { status: 'accepted' },
                { status: 'in_progress' },
            ],
            relations: ['volunteer'],
            order: { scheduledStart: 'ASC' },
        });
    }

    // 統計
    async getStats(): Promise<{
        total: number;
        pending: number;
        active: number;
        completed: number;
        totalMinutes: number;
    }> {
        const all = await this.assignmentsRepository.find();

        let pending = 0, active = 0, completed = 0, totalMinutes = 0;

        for (const a of all) {
            if (a.status === 'assigned') pending++;
            else if (a.status === 'accepted' || a.status === 'in_progress') active++;
            else if (a.status === 'completed') {
                completed++;
                totalMinutes += a.minutesLogged;
            }
        }

        return { total: all.length, pending, active, completed, totalMinutes };
    }
}
