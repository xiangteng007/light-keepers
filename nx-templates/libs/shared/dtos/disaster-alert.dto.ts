/**
 * Disaster Alert DTO - Shared Type Definition
 * File: libs/shared/dtos/src/lib/disaster-alert.dto.ts
 * 
 * 📦 This DTO is the SINGLE SOURCE OF TRUTH for disaster alerts.
 * - Backend: Uses for validation (class-validator)
 * - Frontend: Uses as TypeScript type (compile-time safety)
 */

import {
    IsString,
    IsNumber,
    IsEnum,
    IsArray,
    IsOptional,
    IsDate,
    IsUUID,
    ValidateNested,
    Min,
    Max,
    MinLength,
    MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ============================================================
// Enums
// ============================================================

export enum DisasterSeverity {
    LOW = 'low',           // Minor incident, monitoring only
    MEDIUM = 'medium',     // Moderate threat, standby response
    HIGH = 'high',         // Significant threat, active response
    CRITICAL = 'critical', // Life-threatening, all hands on deck
}

export enum DisasterType {
    EARTHQUAKE = 'earthquake',
    FLOOD = 'flood',
    TYPHOON = 'typhoon',
    FIRE = 'fire',
    LANDSLIDE = 'landslide',
    TSUNAMI = 'tsunami',
    CHEMICAL_SPILL = 'chemical_spill',
    BUILDING_COLLAPSE = 'building_collapse',
    TRAFFIC_ACCIDENT = 'traffic_accident',
    MISSING_PERSON = 'missing_person',
}

export enum AlertStatus {
    PENDING = 'pending',       // Awaiting verification
    ACTIVE = 'active',         // Confirmed and ongoing
    MONITORING = 'monitoring', // Under observation
    RESOLVED = 'resolved',     // Incident closed
    FALSE_ALARM = 'false_alarm',
}

export enum AlertSource {
    NCDR = 'ncdr',             // National Center for Disaster Reduction
    CWA = 'cwa',               // Central Weather Administration
    MANUAL = 'manual',         // Human-reported
    SOCIAL_MEDIA = 'social_media', // Intel Agent detection
    IOT_SENSOR = 'iot_sensor', // Automated sensor
    DRONE = 'drone',           // Aerial reconnaissance
}

// ============================================================
// Nested DTOs
// ============================================================

export class GeoLocationDto {
    @ApiProperty({ description: 'Latitude coordinate', example: 22.6273 })
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude!: number;

    @ApiProperty({ description: 'Longitude coordinate', example: 120.3014 })
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude!: number;

    @ApiPropertyOptional({ description: 'Human-readable address' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @ApiPropertyOptional({ description: 'Altitude in meters' })
    @IsOptional()
    @IsNumber()
    altitude?: number;

    @ApiPropertyOptional({ description: 'Accuracy radius in meters' })
    @IsOptional()
    @IsNumber()
    accuracy?: number;
}

export class AffectedAreaDto {
    @ApiProperty({ description: 'Estimated affected radius in meters' })
    @IsNumber()
    @Min(0)
    radiusMeters!: number;

    @ApiPropertyOptional({ description: 'Estimated affected population' })
    @IsOptional()
    @IsNumber()
    estimatedPopulation?: number;

    @ApiPropertyOptional({ description: 'List of affected districts' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    districts?: string[];
}

// ============================================================
// Create DTO (Input)
// ============================================================

export class CreateDisasterAlertDto {
    @ApiProperty({ description: 'Alert title', example: '高雄三民區淹水警報' })
    @IsString()
    @MinLength(5)
    @MaxLength(200)
    title!: string;

    @ApiProperty({ description: 'Detailed description of the disaster' })
    @IsString()
    @MinLength(10)
    @MaxLength(5000)
    description!: string;

    @ApiProperty({ enum: DisasterType, example: DisasterType.FLOOD })
    @IsEnum(DisasterType)
    type!: DisasterType;

    @ApiProperty({ enum: DisasterSeverity, example: DisasterSeverity.HIGH })
    @IsEnum(DisasterSeverity)
    severity!: DisasterSeverity;

    @ApiProperty({ description: 'Location of the disaster' })
    @ValidateNested()
    @Type(() => GeoLocationDto)
    location!: GeoLocationDto;

    @ApiPropertyOptional({ description: 'Affected area details' })
    @IsOptional()
    @ValidateNested()
    @Type(() => AffectedAreaDto)
    affectedArea?: AffectedAreaDto;

    @ApiPropertyOptional({ enum: AlertSource, example: AlertSource.NCDR })
    @IsOptional()
    @IsEnum(AlertSource)
    source?: AlertSource;

    @ApiPropertyOptional({ description: 'Searchable tags', example: ['flood', 'kaohsiung', 'emergency'] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    @MaxLength(50, { each: true })
    tags?: string[];

    @ApiPropertyOptional({ description: 'URLs to media attachments' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    mediaUrls?: string[];

    @ApiPropertyOptional({ description: 'External reference ID (e.g., NCDR alert ID)' })
    @IsOptional()
    @IsString()
    externalRefId?: string;
}

// ============================================================
// Update DTO (Partial Input)
// ============================================================

export class UpdateDisasterAlertDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MinLength(5)
    @MaxLength(200)
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(5000)
    description?: string;

    @ApiPropertyOptional({ enum: DisasterSeverity })
    @IsOptional()
    @IsEnum(DisasterSeverity)
    severity?: DisasterSeverity;

    @ApiPropertyOptional({ enum: AlertStatus })
    @IsOptional()
    @IsEnum(AlertStatus)
    status?: AlertStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @ValidateNested()
    @Type(() => AffectedAreaDto)
    affectedArea?: AffectedAreaDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    tags?: string[];
}

// ============================================================
// Response DTO (Output)
// ============================================================

export class DisasterAlertResponseDto {
    @ApiProperty({ description: 'Unique alert ID' })
    id!: string;

    @ApiProperty()
    title!: string;

    @ApiProperty()
    description!: string;

    @ApiProperty({ enum: DisasterType })
    type!: DisasterType;

    @ApiProperty({ enum: DisasterSeverity })
    severity!: DisasterSeverity;

    @ApiProperty({ enum: AlertStatus })
    status!: AlertStatus;

    @ApiProperty()
    location!: GeoLocationDto;

    @ApiPropertyOptional()
    affectedArea?: AffectedAreaDto;

    @ApiProperty({ enum: AlertSource })
    source!: AlertSource;

    @ApiProperty()
    tags!: string[];

    @ApiPropertyOptional()
    mediaUrls?: string[];

    @ApiProperty()
    createdAt!: Date;

    @ApiProperty()
    updatedAt!: Date;

    @ApiPropertyOptional({ description: 'ID of user who created the alert' })
    createdBy?: string;

    @ApiPropertyOptional({ description: 'Linked mission session ID' })
    missionSessionId?: string;
}

// ============================================================
// List Query DTO
// ============================================================

export class QueryDisasterAlertsDto {
    @ApiPropertyOptional({ enum: DisasterType })
    @IsOptional()
    @IsEnum(DisasterType)
    type?: DisasterType;

    @ApiPropertyOptional({ enum: DisasterSeverity })
    @IsOptional()
    @IsEnum(DisasterSeverity)
    severity?: DisasterSeverity;

    @ApiPropertyOptional({ enum: AlertStatus })
    @IsOptional()
    @IsEnum(AlertStatus)
    status?: AlertStatus;

    @ApiPropertyOptional({ description: 'Filter by tags (comma-separated)' })
    @IsOptional()
    @IsString()
    tags?: string;

    @ApiPropertyOptional({ description: 'Page number', default: 1 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    page?: number = 1;

    @ApiPropertyOptional({ description: 'Items per page', default: 20 })
    @IsOptional()
    @IsNumber()
    @Type(() => Number)
    limit?: number = 20;
}
