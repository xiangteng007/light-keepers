import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { VolunteerAssignment } from './volunteer-assignments.entity';
import { Volunteer } from './volunteers.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

// DTO for location update
export interface UpdateLocationDto {
    lat: number;
    lng: number;
}

// Response type for active volunteer locations
export interface ActiveVolunteerLocation {
    assignmentId: string;
    volunteerId: string;
    volunteerName: string;
    taskTitle: string;
    status: string;
    lat: number;
    lng: number;
    lastLocationAt: Date;
    checkInAt?: Date;
}

@Controller('volunteer-locations')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class VolunteerLocationController {
    constructor(
        @InjectRepository(VolunteerAssignment)
        private assignmentRepo: Repository<VolunteerAssignment>,
        @InjectRepository(Volunteer)
        private volunteerRepo: Repository<Volunteer>,
    ) { }

    /**
     * 更新志工位置（任務期間）
     * POST /volunteer-locations/:assignmentId/update
     */
    @Post(':assignmentId/update')
    async updateLocation(
        @Param('assignmentId') assignmentId: string,
        @Body() dto: UpdateLocationDto,
    ) {
        const assignment = await this.assignmentRepo.findOne({
            where: { id: assignmentId },
        });

        if (!assignment) {
            return { success: false, message: '找不到指派任務' };
        }

        // 只有進行中的任務可以更新位置
        if (assignment.status !== 'in_progress') {
            return { success: false, message: '任務尚未開始或已結束' };
        }

        // 更新位置
        assignment.lastLocationLat = dto.lat;
        assignment.lastLocationLng = dto.lng;
        assignment.lastLocationAt = new Date();

        await this.assignmentRepo.save(assignment);

        return {
            success: true,
            message: '位置已更新',
            data: {
                assignmentId,
                lat: dto.lat,
                lng: dto.lng,
                updatedAt: assignment.lastLocationAt,
            },
        };
    }

    /**
     * 取得所有進行中任務的志工位置（用於地圖顯示）
     * GET /volunteer-locations/active
     */
    @Get('active')
    async getActiveVolunteerLocations() {
        // 查詢所有進行中的任務
        const assignments = await this.assignmentRepo.find({
            where: { status: 'in_progress' },
            order: { lastLocationAt: 'DESC' },
        });

        // 過濾有位置的任務
        const locatedAssignments = assignments.filter(
            a => a.lastLocationLat && a.lastLocationLng
        );

        if (locatedAssignments.length === 0) {
            return {
                success: true,
                data: [],
                count: 0,
            };
        }

        // 獲取志工資訊
        const volunteerIds = [...new Set(locatedAssignments.map(a => a.volunteerId))];
        const volunteers = await this.volunteerRepo.find({
            where: { id: In(volunteerIds) },
            select: ['id', 'name'],
        });
        const volunteerMap = new Map(volunteers.map(v => [v.id, v.name]));

        // 組合結果
        const locations: ActiveVolunteerLocation[] = locatedAssignments.map(a => ({
            assignmentId: a.id,
            volunteerId: a.volunteerId,
            volunteerName: volunteerMap.get(a.volunteerId) || 'Unknown',
            taskTitle: a.taskTitle,
            status: a.status,
            lat: Number(a.lastLocationLat),
            lng: Number(a.lastLocationLng),
            lastLocationAt: a.lastLocationAt!,
            checkInAt: a.checkInAt,
        }));

        return {
            success: true,
            data: locations,
            count: locations.length,
        };
    }

    /**
     * 取得單一志工的任務位置歷史
     * GET /volunteer-locations/volunteer/:volunteerId
     */
    @Get('volunteer/:volunteerId')
    async getVolunteerLocationHistory(
        @Param('volunteerId') volunteerId: string,
        @Query('limit') limit?: string,
    ) {
        const assignments = await this.assignmentRepo.find({
            where: { volunteerId },
            order: { createdAt: 'DESC' },
            take: limit ? parseInt(limit, 10) : 10,
        });

        const locationsWithPosition = assignments
            .filter(a => a.lastLocationLat && a.lastLocationLng)
            .map(a => ({
                assignmentId: a.id,
                taskTitle: a.taskTitle,
                status: a.status,
                lat: Number(a.lastLocationLat),
                lng: Number(a.lastLocationLng),
                lastLocationAt: a.lastLocationAt,
                checkInAt: a.checkInAt,
                checkOutAt: a.checkOutAt,
            }));

        return {
            success: true,
            data: locationsWithPosition,
            count: locationsWithPosition.length,
        };
    }
}
