import { IsString, IsOptional, IsNumber, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateEventDto {
    @IsString()
    title: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(5)
    severity?: number;

    @IsString()
    @IsOptional()
    address?: string;

    @IsString()
    @IsOptional()
    adminCode?: string;

    @IsNumber()
    @IsOptional()
    latitude?: number;

    @IsNumber()
    @IsOptional()
    longitude?: number;

    @IsString()
    @IsOptional()
    @IsIn(['active', 'resolved', 'archived'])
    status?: string;
}

export class UpdateEventDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @IsNumber()
    @IsOptional()
    @Min(1)
    @Max(5)
    severity?: number;

    @IsString()
    @IsOptional()
    @IsIn(['active', 'resolved', 'archived'])
    status?: string;

    @IsString()
    @IsOptional()
    address?: string;
}

export class EventQueryDto {
    @IsString()
    @IsOptional()
    status?: string;

    @IsString()
    @IsOptional()
    category?: string;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    severity?: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    limit?: number;

    @Type(() => Number)
    @IsNumber()
    @IsOptional()
    offset?: number;
}
