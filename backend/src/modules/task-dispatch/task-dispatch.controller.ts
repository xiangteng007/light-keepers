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
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
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

// Authenticated request interface for type safety
interface AuthenticatedRequest {
    user: { id: string };
}

@Controller('tasks')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class TaskDispatchController {
    constructor(private readonly taskService: TaskDispatchService) { }

    /**
     * Create a new task
     */
    @Post()
    @RequiredLevel(RoleLevel.OFFICER)
    async createTask(@Body() dto: CreateTaskDto, @Request() req: AuthenticatedRequest) {
        const task = await this.taskService.createTask(dto, req.user.id);
        return task;
    }

    /**
     * Get tasks for a mission (via query param)
     */
    @Get()
    @RequiredLevel(RoleLevel.VOLUNTEER)
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
    @RequiredLevel(RoleLevel.VOLUNTEER)
    async getMyTasks(@Request() req: AuthenticatedRequest) {
        return this.taskService.getVolunteerTasks(req.user.id);
    }

    /**
     * Get a single task
     */
    @Get(':id')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    async getTask(@Param('id') id: string) {
        return this.taskService.getTaskById(id);
    }

    /**
     * Update a task
     */
    @Patch(':id')
    @RequiredLevel(RoleLevel.OFFICER)
    async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
        return this.taskService.updateTask(id, dto);
    }

    /**
     * Assign task to volunteers
     */
    @Post(':id/assign')
    @RequiredLevel(RoleLevel.OFFICER)
    async assignTask(
        @Param('id') id: string,
        @Body() dto: AssignTaskDto,
        @Request() req: AuthenticatedRequest,
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
    @RequiredLevel(RoleLevel.VOLUNTEER)
    async acceptTask(
        @Param('id') id: string,
        @Body() dto: AcceptTaskDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.taskService.acceptAssignment(id, req.user.id, dto.note);
    }

    /**
     * Decline a task assignment
     */
    @Post(':id/decline')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    async declineTask(
        @Param('id') id: string,
        @Body() dto: DeclineTaskDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.taskService.declineAssignment(id, req.user.id, dto.reason);
    }

    /**
     * Start working on a task
     */
    @Post(':id/start')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    async startTask(@Param('id') id: string, @Request() req: AuthenticatedRequest) {
        return this.taskService.startTask(id, req.user.id);
    }

    /**
     * Complete a task
     */
    @Post(':id/complete')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    async completeTask(
        @Param('id') id: string,
        @Body() dto: CompleteTaskDto,
        @Request() req: AuthenticatedRequest,
    ) {
        return this.taskService.completeTask(id, req.user.id, dto.notes);
    }

    /**
     * Cancel a task
     */
    @Delete(':id')
    @RequiredLevel(RoleLevel.OFFICER)
    async cancelTask(@Param('id') id: string, @Query('reason') reason?: string) {
        return this.taskService.cancelTask(id, reason);
    }

    /**
     * Get task statistics for a mission
     */
    @Get('stats/:missionSessionId')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    async getStats(@Param('missionSessionId') missionSessionId: string) {
        return this.taskService.getMissionStats(missionSessionId);
    }

    /**
     * 🆕 Check-in to a task with GPS validation
     */
    @Post(':id/checkin')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    async checkIn(
        @Param('id') id: string,
        @Body() dto: { latitude: number; longitude: number; note?: string },
        @Request() req: AuthenticatedRequest,
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
    @RequiredLevel(RoleLevel.VOLUNTEER)
    async checkOut(
        @Param('id') id: string,
        @Body() dto: { latitude?: number; longitude?: number; notes?: string },
        @Request() req: AuthenticatedRequest,
    ) {
        return this.taskService.checkOut(id, req.user.id, {
            latitude: dto.latitude,
            longitude: dto.longitude,
            notes: dto.notes,
        });
    }
}
