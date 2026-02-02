import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
} from '@nestjs/common';
import { MissionSessionsService } from './mission-sessions.service';
import { CreateMissionSessionDto, UpdateMissionSessionDto } from './dto/mission-session.dto';
import { CreateEventDto } from './dto/event.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { RoleLevel } from '../accounts/entities/role.entity';

@Controller('mission-sessions')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class MissionSessionsController {
    constructor(private readonly service: MissionSessionsService) { }

    // Mission Session endpoints - Level 2 (Officer) and above can create
    @Post()
    @RequiredLevel(RoleLevel.OFFICER)
    createSession(@Body() dto: CreateMissionSessionDto) {
        return this.service.createSession(dto);
    }

    @Get()
    @RequiredLevel(RoleLevel.VOLUNTEER)
    findAllSessions() {
        return this.service.findAllSessions();
    }

    @Get(':id')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    findSession(@Param('id') id: string) {
        return this.service.findSessionById(id);
    }

    @Put(':id')
    @RequiredLevel(RoleLevel.OFFICER)
    updateSession(@Param('id') id: string, @Body() dto: UpdateMissionSessionDto) {
        return this.service.updateSession(id, dto);
    }

    @Post(':id/start')
    @RequiredLevel(RoleLevel.OFFICER)
    startSession(@Param('id') id: string) {
        return this.service.startSession(id);
    }

    @Post(':id/end')
    @RequiredLevel(RoleLevel.OFFICER)
    endSession(@Param('id') id: string) {
        return this.service.endSession(id);
    }

    @Delete(':id')
    @RequiredLevel(RoleLevel.CHAIRMAN)
    deleteSession(@Param('id') id: string) {
        return this.service.deleteSession(id);
    }

    // Event endpoints
    @Post('events')
    @RequiredLevel(RoleLevel.OFFICER)
    createEvent(@Body() dto: CreateEventDto) {
        return this.service.createEvent(dto);
    }

    @Get(':sessionId/events')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    findEvents(@Param('sessionId') sessionId: string) {
        return this.service.findEventsBySession(sessionId);
    }

    // Task endpoints
    @Post('tasks')
    @RequiredLevel(RoleLevel.OFFICER)
    createTask(@Body() dto: CreateTaskDto) {
        return this.service.createTask(dto);
    }

    @Get(':sessionId/tasks')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    findTasks(@Param('sessionId') sessionId: string) {
        return this.service.findTasksBySession(sessionId);
    }

    @Put('tasks/:id')
    @RequiredLevel(RoleLevel.OFFICER)
    updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
        return this.service.updateTask(id, dto);
    }

    @Delete('tasks/:id')
    @RequiredLevel(RoleLevel.OFFICER)
    deleteTask(@Param('id') id: string) {
        return this.service.deleteTask(id);
    }

    // Statistics
    @Get(':id/stats')
    @RequiredLevel(RoleLevel.VOLUNTEER)
    getStats(@Param('id') id: string) {
        return this.service.getSessionStats(id);
    }
}

