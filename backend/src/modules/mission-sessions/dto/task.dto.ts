import { IsString, IsOptional, IsEnum, IsObject, IsUUID, IsDateString } from 'class-validator';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

export class CreateTaskDto {
    @IsUUID()
    sessionId: string;

    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @IsOptional()
    @IsString()
    assigneeId?: string;

    @IsOptional()
    @IsString()
    assigneeName?: string;

    @IsOptional()
    @IsDateString()
    dueAt?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class UpdateTaskDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(TaskStatus)
    status?: TaskStatus;

    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @IsOptional()
    @IsString()
    assigneeId?: string;

    @IsOptional()
    @IsString()
    assigneeName?: string;

    @IsOptional()
    @IsDateString()
    dueAt?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
