import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsNumber, IsBoolean, IsOptional, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CoordinateDto {
    @ApiProperty({ description: '緯度', example: 25.033 })
    @IsNumber()
    lat: number;

    @ApiProperty({ description: '經度', example: 121.565 })
    @IsNumber()
    lng: number;
}

export class CreateGeofenceDto {
    @ApiProperty({ description: '圍欄名稱', example: '信義區災區' })
    @IsString()
    name: string;

    @ApiProperty({ description: '圍欄類型', enum: ['disaster_zone', 'danger_zone', 'shelter', 'checkpoint', 'custom'] })
    @IsString()
    type: 'disaster_zone' | 'danger_zone' | 'shelter' | 'checkpoint' | 'custom';

    @ApiProperty({ description: '形狀', enum: ['circle', 'polygon'] })
    @IsString()
    shape: 'circle' | 'polygon';

    @ApiPropertyOptional({ description: '圓心座標 (shape=circle 時必填)' })
    @ValidateNested()
    @Type(() => CoordinateDto)
    @IsOptional()
    center?: CoordinateDto;

    @ApiPropertyOptional({ description: '半徑 (公尺，shape=circle 時必填)', example: 1000 })
    @IsNumber()
    @IsOptional()
    radius?: number;

    @ApiPropertyOptional({ description: '多邊形頂點 (shape=polygon 時必填)' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => CoordinateDto)
    @IsOptional()
    vertices?: CoordinateDto[];

    @ApiProperty({ description: '進入時發送警報', default: true })
    @IsBoolean()
    alertOnEnter: boolean;

    @ApiProperty({ description: '離開時發送警報', default: true })
    @IsBoolean()
    alertOnExit: boolean;

    @ApiPropertyOptional({ description: '危險等級', enum: ['low', 'medium', 'high', 'critical'] })
    @IsString()
    @IsOptional()
    dangerLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export class UpdateLocationDto {
    @ApiProperty({ description: '使用者ID', example: 'user-123' })
    @IsString()
    userId: string;

    @ApiProperty({ description: '緯度', example: 25.033 })
    @IsNumber()
    lat: number;

    @ApiProperty({ description: '經度', example: 121.565 })
    @IsNumber()
    lng: number;
}

export class GeofenceResponseDto {
    @ApiProperty()
    id: string;

    @ApiProperty()
    name: string;

    @ApiProperty()
    type: string;

    @ApiProperty()
    status: string;

    @ApiProperty()
    createdAt: Date;
}
