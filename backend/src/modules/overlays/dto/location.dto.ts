import {
    IsString,
    IsOptional,
    IsObject,
    IsInt,
    IsBoolean,
    IsArray,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Location Response DTO
 */
export class LocationDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    source: string;

    @ApiPropertyOptional()
    sourceId?: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    category: string;

    @ApiProperty()
    geometry: { type: 'Point'; coordinates: [number, number] };

    @ApiPropertyOptional()
    address?: string;

    @ApiPropertyOptional()
    city?: string;

    @ApiPropertyOptional()
    district?: string;

    @ApiProperty()
    props: Record<string, any>;

    @ApiProperty()
    version: number;

    @ApiProperty()
    updatedAt: Date;

    @ApiPropertyOptional()
    aliases?: string[];
}

/**
 * Search Locations Query DTO
 */
export class SearchLocationsDto {
    @ApiProperty({ description: 'Search query string' })
    @IsString()
    q: string;

    @ApiPropertyOptional({ description: 'Filter by category' })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({ description: 'Bounding box: minLng,minLat,maxLng,maxLat' })
    @IsOptional()
    @IsString()
    bbox?: string;

    @ApiPropertyOptional({ description: 'Maximum results', default: 20 })
    @IsOptional()
    @IsInt()
    @Min(1)
    limit?: number;
}

/**
 * Get Location Changes DTO
 */
export class GetLocationChangesDto {
    @ApiProperty({ description: 'ISO timestamp for incremental sync' })
    @IsString()
    since: string;
}

/**
 * Import Locations DTO
 */
export class ImportLocationsDto {
    @ApiProperty({ description: 'Source identifier' })
    @IsString()
    source: string;

    @ApiProperty({ description: 'Array of location data' })
    @IsArray()
    locations: Array<{
        sourceId?: string;
        name: string;
        category: string;
        longitude: number;
        latitude: number;
        address?: string;
        city?: string;
        district?: string;
        props?: Record<string, any>;
        aliases?: string[];
    }>;

    @ApiPropertyOptional({ description: 'Update existing locations by sourceId', default: true })
    @IsOptional()
    @IsBoolean()
    upsert?: boolean;
}
