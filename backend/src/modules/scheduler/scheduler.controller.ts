/**
 * Scheduler Controller
 * REST API for scheduled task management
 */

import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { SchedulerService, ScheduledTask } from './scheduler.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

class CreateTaskDto {
    name: string;
    description?: string;
    cronExpression: string;
    handler: string;
    enabled?: boolean;
    metadata?: Record<string, any>;
}

@Controller('scheduler')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
export class SchedulerController {
    constructor(private schedulerService: SchedulerService) { }

    /**
     * Get all scheduled tasks
     */
    @Get('tasks')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getAllTasks() {
        const tasks = await this.schedulerService.getAllTasks();
        return { success: true, data: tasks };
    }

    /**
     * Get available handlers
     */
    @Get('handlers')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getHandlers() {
        const handlers = this.schedulerService.getAvailableHandlers();
        return { success: true, data: handlers };
    }

    /**
     * Create a new task
     */
    @Post('tasks')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async createTask(@Body() dto: CreateTaskDto) {
        const task = await this.schedulerService.createTask({
            name: dto.name,
            description: dto.description,
            cronExpression: dto.cronExpression,
            handler: dto.handler,
            enabled: dto.enabled ?? true,
            metadata: dto.metadata,
        });
        return { success: true, data: task };
    }

    /**
     * Get task by ID
     */
    @Get('tasks/:id')
    @RequiredLevel(ROLE_LEVELS.OFFICER)
    async getTask(@Param('id') id: string) {
        const task = await this.schedulerService.getTask(id);
        if (!task) {
            return { success: false, error: 'Task not found' };
        }
        return { success: true, data: task };
    }

    /**
     * Update a task
     */
    @Put('tasks/:id')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async updateTask(@Param('id') id: string, @Body() dto: Partial<CreateTaskDto>) {
        const task = await this.schedulerService.updateTask(id, dto as Partial<ScheduledTask>);
        if (!task) {
            return { success: false, error: 'Task not found' };
        }
        return { success: true, data: task };
    }

    /**
     * Delete a task
     */
    @Delete('tasks/:id')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async deleteTask(@Param('id') id: string) {
        const deleted = await this.schedulerService.deleteTask(id);
        return { success: deleted };
    }

    /**
     * Enable/disable a task
     */
    @Post('tasks/:id/toggle')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async toggleTask(@Param('id') id: string, @Body() body: { enabled: boolean }) {
        const task = await this.schedulerService.setTaskEnabled(id, body.enabled);
        if (!task) {
            return { success: false, error: 'Task not found' };
        }
        return { success: true, data: task };
    }

    /**
     * Run a task immediately
     */
    @Post('tasks/:id/run')
    @RequiredLevel(ROLE_LEVELS.OWNER)
    async runTask(@Param('id') id: string) {
        const result = await this.schedulerService.runTaskNow(id);
        return { success: result.success, data: result };
    }
}
