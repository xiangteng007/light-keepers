import { IsString, IsOptional, IsEnum, IsObject, IsUUID, IsArray } from 'class-validator';
import { MissionEventType } from '../entities/event.entity';

export class CreateEventDto {
    @IsUUID()
    sessionId: string;

    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(MissionEventType)
    type?: MissionEventType;

    @IsOptional()
    @IsString()
    reporterId?: string;

    @IsOptional()
    @IsString()
    reporterName?: string;

    @IsOptional()
    @IsArray()
    location?: number[];

    @IsOptional()
    @IsObject()
    metadata?: Record<string, any>;
}
