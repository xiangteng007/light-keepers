import { IsString, IsNumber, IsOptional, IsEnum, IsBoolean, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AttachmentKind {
    PHOTO = 'photo',
    VIDEO = 'video',
    FILE = 'file',
}

export enum LocationSource {
    EXIF = 'exif',
    DEVICE = 'device',
    MANUAL = 'manual',
    UNKNOWN = 'unknown',
}

export class InitiateUploadDto {
    @ApiProperty({ enum: AttachmentKind })
    @IsEnum(AttachmentKind)
    kind: AttachmentKind;

    @ApiProperty()
    @IsString()
    mime: string;

    @ApiProperty()
    @IsNumber()
    size: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    sha256?: string;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    originalFilename?: string;

    @ApiPropertyOptional({ description: 'Photo capture timestamp (ISO8601)' })
    @IsString()
    @IsOptional()
    capturedAt?: string;

    @ApiPropertyOptional({ description: 'Photo latitude' })
    @IsNumber()
    @IsOptional()
    photoLatitude?: number;

    @ApiPropertyOptional({ description: 'Photo longitude' })
    @IsNumber()
    @IsOptional()
    photoLongitude?: number;

    @ApiPropertyOptional({ description: 'Photo GPS accuracy' })
    @IsNumber()
    @IsOptional()
    photoAccuracyM?: number;

    @ApiProperty({ enum: LocationSource })
    @IsEnum(LocationSource)
    locationSource: LocationSource;

    @ApiPropertyOptional({ description: 'Display photo on map layer', default: false })
    @IsBoolean()
    @IsOptional()
    showOnMap?: boolean;

    @ApiPropertyOptional({ description: 'Minimal EXIF data' })
    @IsObject()
    @IsOptional()
    exifJson?: Record<string, any>;
}

export class CompleteUploadDto {
    @ApiProperty()
    @IsBoolean()
    success: boolean;

    @ApiPropertyOptional()
    @IsNumber()
    @IsOptional()
    finalSize?: number;

    @ApiPropertyOptional()
    @IsString()
    @IsOptional()
    sha256?: string;
}

export class PhotoEvidenceQueryDto {
    @ApiPropertyOptional({ description: 'Bounding box: minLng,minLat,maxLng,maxLat' })
    @IsString()
    @IsOptional()
    bbox?: string;

    @ApiPropertyOptional({ description: 'Cursor for incremental sync' })
    @IsString()
    @IsOptional()
    since?: string;

    @ApiPropertyOptional({ default: 500 })
    @IsNumber()
    @IsOptional()
    limit?: number;
}
