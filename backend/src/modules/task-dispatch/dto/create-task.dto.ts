import {
    IsString,
    IsOptional,
    IsEnum,
    IsUUID,
    IsInt,
    IsArray,
    IsDateString,
    IsObject,
    Min,
    Max,
} from 'class-validator';
import { TaskPriority, TaskCategory } from '../entities/dispatch-task.entity';

/**
 * DTO for creating a new dispatch task
 */
export class CreateTaskDto {
    @IsUUID()
    missionSessionId: string;

    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(TaskCategory)
    category?: TaskCategory;

    @IsOptional()
    @IsEnum(TaskPriority)
    priority?: TaskPriority;

    @IsOptional()
    @IsUUID()
    sourceReportId?: string;

    @IsOptional()
    @IsUUID()
    sourceAiJobId?: string;

    @IsOptional()
    @IsObject()
    location?: {
        latitude: number;
        longitude: number;
    };

    @IsOptional()
    @IsString()
    locationDescription?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    requiredSkills?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    requiredResources?: string[];

    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(1440)
    estimatedDurationMin?: number;

    @IsOptional()
    @IsDateString()
    dueAt?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
