import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    ArrayMinSize,
    Equals,
    IsArray,
    IsDefined,
    IsEnum,
    IsInt,
    IsLatitude,
    IsLongitude,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SectorStatus, SectorType } from '../entities/sector.entity';
import { RallyPointStatus, RallyPointType } from '../entities/rally-point.entity';
import { RouteStatus, RouteType } from '../entities/planned-route.entity';

/**
 * COP 地圖派遣（map-dispatch）端點的輸入驗證。
 *
 * 這個 controller 是「地圖即操作」：建立責任區、集結點、路徑與框選派遣
 * 都會直接產生實地任務並指派小隊。原本 9 個 `@Body()` 全是行內型別，
 * 編譯後沒有 metatype，全域 ValidationPipe 不會執行——
 * 座標、enum 狀態、優先度全部沒有檢查，錯誤的 GeoJSON 會直接寫進 PostGIS 欄位。
 */

const MAX_TEXT = 5000;
/** 單一幾何圖形的座標點上限：擋掉超大 polygon 造成的 DB/前端負擔 */
const MAX_COORDS = 10000;

export class PolygonGeometryDto {
    @ApiProperty({ enum: ['Polygon'] })
    @Equals('Polygon')
    type: 'Polygon';

    /**
     * GeoJSON Polygon：三層陣列（環 → 點 → [lng, lat]）。
     * class-validator 無法逐層描述，這裡驗證外層形狀與數量上限，
     * 座標值本身交給 PostGIS 的型別檢查。
     */
    @ApiProperty({ description: 'GeoJSON Polygon 座標（環 → 點 → [lng, lat]）' })
    @IsArray()
    @ArrayMinSize(1)
    @ArrayMaxSize(MAX_COORDS)
    coordinates: number[][][];
}

export class PointGeometryDto {
    @ApiProperty({ enum: ['Point'] })
    @Equals('Point')
    type: 'Point';

    @ApiProperty({ description: 'GeoJSON Point 座標 [lng, lat]' })
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsNumber({}, { each: true })
    coordinates: [number, number];
}

export class LineStringGeometryDto {
    @ApiProperty({ enum: ['LineString'] })
    @Equals('LineString')
    type: 'LineString';

    @ApiProperty({ description: 'GeoJSON LineString 座標（點 → [lng, lat]）' })
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(MAX_COORDS)
    coordinates: number[][];
}

export class WaypointDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    id: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @ApiProperty({ description: '[lng, lat]' })
    @IsArray()
    @ArrayMinSize(2)
    @ArrayMaxSize(2)
    @IsNumber({}, { each: true })
    coordinates: [number, number];

    @ApiProperty({ description: '排序' })
    @IsInt()
    @Min(0)
    order: number;

    @ApiPropertyOptional({ description: '距前一點的預估分鐘數' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    estimatedTime?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(MAX_TEXT)
    notes?: string;
}

export class CreateSectorDto {
    @ApiProperty({ description: '責任區代號' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(50)
    sectorCode: string;

    @ApiProperty({ description: '責任區名稱' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @ApiProperty({ enum: SectorType })
    @IsEnum(SectorType)
    sectorType: SectorType;

    @ApiProperty({ type: PolygonGeometryDto })
    @IsDefined()
    @ValidateNested()
    @Type(() => PolygonGeometryDto)
    geometry: PolygonGeometryDto;

    @ApiPropertyOptional({ description: '嚴重度 1-5' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    severity?: number;

    @ApiPropertyOptional({ description: '自由屬性（jsonb）', type: Object })
    @IsOptional()
    @IsObject()
    props?: Record<string, unknown>;
}

export class AssignTeamDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    teamId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    teamName: string;
}

export class UpdateSectorStatusDto {
    @ApiProperty({ enum: SectorStatus })
    @IsEnum(SectorStatus)
    status: SectorStatus;
}

export class CreateRallyPointDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @ApiProperty({ enum: RallyPointType })
    @IsEnum(RallyPointType)
    pointType: RallyPointType;

    @ApiProperty({ type: PointGeometryDto })
    @IsDefined()
    @ValidateNested()
    @Type(() => PointGeometryDto)
    geometry: PointGeometryDto;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(500)
    address?: string;

    @ApiPropertyOptional({ description: '可容納人數' })
    @IsOptional()
    @IsInt()
    @Min(0)
    capacity?: number;

    @ApiPropertyOptional({ description: '聯絡人姓名（個資）' })
    @IsOptional()
    @IsString()
    @MaxLength(100)
    contactName?: string;

    @ApiPropertyOptional({ description: '聯絡電話（個資）' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    contactPhone?: string;

    @ApiPropertyOptional({ description: '無線電頻道' })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    radioChannel?: string;

    @ApiPropertyOptional({ description: '自由屬性（jsonb）', type: Object })
    @IsOptional()
    @IsObject()
    props?: Record<string, unknown>;
}

export class UpdateRallyPointStatusDto {
    @ApiProperty({ enum: RallyPointStatus })
    @IsEnum(RallyPointStatus)
    status: RallyPointStatus;
}

export class CreateRouteDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @ApiProperty({ enum: RouteType })
    @IsEnum(RouteType)
    routeType: RouteType;

    @ApiProperty({ type: LineStringGeometryDto })
    @IsDefined()
    @ValidateNested()
    @Type(() => LineStringGeometryDto)
    geometry: LineStringGeometryDto;

    @ApiPropertyOptional({ type: [WaypointDto] })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(500)
    @ValidateNested({ each: true })
    @Type(() => WaypointDto)
    waypoints?: WaypointDto[];

    @ApiPropertyOptional({ description: '預估時間（分鐘）' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    estimatedTime?: number;

    @ApiPropertyOptional({ description: '預估距離（公尺）' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    estimatedDistance?: number;

    @ApiPropertyOptional({ description: '自由屬性（jsonb）', type: Object })
    @IsOptional()
    @IsObject()
    props?: Record<string, unknown>;
}

export class UpdateRouteStatusDto {
    @ApiProperty({ enum: RouteStatus })
    @IsEnum(RouteStatus)
    status: RouteStatus;
}

export class BboxDto {
    @ApiProperty()
    @IsLongitude()
    minLng: number;

    @ApiProperty()
    @IsLatitude()
    minLat: number;

    @ApiProperty()
    @IsLongitude()
    maxLng: number;

    @ApiProperty()
    @IsLatitude()
    maxLat: number;
}

export class DispatchFromBboxDto {
    @ApiProperty({ type: BboxDto, description: '框選範圍' })
    @IsDefined()
    @ValidateNested()
    @Type(() => BboxDto)
    bbox: BboxDto;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(128)
    teamId: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    teamName: string;

    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    taskTitle: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    @MaxLength(MAX_TEXT)
    taskDescription?: string;

    @ApiPropertyOptional({ description: '優先度' })
    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    priority?: number;
}

export class DispatchToSectorDto {
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    taskTitle: string;

    @ApiProperty()
    @IsString()
    @MaxLength(MAX_TEXT)
    taskDescription: string;
}
