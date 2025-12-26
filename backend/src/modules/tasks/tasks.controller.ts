import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';

@Controller('tasks')
export class TasksController {
    constructor(private readonly tasksService: TasksService) { }

    @Post()
    async create(@Body() dto: CreateTaskDto) {
        const task = await this.tasksService.create(dto);
        return { success: true, data: task };
    }

    @Get()
    async findAll(@Query() query: TaskQueryDto) {
        const result = await this.tasksService.findAll(query);
        return { success: true, data: result.data, count: result.total };
    }

    @Get('kanban')
    async getKanbanBoard() {
        const data = await this.tasksService.getKanbanBoard();
        return { success: true, data };
    }

    @Get('stats')
    async getStats() {
        const data = await this.tasksService.getStats();
        return { success: true, data };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const task = await this.tasksService.findOne(id);
        return { success: true, data: task };
    }

    @Put(':id')
    async update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
        const task = await this.tasksService.update(id, dto);
        return { success: true, data: task };
    }

    @Delete(':id')
    async remove(@Param('id') id: string) {
        await this.tasksService.remove(id);
        return { success: true, message: '任務已刪除' };
    }
}
