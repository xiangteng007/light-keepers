/**
 * Triage DTOs
 * Phase 5.1: E-Triage 系統
 */

import { IsNotEmpty, IsUUID, IsEnum, IsOptional, IsBoolean, IsNumber, IsString, IsArray, Min, Max, ValidateNested } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { TriageLevel, TransportStatus } from '../entities/victim.entity';
import { TreatmentType } from '../entities/medical-log.entity';

// ============ Location DTO ============

export class GeoLocationDto {
    @ApiProperty()
    @IsNumber()
    lat: number;

    @ApiProperty()
    @IsNumber()
    lng: number;
}

// ============ Create Victim DTO ============

export class CreateVictimDto {
    @ApiProperty()
    @IsUUID()
    @IsNotEmpty()
    missionSessionId: string;

    @ApiPropertyOptional({ description: 'NFC/QR 手環 ID' })
    @IsString()
    @IsOptional()
    braceletId?: string;

    // START 評估欄位

    @ApiPropertyOptional({ description: '是否能行走' })
    @IsBoolean()
    @IsOptional()
    canWalk?: boolean;

    @ApiPropertyOptional({ description: '是否有呼吸' })
    @IsBoolean()
    @IsOptional()
    breathing?: boolean;

    @ApiPropertyOptional({ description: '呼吸頻率 (每分鐘)' })
    @IsNumber()
    @Min(0)
    @Max(60)
    @IsOptional()
    respiratoryRate?: number;

    @ApiPropertyOptional({ description: '橈動脈是否可觸及' })
    @IsBoolean()
    @IsOptional()
    hasRadialPulse?: boolean;

    @ApiPropertyOptional({ description: '微血管回填時間 (秒)' })
    @IsNumber()
    @Min(0)
    @Max(10)
    @IsOptional()
    capillaryRefillTime?: number;

    @ApiPropertyOptional({ description: '能否遵從簡單指令' })
    @IsBoolean()
    @IsOptional()
    canFollowCommands?: boolean;

    // 傷患資訊

    @ApiPropertyOptional({ description: '傷患描述' })
    @IsString()
    @IsOptional()
    description?: string;

    @ApiPropertyOptional({ description: '發現位置' })
    @ValidateNested()
    @Type(() => GeoLocationDto)
    @IsOptional()
    discoveryLocation?: GeoLocationDto;

    @ApiPropertyOptional({ description: '位置描述' })
    @IsString()
    @IsOptional()
    locationDescription?: string;

    @ApiPropertyOptional({ description: '傷勢描述' })
    @IsString()
    @IsOptional()
    injuries?: string;

    // 評估者

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    assessorId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    assessorName?: string;
}

// ============ Update Triage DTO ============

export class UpdateTriageDto {
    @ApiPropertyOptional({ enum: TriageLevel })
    @IsEnum(TriageLevel)
    @IsOptional()
    triageLevel?: TriageLevel;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    canWalk?: boolean;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    breathing?: boolean;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    respiratoryRate?: number;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    hasRadialPulse?: boolean;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    capillaryRefillTime?: number;

    @ApiPropertyOptional()
    @IsBoolean()
    @IsOptional()
    canFollowCommands?: boolean;
}

// ============ Start Transport DTO ============

export class StartTransportDto {
    @ApiProperty({ description: '醫院 ID' })
    @IsString()
    @IsNotEmpty()
    hospitalId: string;

    @ApiProperty({ description: '醫院名稱' })
    @IsString()
    @IsNotEmpty()
    hospitalName: string;

    @ApiPropertyOptional({ description: '救護車 ID' })
    @IsString()
    @IsOptional()
    ambulanceId?: string;

    @ApiPropertyOptional({ description: '預計到達時間' })
    @IsOptional()
    estimatedArrival?: Date;
}

// ============ Add Medical Log DTO ============

export class AddMedicalLogDto {
    @ApiProperty({ enum: TreatmentType })
    @IsEnum(TreatmentType)
    @IsNotEmpty()
    type: TreatmentType;

    @ApiProperty({ description: '處置內容' })
    @IsString()
    @IsNotEmpty()
    content: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    performerId?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    performerName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    metadata?: Record<string, any>;

    @ApiPropertyOptional()
    @ValidateNested()
    @Type(() => GeoLocationDto)
    @IsOptional()
    location?: GeoLocationDto;
}

// ============ Statistics Response DTO ============

export class TriageStatsDto {
    @ApiProperty()
    total: number;

    @ApiProperty()
    black: number;

    @ApiProperty()
    red: number;

    @ApiProperty()
    yellow: number;

    @ApiProperty()
    green: number;

    @ApiProperty()
    pendingTransport: number;

    @ApiProperty()
    inTransit: number;

    @ApiProperty()
    arrived: number;
}
