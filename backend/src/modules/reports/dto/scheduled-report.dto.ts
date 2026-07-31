import {
    IsArray,
    IsIn,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SCHEDULED_REPORT_TYPES = [
    'daily_summary',
    'weekly_digest',
    'monthly_report',
    'custom',
] as const;

export const SCHEDULED_REPORT_FORMATS = ['pdf', 'csv', 'json'] as const;

/**
 * 建立排程報表（POST /reports/scheduler）
 *
 * `schedule` 為 cron 表達式，會被直接交給 `new CronJob(...)`；
 * 目前 service 只在 catch 內記錄錯誤，不會回報給呼叫端，
 * 因此入口驗證有其必要。此處起步僅要求非空字串
 * （cron 語法本身的驗證留待後續收緊，避免誤擋既有排程格式）。
 *
 * `filters` 目前不被 service 讀取（reports 模組全域搜尋僅有 controller 的
 * 指派），無可推導的子結構，維持自由鍵值物件。
 */
export class CreateScheduledReportDto {
    @ApiProperty({ description: '排程名稱' })
    @IsString()
    @IsNotEmpty()
    name: string;

    @ApiPropertyOptional({ enum: SCHEDULED_REPORT_TYPES, description: '報表類型，預設 custom' })
    @IsOptional()
    @IsIn(SCHEDULED_REPORT_TYPES as unknown as string[])
    type?: 'daily_summary' | 'weekly_digest' | 'monthly_report' | 'custom';

    @ApiProperty({ description: 'cron 表達式' })
    @IsString()
    @IsNotEmpty()
    schedule: string;

    @ApiProperty({ type: [String], description: '收件者（帳號 ID 或 email）' })
    @IsArray()
    @IsString({ each: true })
    recipients: string[];

    @ApiPropertyOptional({ enum: SCHEDULED_REPORT_FORMATS, description: '輸出格式，預設 pdf' })
    @IsOptional()
    @IsIn(SCHEDULED_REPORT_FORMATS as unknown as string[])
    format?: 'pdf' | 'csv' | 'json';

    /** 目前為未使用的透傳欄位，保留以相容既有呼叫端。 */
    @ApiPropertyOptional({ description: '報表篩選條件（自由鍵值，目前未被讀取）', type: Object })
    @IsOptional()
    @IsObject()
    filters?: Record<string, unknown>;
}
