import { IsString, IsOptional, IsNumber, IsUUID, IsDateString, Min, Max, IsIn } from 'class-validator';

export class CreateTaskDto {
    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsUUID()
    @IsOptional()
    eventId?: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(5)
    priority?: number;

    @IsUUID()
    @IsOptional()
    assignedTo?: string;

    @IsDateString()
    @IsOptional()
    dueAt?: string;
}

export class UpdateTaskDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(5)
    priority?: number;

    @IsString()
    @IsOptional()
    @IsIn(['pending', 'in_progress', 'completed', 'cancelled'])
    status?: string;

    @IsUUID()
    @IsOptional()
    assignedTo?: string;

    @IsDateString()
    @IsOptional()
    dueAt?: string;
}

export class TaskQueryDto {
    @IsString()
    @IsOptional()
    status?: string;

    @IsUUID()
    @IsOptional()
    eventId?: string;

    @IsUUID()
    @IsOptional()
    assignedTo?: string;

    @IsNumber()
    @IsOptional()
    limit?: number;

    @IsNumber()
    @IsOptional()
    offset?: number;
}
