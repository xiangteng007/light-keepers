import { IsString, IsNumber, IsOptional, IsEnum, Min, Max, IsObject, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum FieldReportType {
    INCIDENT = 'incident',
    RESOURCE = 'resource',
    MEDICAL = 'medical',
    TRAFFIC = 'traffic',
    SOS = 'sos',
    OTHER = 'other',
}

export class CreateFieldReportDto {
    @ApiProperty({ enum: FieldReportType })
    @IsEnum(FieldReportType)
    type: FieldReportType;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    category?: string;

    @ApiProperty({ minimum: 0, maximum: 4 })
    @IsNumber()
    @Min(0)
    @Max(4)
    severity: number;

    @ApiPropertyOptional({ minimum: 0, maximum: 100 })
    @IsNumber()
    @Min(0)
    @Max(100)
    @IsOptional()
    confidence?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    message?: string;

    @ApiProperty({ description: 'Latitude in WGS84' })
    @IsNumber()
    latitude: number;

    @ApiProperty({ description: 'Longitude in WGS84' })
    @IsNumber()
    longitude: number;

    @ApiPropertyOptional({ description: 'GPS accuracy in meters' })
    @IsNumber()
    @IsOptional()
    accuracyM?: number;

    @ApiPropertyOptional({ description: 'When the incident occurred (ISO8601)' })
    @IsString()
    @IsOptional()
    occurredAt?: string;

    @ApiPropertyOptional({ description: 'Additional metadata' })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}

export class UpdateFieldReportDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional({ minimum: 0, maximum: 4 })
    @IsNumber()
    @Min(0)
    @Max(4)
    @IsOptional()
    severity?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    message?: string;

    @ApiPropertyOptional()
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}

export class FieldReportQueryDto {
    @ApiPropertyOptional({ description: 'Cursor for incremental sync (ISO8601)' })
    @IsString()
    @IsOptional()
    since?: string;

    @ApiPropertyOptional({ description: 'Bounding box: minLng,minLat,maxLng,maxLat' })
    @IsString()
    @IsOptional()
    bbox?: string;

    @ApiPropertyOptional({ description: 'Comma-separated types' })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiPropertyOptional({ description: 'Comma-separated severity levels' })
    @IsString()
    @IsOptional()
    severity?: string;

    @ApiPropertyOptional({ description: 'Comma-separated statuses' })
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional({ default: 100 })
    @IsNumber()
    @IsOptional()
    limit?: number;
}
