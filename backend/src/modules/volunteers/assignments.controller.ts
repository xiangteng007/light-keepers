import {
    Controller,
    Get,
    Post,
    Patch,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { AssignmentsService, CreateAssignmentDto, CheckInDto, CheckOutDto } from './assignments.service';

@Controller('volunteer-assignments')
export class AssignmentsController {
    constructor(private readonly assignmentsService: AssignmentsService) { }

    // 建立任務指派
    @Post()
    async create(@Body() dto: CreateAssignmentDto) {
        const assignment = await this.assignmentsService.create(dto);
        return {
            success: true,
            message: '任務已指派',
            data: assignment,
        };
    }

    // 取得志工的任務
    @Get('volunteer/:volunteerId')
    async findByVolunteer(@Param('volunteerId') volunteerId: string) {
        const assignments = await this.assignmentsService.findByVolunteer(volunteerId);
        return {
            success: true,
            data: assignments,
            count: assignments.length,
        };
    }

    // 取得待處理任務
    @Get('pending')
    async findPending() {
        const assignments = await this.assignmentsService.findPending();
        return {
            success: true,
            data: assignments,
            count: assignments.length,
        };
    }

    // 取得進行中任務
    @Get('active')
    async findActive() {
        const assignments = await this.assignmentsService.findActive();
        return {
            success: true,
            data: assignments,
            count: assignments.length,
        };
    }

    // 取得統計
    @Get('stats')
    async getStats() {
        const stats = await this.assignmentsService.getStats();
        return {
            success: true,
            data: stats,
        };
    }

    // 取得單一任務
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const assignment = await this.assignmentsService.findOne(id);
        return {
            success: true,
            data: assignment,
        };
    }

    // 接受任務
    @Patch(':id/accept')
    async accept(@Param('id') id: string) {
        const assignment = await this.assignmentsService.accept(id);
        return {
            success: true,
            message: '已接受任務',
            data: assignment,
        };
    }

    // 拒絕任務
    @Patch(':id/decline')
    async decline(
        @Param('id') id: string,
        @Body('reason') reason?: string,
    ) {
        const assignment = await this.assignmentsService.decline(id, reason);
        return {
            success: true,
            message: '已拒絕任務',
            data: assignment,
        };
    }

    // 簽到
    @Patch(':id/check-in')
    async checkIn(
        @Param('id') id: string,
        @Body() dto: CheckInDto,
    ) {
        const assignment = await this.assignmentsService.checkIn(id, dto);
        return {
            success: true,
            message: '簽到成功',
            data: assignment,
        };
    }

    // 簽退
    @Patch(':id/check-out')
    async checkOut(
        @Param('id') id: string,
        @Body() dto: CheckOutDto,
    ) {
        const assignment = await this.assignmentsService.checkOut(id, dto);
        return {
            success: true,
            message: `簽退成功，服務時數: ${Math.round(assignment.minutesLogged / 60 * 10) / 10} 小時`,
            data: assignment,
        };
    }

    // 取消任務
    @Patch(':id/cancel')
    async cancel(@Param('id') id: string) {
        const assignment = await this.assignmentsService.cancel(id);
        return {
            success: true,
            message: '任務已取消',
            data: assignment,
        };
    }
}
