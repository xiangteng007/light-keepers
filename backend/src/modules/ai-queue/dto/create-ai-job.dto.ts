import { IsString, IsUUID, IsOptional, IsNumber, Min, Max, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const AI_USE_CASES = [
    'report.summarize.v1',
    'report.cluster.v1',
    'task.draftFromReport.v1',
    'resource.recommend.v1',
    'priority.score.v1',
] as const;

export type AiUseCaseId = typeof AI_USE_CASES[number];

/**
 * DTO for creating a new AI job
 */
export class CreateAiJobDto {
    @ApiProperty({
        enum: AI_USE_CASES,
        description: 'AI use case identifier',
    })
    @IsIn(AI_USE_CASES)
    useCaseId: AiUseCaseId;

    @ApiProperty({ description: 'Mission session ID' })
    @IsUUID()
    missionSessionId: string;

    @ApiProperty({
        enum: ['report', 'reports', 'task'],
        description: 'Entity type this job operates on',
    })
    @IsIn(['report', 'reports', 'task'])
    entityType: 'report' | 'reports' | 'task';

    @ApiProperty({ description: 'Entity ID (UUID) or comma-separated UUIDs for batch' })
    @IsString()
    entityId: string;

    @ApiPropertyOptional({ description: 'Job priority (0-10)', default: 5 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(10)
    priority?: number;

    @ApiPropertyOptional({ description: 'Idempotency key for deduplication' })
    @IsOptional()
    @IsString()
    idempotencyKey?: string;
}

/**
 * Response for job creation
 */
export class AiJobCreatedResponse {
    @ApiProperty()
    jobId: string;

    @ApiProperty()
    status: string;

    @ApiPropertyOptional()
    estimatedWaitMs?: number;
}

/**
 * Response for job status query
 */
export class AiJobDetailResponse {
    @ApiProperty()
    jobId: string;

    @ApiProperty()
    useCaseId: string;

    @ApiProperty()
    status: string;

    @ApiPropertyOptional()
    outputJson?: object;

    @ApiPropertyOptional()
    errorCode?: string;

    @ApiPropertyOptional()
    errorMessage?: string;

    @ApiProperty()
    attempt: number;

    @ApiProperty()
    maxAttempts: number;

    @ApiProperty()
    isFallback: boolean;

    @ApiProperty()
    createdAt: string;

    @ApiProperty()
    updatedAt: string;

    @ApiPropertyOptional()
    result?: {
        acceptedBy?: string;
        acceptedAt?: string;
        rejectedBy?: string;
        rejectedAt?: string;
    };
}
