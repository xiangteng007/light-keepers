import { IsString, IsOptional, IsUUID, IsArray } from 'class-validator';

/**
 * DTO for assigning a task to volunteer(s)
 */
export class AssignTaskDto {
    @IsArray()
    @IsUUID('4', { each: true })
    volunteerIds: string[];

    @IsOptional()
    @IsString()
    message?: string;
}

/**
 * DTO for accepting a task assignment
 */
export class AcceptTaskDto {
    @IsOptional()
    @IsString()
    note?: string;
}

/**
 * DTO for declining a task assignment
 */
export class DeclineTaskDto {
    @IsString()
    reason: string;
}

/**
 * DTO for completing a task
 */
export class CompleteTaskDto {
    @IsOptional()
    @IsString()
    notes?: string;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    attachmentIds?: string[];
}
