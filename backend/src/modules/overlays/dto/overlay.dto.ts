import {
    IsEnum,
    IsString,
    IsOptional,
    IsObject,
    IsInt,
    IsBoolean,
    IsUUID,
    Min,
    Max,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { OverlayType, OverlayState, HazardStatus } from '../entities/mission-overlay.entity';

/**
 * GeoJSON Geometry DTO
 */
export class GeoJsonGeometryDto {
    @ApiProperty({ example: 'Polygon' })
    @IsString()
    type: string;

    @ApiProperty({ example: [[[121.5, 25.0], [121.6, 25.0], [121.6, 25.1], [121.5, 25.1], [121.5, 25.0]]] })
    @IsObject()
    coordinates: any;
}

/**
 * Create Overlay DTO
 */
export class CreateOverlayDto {
    @ApiProperty({ enum: OverlayType, example: 'poi' })
    @IsEnum(OverlayType)
    type: OverlayType;

    @ApiPropertyOptional({ example: 'POI-001' })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({ example: '台北車站避難所' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({ description: 'GeoJSON geometry' })
    @IsObject()
    @ValidateNested()
    @Type(() => GeoJsonGeometryDto)
    geometry: GeoJsonGeometryDto;

    // Hazard-specific
    @ApiPropertyOptional({ example: 'flood' })
    @IsOptional()
    @IsString()
    hazardType?: string;

    @ApiPropertyOptional({ example: 3, minimum: 0, maximum: 4 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(4)
    severity?: number;

    @ApiPropertyOptional({ enum: HazardStatus })
    @IsOptional()
    @IsEnum(HazardStatus)
    hazardStatus?: HazardStatus;

    @ApiPropertyOptional({ example: 85, minimum: 0, maximum: 100 })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    confidence?: number;

    // POI-specific
    @ApiPropertyOptional({ example: 'shelter' })
    @IsOptional()
    @IsString()
    poiType?: string;

    @ApiPropertyOptional({ example: 500 })
    @IsOptional()
    @IsInt()
    capacity?: number;

    // Location reference
    @ApiPropertyOptional()
    @IsOptional()
    @IsUUID()
    locationId?: string;

    @ApiPropertyOptional({ default: false })
    @IsOptional()
    @IsBoolean()
    followLocation?: boolean;

    // Flexible props
    @ApiPropertyOptional({ example: { phone: '02-1234-5678' } })
    @IsOptional()
    @IsObject()
    props?: Record<string, any>;
}

/**
 * Update Overlay DTO
 */
export class UpdateOverlayDto extends PartialType(CreateOverlayDto) {
    @ApiProperty({ description: 'Version for optimistic locking', example: 1 })
    @IsInt()
    version: number;
}

/**
 * Overlay Response DTO
 */
export class OverlayDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    sessionId: string;

    @ApiProperty({ enum: OverlayType })
    type: OverlayType;

    @ApiPropertyOptional()
    code?: string;

    @ApiPropertyOptional()
    name?: string;

    @ApiProperty()
    geometry: GeoJsonGeometryDto;

    @ApiPropertyOptional()
    hazardType?: string;

    @ApiPropertyOptional()
    severity?: number;

    @ApiPropertyOptional({ enum: HazardStatus })
    hazardStatus?: HazardStatus;

    @ApiPropertyOptional()
    confidence?: number;

    @ApiPropertyOptional()
    poiType?: string;

    @ApiPropertyOptional()
    capacity?: number;

    @ApiPropertyOptional()
    locationId?: string;

    @ApiProperty()
    followLocation: boolean;

    @ApiProperty()
    props: Record<string, any>;

    @ApiProperty({ enum: OverlayState })
    state: OverlayState;

    @ApiProperty()
    version: number;

    @ApiProperty()
    createdBy: string;

    @ApiProperty()
    updatedBy: string;

    @ApiProperty()
    createdAt: Date;

    @ApiProperty()
    updatedAt: Date;

    // Lock info (populated when queried)
    @ApiPropertyOptional()
    lockedBy?: string;

    @ApiPropertyOptional()
    lockedUntil?: Date;
}

/**
 * Query Overlays DTO
 */
export class QueryOverlaysDto {
    @ApiPropertyOptional({ description: 'Cursor for incremental sync (ISO timestamp)' })
    @IsOptional()
    @IsString()
    since?: string;

    @ApiPropertyOptional({ enum: OverlayType })
    @IsOptional()
    @IsEnum(OverlayType)
    type?: OverlayType;

    @ApiPropertyOptional({ enum: OverlayState })
    @IsOptional()
    @IsEnum(OverlayState)
    state?: OverlayState;

    @ApiPropertyOptional({ description: 'Include removed overlays', default: false })
    @IsOptional()
    @IsBoolean()
    includeRemoved?: boolean;
}
