import { IsString, IsOptional, IsEnum, IsObject, IsUUID } from 'class-validator';
import { MissionStatus } from '../entities/mission-session.entity';

export class CreateMissionSessionDto {
    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(MissionStatus)
    status?: MissionStatus;

    @IsOptional()
    @IsString()
    commanderId?: string;

    @IsOptional()
    @IsString()
    commanderName?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}

export class UpdateMissionSessionDto {
    @IsOptional()
    @IsString()
    title?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(MissionStatus)
    status?: MissionStatus;

    @IsOptional()
    @IsString()
    commanderId?: string;

    @IsOptional()
    @IsString()
    commanderName?: string;

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
