import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEnum, IsNumber, IsOptional, IsArray, IsUUID, IsDateString, Min } from 'class-validator';
import { MobilizationPriority, ResponseStatus } from '../entities/mobilization.entity';

export class CreateMobilizationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    missionSessionId?: string;

    @ApiProperty({ example: '緊急支援信義區避難所' })
    @IsString()
    title: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({ enum: MobilizationPriority })
    @IsEnum(MobilizationPriority)
    priority: MobilizationPriority;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    longitude?: number;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    requiredSkills?: string[];

    @ApiProperty({ example: 10 })
    @IsNumber()
    @Min(1)
    requiredCount: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    startTime?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsDateString()
    endTime?: string;
}

export class RespondMobilizationDto {
    @ApiProperty({ enum: ['CONFIRMED', 'DECLINED'] })
    @IsEnum(ResponseStatus)
    status: ResponseStatus;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

export class CheckinDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    longitude?: number;
}

export class MobilizationResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    title: string;

    @ApiProperty()
    priority: MobilizationPriority;

    @ApiProperty()
    status: string;

    @ApiProperty()
    requiredCount: number;

    @ApiProperty()
    confirmedCount: number;

    @ApiProperty()
    checkedInCount: number;

    @ApiProperty()
    fulfillmentRate: number;
}

export class MobilizationStatsDto {
    @ApiProperty()
    total: number;

    @ApiProperty()
    active: number;

    @ApiProperty()
    totalRequired: number;

    @ApiProperty()
    totalConfirmed: number;

    @ApiProperty()
    totalCheckedIn: number;

    @ApiProperty()
    overallFulfillmentRate: number;
}
