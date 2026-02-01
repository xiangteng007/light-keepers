import {
    IsEnum,
    IsUUID,
    IsString,
    IsOptional,
    IsObject,
    IsArray,
    IsDateString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IcsFormType, IcsFormStatus } from '../entities/ics-form.entity';

/**
 * Create ICS Form DTO
 */
export class CreateIcsFormDto {
    @ApiProperty({ description: 'Incident/Event ID' })
    @IsUUID()
    incidentId: string;

    @ApiPropertyOptional({ description: 'Mission Session ID' })
    @IsOptional()
    @IsUUID()
    missionSessionId?: string;

    @ApiProperty({ enum: IcsFormType, description: 'ICS Form Type (e.g., ICS-201)' })
    @IsEnum(IcsFormType)
    formType: IcsFormType;

    @ApiProperty({ description: 'Incident Name' })
    @IsString()
    incidentName: string;

    @ApiPropertyOptional({ description: 'Operational Period From' })
    @IsOptional()
    @IsDateString()
    operationalPeriodFrom?: string;

    @ApiPropertyOptional({ description: 'Operational Period To' })
    @IsOptional()
    @IsDateString()
    operationalPeriodTo?: string;

    @ApiPropertyOptional({ description: 'Form-specific data (JSON object)' })
    @IsOptional()
    @IsObject()
    formData?: Record<string, any>;

    @ApiPropertyOptional({ description: 'Attachment file references', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    attachments?: string[];
}

/**
 * Update ICS Form DTO
 */
export class UpdateIcsFormDto {
    @ApiPropertyOptional({ description: 'Incident Name' })
    @IsOptional()
    @IsString()
    incidentName?: string;

    @ApiPropertyOptional({ description: 'Operational Period From' })
    @IsOptional()
    @IsDateString()
    operationalPeriodFrom?: string;

    @ApiPropertyOptional({ description: 'Operational Period To' })
    @IsOptional()
    @IsDateString()
    operationalPeriodTo?: string;

    @ApiPropertyOptional({ enum: IcsFormStatus, description: 'Form Status' })
    @IsOptional()
    @IsEnum(IcsFormStatus)
    status?: IcsFormStatus;

    @ApiPropertyOptional({ description: 'Form-specific data (JSON object)' })
    @IsOptional()
    @IsObject()
    formData?: Record<string, any>;

    @ApiPropertyOptional({ description: 'Attachment file references', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    attachments?: string[];
}

/**
 * Approve ICS Form DTO
 */
export class ApproveIcsFormDto {
    @ApiPropertyOptional({ description: 'Approval comments' })
    @IsOptional()
    @IsString()
    comments?: string;
}

/**
 * Query ICS Forms DTO
 */
export class QueryIcsFormsDto {
    @ApiPropertyOptional({ description: 'Incident ID to filter by' })
    @IsOptional()
    @IsUUID()
    incidentId?: string;

    @ApiPropertyOptional({ description: 'Mission Session ID to filter by' })
    @IsOptional()
    @IsUUID()
    missionSessionId?: string;

    @ApiPropertyOptional({ enum: IcsFormType, description: 'Filter by form type' })
    @IsOptional()
    @IsEnum(IcsFormType)
    formType?: IcsFormType;

    @ApiPropertyOptional({ enum: IcsFormStatus, description: 'Filter by status' })
    @IsOptional()
    @IsEnum(IcsFormStatus)
    status?: IcsFormStatus;
}
