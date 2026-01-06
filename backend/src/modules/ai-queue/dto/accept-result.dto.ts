import { IsString, IsOptional, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const ACCEPT_ACTIONS = [
    'apply_summary',
    'merge_reports',
    'create_task',
] as const;

export type AcceptAction = typeof ACCEPT_ACTIONS[number];

/**
 * DTO for accepting an AI result
 */
export class AcceptAiResultDto {
    @ApiProperty({
        enum: ACCEPT_ACTIONS,
        description: 'Action to apply',
    })
    @IsIn(ACCEPT_ACTIONS)
    action: AcceptAction;

    @ApiPropertyOptional({ description: 'Additional parameters for the action' })
    @IsOptional()
    @IsObject()
    parameters?: object;
}

/**
 * DTO for rejecting an AI result
 */
export class RejectAiResultDto {
    @ApiPropertyOptional({ description: 'Reason for rejection' })
    @IsOptional()
    @IsString()
    reason?: string;
}

/**
 * Response for accept result
 */
export class AcceptResultResponse {
    @ApiProperty()
    success: boolean;

    @ApiProperty()
    appliedAction: string;

    @ApiProperty({ type: [Object] })
    affectedEntities: Array<{ type: string; id: string }>;
}

/**
 * Response for reject result
 */
export class RejectResultResponse {
    @ApiProperty()
    success: boolean;

    @ApiProperty()
    rejectedAt: string;
}
