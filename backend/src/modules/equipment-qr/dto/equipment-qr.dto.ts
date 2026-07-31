import { Type } from 'class-transformer';
import {
    IsDate,
    IsEnum,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 維護類型（對應 EquipmentQrService.scheduleMaintenance 的 type 聯集）
 */
export enum MaintenanceType {
    ROUTINE = 'routine',
    REPAIR = 'repair',
    INSPECTION = 'inspection',
}

/**
 * 登錄新裝備
 *
 * 欄位對應 EquipmentQrService.registerEquipment()。
 * 起步寬鬆：僅 service 建立 Equipment 時直接取用的三個欄位為必填。
 * 後續可收緊：category 改 @IsEnum（待裝備類別常數表定案）。
 */
export class RegisterEquipmentDto {
    @ApiProperty({ description: '裝備名稱' })
    @IsString()
    name: string;

    @ApiProperty({ description: '裝備類別' })
    @IsString()
    category: string;

    @ApiProperty({ description: '存放位置' })
    @IsString()
    location: string;

    @ApiPropertyOptional({ description: '採購日期（ISO8601），預設為現在' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    purchasedAt?: Date;

    @ApiPropertyOptional({ description: '保固到期日（ISO8601）' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    warrantyUntil?: Date;

    /**
     * 自由形式擴充欄位：各單位裝備屬性差異大（序號、規格、廠牌…），
     * 刻意不建 DTO，僅驗證為物件並原樣儲存。
     */
    @ApiPropertyOptional({ description: '自由形式擴充屬性', type: Object })
    @IsOptional()
    @IsObject()
    metadata?: Record<string, unknown>;
}

/**
 * 排程維護
 *
 * 欄位對應 EquipmentQrService.scheduleMaintenance()。
 */
export class ScheduleMaintenanceDto {
    @ApiProperty({ description: '裝備 ID' })
    @IsString()
    equipmentId: string;

    @ApiProperty({ enum: MaintenanceType, description: '維護類型' })
    @IsEnum(MaintenanceType)
    type: MaintenanceType;

    @ApiProperty({ description: '排定維護時間（ISO8601）' })
    @Type(() => Date)
    @IsDate()
    scheduledAt: Date;

    @ApiPropertyOptional({ description: '負責人' })
    @IsOptional()
    @IsString()
    assignedTo?: string;

    @ApiPropertyOptional({ description: '備註' })
    @IsOptional()
    @IsString()
    notes?: string;
}
