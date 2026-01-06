import { IsString, IsNumber, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSosDto {
    @ApiProperty()
    @IsNumber()
    latitude: number;

    @ApiProperty()
    @IsNumber()
    longitude: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    accuracyM?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    message?: string;
}

export class AckSosDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    note?: string;
}

export class ResolveSosDto {
    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    resolutionNote?: string;
}

export enum LocationShareMode {
    OFF = 'off',
    MISSION = 'mission',
    SOS = 'sos',
}

export class StartLocationShareDto {
    @ApiProperty({ enum: LocationShareMode })
    @IsEnum(LocationShareMode)
    mode: LocationShareMode;
}

export class UpdateLocationDto {
    @ApiProperty()
    @IsNumber()
    latitude: number;

    @ApiProperty()
    @IsNumber()
    longitude: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    accuracyM?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    heading?: number;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    speed?: number;

    @ApiPropertyOptional({ description: 'Client timestamp (ISO8601)' })
    @IsString()
    @IsOptional()
    tsClient?: string;
}

export class TaskClaimDto {
    // No additional fields needed - user info from auth
}

export class TaskProgressDto {
    @ApiPropertyOptional({ minimum: 0, maximum: 100 })
    @IsNumber()
    @IsOptional()
    percent?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    status?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    note?: string;

    @ApiPropertyOptional({ description: 'Evidence attachment ID' })
    @IsString()
    @IsOptional()
    attachmentId?: string;
}
