import { Type } from 'class-transformer';
import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsDate,
    IsNumber,
    IsOptional,
    IsString,
    Min,
    ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 單筆出勤資料（對應 PayrollService 的 ShiftData）
 *
 * `date` 必須轉為 Date 物件：PayrollService.isWeekend() 會呼叫
 * `date.getDay()`、月度彙總會呼叫 `.getMonth()` / `.getFullYear()`。
 * 原本 calculate-monthly 端點直接把 JSON 字串傳進 service，
 * 會在執行期拋 `date.getDay is not a function`；
 * 加上 @Type(() => Date) 後由 ValidationPipe 完成轉型，順帶修掉該缺陷。
 */
export class ShiftDataDto {
    @ApiProperty({ description: '出勤日期（ISO8601）' })
    @Type(() => Date)
    @IsDate()
    date: Date;

    @ApiProperty({ description: '開始時間（HH:mm）' })
    @IsString()
    startTime: string;

    @ApiProperty({ description: '結束時間（HH:mm）' })
    @IsString()
    endTime: string;

    @ApiProperty({ description: '時數' })
    @IsNumber()
    @Min(0)
    hours: number;

    @ApiPropertyOptional({ description: '是否為危險作業（適用危險加給）' })
    @IsOptional()
    @IsBoolean()
    hazardous?: boolean;
}

/**
 * 計算月度薪資
 */
export class CalculateMonthlyPayrollDto {
    @ApiProperty({ type: [ShiftDataDto], description: '當月出勤明細' })
    @IsArray()
    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => ShiftDataDto)
    shifts: ShiftDataDto[];
}

/**
 * 更新補助費率（對應 Partial<PayrollRates>）
 *
 * service 以 `Object.assign(this.rates, updates)` 無過濾合併至費率單例，
 * 白名單在此特別重要。全部欄位選填（部分更新）。
 * 加給類欄位為倍率（語意上 >= 1），其餘為 TWD 金額，一律要求非負。
 */
export class UpdatePayrollRatesDto {
    @ApiPropertyOptional({ description: '基本時薪（TWD），預設 200' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    baseHourlyRate?: number;

    @ApiPropertyOptional({ description: '夜班倍率，預設 1.5' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    nightBonus?: number;

    @ApiPropertyOptional({ description: '假日倍率，預設 1.25' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    weekendBonus?: number;

    @ApiPropertyOptional({ description: '危險加給倍率，預設 2.0' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    hazardBonus?: number;

    @ApiPropertyOptional({ description: '誤餐費（TWD），預設 100' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    mealAllowance?: number;

    @ApiPropertyOptional({ description: '交通補助（TWD），預設 150' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    transportAllowance?: number;
}
