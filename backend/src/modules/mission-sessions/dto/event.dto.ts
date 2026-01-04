import { IsString, IsOptional, IsEnum, IsObject, IsUUID, IsArray } from 'class-validator';
import { EventType } from '../entities/event.entity';

export class CreateEventDto {
    @IsUUID()
    sessionId: string;

    @IsString()
    title: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsEnum(EventType)
    type?: EventType;

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
