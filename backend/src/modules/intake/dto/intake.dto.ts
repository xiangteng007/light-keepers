import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsEnum,
    IsObject,
    IsArray,
    IsUUID,
    MaxLength,
} from 'class-validator';
import { IntakeReportType } from '../entities/intake-report.entity';

export class CreateIntakeDto {
    @ApiProperty({ description: '通報類型', enum: IntakeReportType })
    @IsEnum(IntakeReportType)
    sourceType: IntakeReportType;

    @ApiProperty({ description: '標題', maxLength: 255 })
    @IsString()
    @MaxLength(255)
    title: string;

    @ApiPropertyOptional({ description: '詳細描述' })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: '地理位置 {lat, lng, address}' })
    @IsOptional()
    @IsObject()
    geo?: { lat?: number; lng?: number; address?: string };

    @ApiPropertyOptional({ description: '行政區代碼' })
    @IsOptional()
    @IsString()
    @MaxLength(20)
    adminCode?: string;

    @ApiPropertyOptional({ description: '附件媒體 URLs' })
    @IsOptional()
    @IsArray()
    media?: string[];

    @ApiPropertyOptional({ description: '原始 payload' })
    @IsOptional()
    @IsObject()
    payload?: Record<string, any>;

    @ApiPropertyOptional({ description: '通報人名稱' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    reporterName?: string;

    @ApiPropertyOptional({ description: '通報人電話' })
    @IsOptional()
    @IsString()
    @MaxLength(30)
    reporterPhone?: string;

    @ApiPropertyOptional({ description: '關聯現有 Incident ID' })
    @IsOptional()
    @IsUUID()
    incidentId?: string;

    @ApiPropertyOptional({ description: '備註' })
    @IsOptional()
    @IsString()
    notes?: string;
}

export class IntakeResponseDto {
    @ApiProperty({ description: 'Intake Report ID' })
    intakeId: string;

    @ApiProperty({ description: 'Incident ID (MissionSession)' })
    incidentId: string;

    @ApiProperty({ description: '是否為新建 Incident' })
    isNewIncident: boolean;
}
