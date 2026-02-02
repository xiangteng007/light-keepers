import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, IsUUID, Min, Max } from 'class-validator';
import { SafetyLevel, StructureType } from '../entities/structural-assessment.entity';

export class CreateStructuralAssessmentDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    missionSessionId?: string;

    @ApiProperty({ example: '台北市信義區松仁路100號' })
    @IsString()
    address: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    longitude?: number;

    @ApiProperty({ enum: StructureType })
    @IsEnum(StructureType)
    structureType: StructureType;

    @ApiPropertyOptional({ example: 5 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(200)
    floors?: number;

    @ApiPropertyOptional({ example: 50 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    estimatedOccupants?: number;

    @ApiProperty({ enum: SafetyLevel })
    @IsEnum(SafetyLevel)
    safetyLevel: SafetyLevel;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    hasCollapse?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    hasFireDamage?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    hasGasLeak?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    hasWaterDamage?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    hasElectricalHazard?: boolean;

    @ApiPropertyOptional({ example: 5 })
    @IsOptional()
    @IsNumber()
    @Min(0)
    estimatedTrapped?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    structuralNotes?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    accessPoints?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    hazards?: string[];

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    recommendations?: string;
}

export class UpdateAssessmentDto {
    @ApiPropertyOptional({ enum: SafetyLevel })
    @IsOptional()
    @IsEnum(SafetyLevel)
    safetyLevel?: SafetyLevel;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    confirmedTrapped?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    @Min(0)
    rescued?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    structuralNotes?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    requiresReassessment?: boolean;
}

export class StructuralAssessmentResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    address: string;

    @ApiProperty()
    structureType: StructureType;

    @ApiProperty()
    safetyLevel: SafetyLevel;

    @ApiProperty()
    hasCollapse: boolean;

    @ApiProperty()
    estimatedTrapped: number;

    @ApiProperty()
    confirmedTrapped: number;

    @ApiProperty()
    rescued: number;

    @ApiProperty()
    assessedBy: string;

    @ApiProperty()
    assessedAt: string;
}
