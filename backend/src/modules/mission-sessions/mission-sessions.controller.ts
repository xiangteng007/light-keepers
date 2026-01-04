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
import { JwtAuthGuard, RolesGuard, MinLevel } from '../auth/guards';
import { RoleLevel } from '../accounts/entities/role.entity';

@Controller('mission-sessions')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MissionSessionsController {
    constructor(private readonly service: MissionSessionsService) { }

    // Mission Session endpoints - Level 2 (Officer) and above can create
    @Post()
    @MinLevel(RoleLevel.OFFICER)
    createSession(@Body() dto: CreateMissionSessionDto) {
        return this.service.createSession(dto);
    }

    @Get()
    @MinLevel(RoleLevel.VOLUNTEER)
    findAllSessions() {
        return this.service.findAllSessions();
    }

    @Get(':id')
    @MinLevel(RoleLevel.VOLUNTEER)
    findSession(@Param('id') id: string) {
        return this.service.findSessionById(id);
    }

    @Put(':id')
    @MinLevel(RoleLevel.OFFICER)
    updateSession(@Param('id') id: string, @Body() dto: UpdateMissionSessionDto) {
        return this.service.updateSession(id, dto);
    }

    @Post(':id/start')
    @MinLevel(RoleLevel.OFFICER)
    startSession(@Param('id') id: string) {
        return this.service.startSession(id);
    }

    @Post(':id/end')
    @MinLevel(RoleLevel.OFFICER)
    endSession(@Param('id') id: string) {
        return this.service.endSession(id);
    }

    @Delete(':id')
    @MinLevel(RoleLevel.CHAIRMAN)
    deleteSession(@Param('id') id: string) {
        return this.service.deleteSession(id);
    }

    // Event endpoints
    @Post('events')
    @MinLevel(RoleLevel.OFFICER)
    createEvent(@Body() dto: CreateEventDto) {
        return this.service.createEvent(dto);
    }

    @Get(':sessionId/events')
    @MinLevel(RoleLevel.VOLUNTEER)
    findEvents(@Param('sessionId') sessionId: string) {
        return this.service.findEventsBySession(sessionId);
    }

    // Task endpoints
    @Post('tasks')
    @MinLevel(RoleLevel.OFFICER)
    createTask(@Body() dto: CreateTaskDto) {
        return this.service.createTask(dto);
    }

    @Get(':sessionId/tasks')
    @MinLevel(RoleLevel.VOLUNTEER)
    findTasks(@Param('sessionId') sessionId: string) {
        return this.service.findTasksBySession(sessionId);
    }

    @Put('tasks/:id')
    @MinLevel(RoleLevel.OFFICER)
    updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
        return this.service.updateTask(id, dto);
    }

    @Delete('tasks/:id')
    @MinLevel(RoleLevel.OFFICER)
    deleteTask(@Param('id') id: string) {
        return this.service.deleteTask(id);
    }

    // Statistics
    @Get(':id/stats')
    @MinLevel(RoleLevel.VOLUNTEER)
    getStats(@Param('id') id: string) {
        return this.service.getSessionStats(id);
    }
}

