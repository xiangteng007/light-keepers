import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Map Package Response DTO
 */
export class MapPackageDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty({ description: 'Package type: basemap, terrain, contours, aoi' })
    type: string;

    @ApiPropertyOptional()
    region?: string;

    @ApiProperty()
    fileUrl: string;

    @ApiProperty()
    fileSize: number;

    @ApiProperty()
    sha256: string;

    @ApiProperty()
    version: string;

    @ApiProperty()
    publishedAt: Date;

    @ApiProperty()
    metadata: Record<string, any>;
}

/**
 * Package Recommendation DTO
 */
export class PackageRecommendationDto {
    @ApiProperty()
    package: MapPackageDto;

    @ApiProperty({ description: 'Recommendation reason' })
    reason: string;

    @ApiProperty({ description: 'Priority: 1 = must have, 2 = recommended, 3 = optional' })
    priority: number;
}

/**
 * Package Manifest DTO
 */
export class PackageManifestDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    version: string;

    @ApiProperty()
    fileUrl: string;

    @ApiProperty()
    fileSize: number;

    @ApiProperty()
    sha256: string;

    @ApiProperty({ description: 'Bounds: [minLng, minLat, maxLng, maxLat]' })
    bounds: [number, number, number, number];

    @ApiProperty({ description: 'Min zoom level' })
    minZoom: number;

    @ApiProperty({ description: 'Max zoom level' })
    maxZoom: number;

    @ApiProperty({ description: 'Tile format: mvt, pbf, png' })
    format: string;
}
