import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, MinLevel } from '../auth/guards/roles.guard';
import { RoleLevel } from '../accounts/entities/role.entity';
import { TaskDispatchService } from './task-dispatch.service';
import {
    CreateTaskDto,
    UpdateTaskDto,
    AssignTaskDto,
    AcceptTaskDto,
    DeclineTaskDto,
    CompleteTaskDto,
} from './dto';
import { TaskStatus, TaskPriority } from './entities/dispatch-task.entity';

@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TaskDispatchController {
    constructor(private readonly taskService: TaskDispatchService) { }

    /**
     * Create a new task
     */
    @Post()
    @MinLevel(RoleLevel.OFFICER)
    async createTask(@Body() dto: CreateTaskDto, @Request() req: any) {
        const task = await this.taskService.createTask(dto, req.user.id);
        return task;
    }

    /**
     * Get tasks for a mission (via query param)
     */
    @Get()
    @MinLevel(RoleLevel.VOLUNTEER)
    async getTasks(
        @Query('missionSessionId') missionSessionId: string,
        @Query('status') status?: TaskStatus,
        @Query('priority') priority?: string,
    ) {
        const filters = {
            status: status || undefined,
            priority: priority ? (parseInt(priority) as TaskPriority) : undefined,
        };
        return this.taskService.getTasksByMission(missionSessionId, filters);
    }

    /**
     * Get tasks assigned to current user
     */
    @Get('my')
    @MinLevel(RoleLevel.VOLUNTEER)
    async getMyTasks(@Request() req: any) {
        return this.taskService.getVolunteerTasks(req.user.id);
    }

    /**
     * Get a single task
     */
    @Get(':id')
    @MinLevel(RoleLevel.VOLUNTEER)
    async getTask(@Param('id') id: string) {
        return this.taskService.getTaskById(id);
    }

    /**
     * Update a task
     */
    @Patch(':id')
    @MinLevel(RoleLevel.OFFICER)
    async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
        return this.taskService.updateTask(id, dto);
    }

    /**
     * Assign task to volunteers
     */
    @Post(':id/assign')
    @MinLevel(RoleLevel.OFFICER)
    async assignTask(
        @Param('id') id: string,
        @Body() dto: AssignTaskDto,
        @Request() req: any,
    ) {
        // TODO: Fetch volunteer names from volunteer service
        const volunteerNames = new Map<string, string>();
        dto.volunteerIds.forEach((vid) => volunteerNames.set(vid, 'Volunteer'));
        return this.taskService.assignTask(id, dto, req.user.id, volunteerNames);
    }

    /**
     * Accept a task assignment
     */
    @Post(':id/accept')
    @MinLevel(RoleLevel.VOLUNTEER)
    async acceptTask(
        @Param('id') id: string,
        @Body() dto: AcceptTaskDto,
        @Request() req: any,
    ) {
        return this.taskService.acceptAssignment(id, req.user.id, dto.note);
    }

    /**
     * Decline a task assignment
     */
    @Post(':id/decline')
    @MinLevel(RoleLevel.VOLUNTEER)
    async declineTask(
        @Param('id') id: string,
        @Body() dto: DeclineTaskDto,
        @Request() req: any,
    ) {
        return this.taskService.declineAssignment(id, req.user.id, dto.reason);
    }

    /**
     * Start working on a task
     */
    @Post(':id/start')
    @MinLevel(RoleLevel.VOLUNTEER)
    async startTask(@Param('id') id: string, @Request() req: any) {
        return this.taskService.startTask(id, req.user.id);
    }

    /**
     * Complete a task
     */
    @Post(':id/complete')
    @MinLevel(RoleLevel.VOLUNTEER)
    async completeTask(
        @Param('id') id: string,
        @Body() dto: CompleteTaskDto,
        @Request() req: any,
    ) {
        return this.taskService.completeTask(id, req.user.id, dto.notes);
    }

    /**
     * Cancel a task
     */
    @Delete(':id')
    @MinLevel(RoleLevel.OFFICER)
    async cancelTask(@Param('id') id: string, @Query('reason') reason?: string) {
        return this.taskService.cancelTask(id, reason);
    }

    /**
     * Get task statistics for a mission
     */
    @Get('stats/:missionSessionId')
    @MinLevel(RoleLevel.VOLUNTEER)
    async getStats(@Param('missionSessionId') missionSessionId: string) {
        return this.taskService.getMissionStats(missionSessionId);
    }

    /**
     * 🆕 Check-in to a task with GPS validation
     */
    @Post(':id/checkin')
    @MinLevel(RoleLevel.VOLUNTEER)
    async checkIn(
        @Param('id') id: string,
        @Body() dto: { latitude: number; longitude: number; note?: string },
        @Request() req: any,
    ) {
        return this.taskService.checkIn(id, req.user.id, {
            latitude: dto.latitude,
            longitude: dto.longitude,
            note: dto.note,
        });
    }

    /**
     * 🆕 Check-out from a task
     */
    @Post(':id/checkout')
    @MinLevel(RoleLevel.VOLUNTEER)
    async checkOut(
        @Param('id') id: string,
        @Body() dto: { latitude?: number; longitude?: number; notes?: string },
        @Request() req: any,
    ) {
        return this.taskService.checkOut(id, req.user.id, {
            latitude: dto.latitude,
            longitude: dto.longitude,
            notes: dto.notes,
        });
    }
}
