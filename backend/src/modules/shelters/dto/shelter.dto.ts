import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsEnum,
    IsNumber,
    IsOptional,
    IsArray,
    IsUUID,
    Min,
    Max,
} from 'class-validator';
import { ShelterType, ShelterStatus, SpecialNeeds } from '../entities/shelter.entity';

// ==================== Shelter DTOs ====================

export class CreateShelterDto {
    @ApiProperty({ example: '信義國小' })
    @IsString()
    name: string;

    @ApiProperty({ enum: ShelterType })
    @IsEnum(ShelterType)
    type: ShelterType;

    @ApiProperty({ example: '台北市信義區信義路五段150號' })
    @IsString()
    address: string;

    @ApiPropertyOptional({ example: 25.033 })
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiPropertyOptional({ example: 121.565 })
    @IsOptional()
    @IsNumber()
    longitude?: number;

    @ApiProperty({ example: 200 })
    @IsNumber()
    @Min(1)
    capacity: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    contactName?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    contactPhone?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    facilities?: string[];
}

export class ActivateShelterDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    missionSessionId?: string;
}

export class ShelterResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    type: ShelterType;

    @ApiProperty()
    address: string;

    @ApiProperty()
    capacity: number;

    @ApiProperty()
    currentOccupancy: number;

    @ApiProperty()
    status: ShelterStatus;

    @ApiProperty()
    occupancyRate: number;
}

// ==================== Evacuee DTOs ====================

export class CheckInEvacueeDto {
    @ApiProperty({ example: '王小明' })
    @IsString()
    name: string;

    @ApiPropertyOptional({ example: 'A123456789' })
    @IsOptional()
    @IsString()
    idNumber?: string;

    @ApiPropertyOptional({ example: 35 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(150)
    age?: number;

    @ApiPropertyOptional({ example: 'M' })
    @IsOptional()
    @IsString()
    gender?: string;

    @ApiPropertyOptional({ example: '0912345678' })
    @IsOptional()
    @IsString()
    phone?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    emergencyContact?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    emergencyPhone?: string;

    @ApiPropertyOptional({ type: [String], enum: SpecialNeeds })
    @IsOptional()
    @IsArray()
    specialNeeds?: SpecialNeeds[];
}

export class EvacueeResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    queryCode: string;

    @ApiProperty()
    status: string;

    @ApiPropertyOptional()
    bedAssignment?: string;

    @ApiPropertyOptional()
    specialNeeds?: SpecialNeeds[];

    @ApiProperty()
    checkedInAt: string;
}

// ==================== Health Screening DTOs ====================

export class HealthScreeningDto {
    @ApiPropertyOptional({ example: 36.5 })
    @IsOptional()
    @IsNumber()
    temperature?: number;

    @ApiPropertyOptional({ example: '120/80' })
    @IsOptional()
    @IsString()
    bloodPressure?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    symptoms?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    medications?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    allergies?: string;

    @ApiPropertyOptional()
    @IsOptional()
    requiresImmediateAttention?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

// ==================== Bed Assignment DTOs ====================

export class AssignBedDto {
    @ApiProperty({ example: 'A-12' })
    @IsString()
    bedAssignment: string;
}

// ==================== Daily Report DTOs ====================

export class CreateDailyReportDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    supplyStatus?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    issues?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    needs?: string;
}

export class DailyReportResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    reportDate: string;

    @ApiProperty()
    totalEvacuees: number;

    @ApiProperty()
    newArrivals: number;

    @ApiProperty()
    departures: number;

    @ApiProperty()
    medicalCases: number;
}

// ==================== Query DTOs ====================

export class QueryEvacueeDto {
    @ApiProperty({ example: 'QC-ABC123' })
    @IsString()
    queryCode: string;
}

export class EvacueeQueryResultDto {
    @ApiProperty()
    found: boolean;

    @ApiPropertyOptional()
    shelterName?: string;

    @ApiPropertyOptional()
    shelterAddress?: string;

    @ApiPropertyOptional()
    evacueeStatus?: string;

    @ApiPropertyOptional()
    checkedInAt?: string;
}
