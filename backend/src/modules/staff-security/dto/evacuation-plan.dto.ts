import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsIn,
    IsLatitude,
    IsLongitude,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const EVACUATION_TRIGGER_TYPES = [
    'earthquake',
    'flood',
    'fire',
    'civil_unrest',
    'security_threat',
    'other',
] as const;

/** 撤離啟動條件 */
export class EvacuationTriggerDto {
    @ApiProperty({ enum: EVACUATION_TRIGGER_TYPES, description: '觸發災害類型' })
    @IsIn(EVACUATION_TRIGGER_TYPES as unknown as string[])
    type: 'earthquake' | 'flood' | 'fire' | 'civil_unrest' | 'security_threat' | 'other';

    @ApiPropertyOptional({ description: '啟動門檻描述（如震度 5 級以上）' })
    @IsOptional()
    @IsString()
    threshold?: string;

    @ApiProperty({ type: [String], description: '有權下達撤離令的人員' })
    @IsArray()
    @IsString({ each: true })
    authorizedBy: string[];
}

/** 撤離路線航點 */
export class EvacuationWaypointDto {
    @ApiProperty({ description: '緯度' })
    @IsLatitude()
    lat: number;

    @ApiProperty({ description: '經度' })
    @IsLongitude()
    lon: number;

    @ApiPropertyOptional({ description: '航點說明' })
    @IsOptional()
    @IsString()
    description?: string;
}

/** 撤離路線 */
export class EvacuationRouteDto {
    @ApiProperty({ description: '路線 ID（由呼叫端指定）' })
    @IsString()
    id: string;

    @ApiProperty({ description: '路線名稱' })
    @IsString()
    name: string;

    @ApiProperty({ description: '是否為主要路線' })
    @IsBoolean()
    primary: boolean;

    @ApiProperty({ type: [EvacuationWaypointDto], description: '路線航點' })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EvacuationWaypointDto)
    waypoints: EvacuationWaypointDto[];

    @ApiProperty({ description: '預估耗時（分鐘）' })
    @IsNumber()
    @Min(0)
    estimatedTimeMinutes: number;

    @ApiPropertyOptional({ description: '路線適用條件/限制' })
    @IsOptional()
    @IsString()
    conditions?: string;
}

/**
 * 集結點
 *
 * latitude/longitude 會進入 haversineDistance() 計算最近集結點，
 * 非數值會產生 NaN 距離並選出任意點，故以 @IsLatitude/@IsLongitude 嚴格驗證。
 */
export class AssemblyPointDto {
    @ApiProperty({ description: '集結點 ID' })
    @IsString()
    id: string;

    @ApiProperty({ description: '集結點名稱' })
    @IsString()
    name: string;

    @ApiProperty({ description: '緯度' })
    @IsLatitude()
    latitude: number;

    @ApiProperty({ description: '經度' })
    @IsLongitude()
    longitude: number;

    @ApiProperty({ description: '容納人數' })
    @IsNumber()
    @Min(0)
    capacity: number;

    @ApiProperty({ type: [String], description: '現場設施' })
    @IsArray()
    @IsString({ each: true })
    facilities: string[];

    @ApiProperty({ type: [String], description: '聯絡窗口' })
    @IsArray()
    @IsString({ each: true })
    contacts: string[];
}

/** 緊急聯絡人 */
export class EmergencyContactDto {
    @ApiProperty({ description: '姓名' })
    @IsString()
    name: string;

    @ApiProperty({ description: '角色/職務' })
    @IsString()
    role: string;

    @ApiProperty({ description: '電話' })
    @IsString()
    phone: string;

    @ApiPropertyOptional({ description: 'Email' })
    @IsOptional()
    @IsString()
    email?: string;

    @ApiProperty({ description: '是否 24 小時可聯繫' })
    @IsBoolean()
    available24h: boolean;
}

/**
 * 撤離計畫內容（對應 Partial<EvacuationPlan>）
 *
 * id / locationId / createdAt / updatedAt 皆由 service 產生，
 * 故不列入白名單。其餘欄位 service 都有預設值（名稱自動生成、陣列預設 []），
 * 因此全部選填。
 */
export class EvacuationPlanDataDto {
    @ApiPropertyOptional({ description: '計畫名稱，未提供時由伺服器生成' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ type: [EvacuationTriggerDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EvacuationTriggerDto)
    triggers?: EvacuationTriggerDto[];

    @ApiPropertyOptional({ type: [EvacuationRouteDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EvacuationRouteDto)
    routes?: EvacuationRouteDto[];

    @ApiPropertyOptional({ type: [AssemblyPointDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AssemblyPointDto)
    assemblyPoints?: AssemblyPointDto[];

    @ApiPropertyOptional({ type: [EmergencyContactDto] })
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => EmergencyContactDto)
    contacts?: EmergencyContactDto[];
}

/**
 * 建立撤離計畫（POST /api/v1/staff-security/evacuation/plans）
 */
export class CreateEvacuationPlanDto {
    @ApiProperty({ description: '據點 ID' })
    @IsString()
    locationId: string;

    @ApiProperty({ type: EvacuationPlanDataDto, description: '計畫內容' })
    @ValidateNested()
    @Type(() => EvacuationPlanDataDto)
    plan: EvacuationPlanDataDto;
}
