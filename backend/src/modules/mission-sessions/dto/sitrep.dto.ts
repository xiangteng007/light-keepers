import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsDateString,
    IsInt,
    IsNotEmpty,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    MaxLength,
    Min,
    Validate,
    ValidateNested,
    ValidatorConstraint,
    ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * SITREP（情勢報告）端點的輸入驗證。
 *
 * 為什麼需要這些檔案：全域 ValidationPipe 只有在參數型別是「類別」時才會運作。
 * 這幾個端點原本寫成 `@Body() body: { periodStart: string; ... }`，
 * TypeScript 的行內型別在編譯後不留下 metatype，ValidationPipe 直接放行，
 * 等於這些端點完全沒有輸入驗證——包含會寫進傷亡數字（casualties）的更新端點。
 *
 * 巢狀陣列一律用 class + `@Type()` + `@ValidateNested({ each: true })`，
 * 否則 whitelist 不會下探到子物件，陣列元素仍可夾帶任意欄位。
 */

/** 上限值刻意寬鬆：只擋掉明顯異常的巨量輸入，不介入業務判斷 */
const MAX_ARRAY_ITEMS = 200;
const MAX_TEXT = 5000;

/**
 * 「值必須都是非負整數」的自由鍵值物件驗證。
 *
 * 不能用 `@IsNumber({}, { each: true })`——class-validator 的 `each`
 * 只會走訪陣列／Set／Map，對純物件不生效（實測會直接判定失敗）。
 * 傷亡統計的鍵名尚未定版，所以驗值不驗鍵。
 */
@ValidatorConstraint({ name: 'isNonNegativeNumberRecord', async: false })
class IsNonNegativeNumberRecordConstraint implements ValidatorConstraintInterface {
    validate(value: unknown): boolean {
        if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
        return Object.values(value as Record<string, unknown>).every(
            (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0,
        );
    }

    defaultMessage(): string {
        return '每個統計數字都必須是 0 以上的有限數值';
    }
}

export class KeyEventDto {
    @ApiProperty({ description: '事件時間（ISO 8601）' })
    @IsDateString()
    time: string;

    @ApiProperty({ description: '事件描述' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(MAX_TEXT)
    description: string;

    @ApiPropertyOptional({ description: '嚴重度 1-5' })
    @IsOptional()
    @IsInt()
    @Min(1)
    @Max(5)
    severity?: number;

    @ApiPropertyOptional({ description: '地點描述' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    location?: string;
}

export class ResourceStatusDto {
    @ApiProperty({ description: '資源類型' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    resourceType: string;

    @ApiProperty({ description: '可用數量' })
    @IsInt()
    @Min(0)
    available: number;

    @ApiProperty({ description: '已部署數量' })
    @IsInt()
    @Min(0)
    deployed: number;

    @ApiProperty({ description: '需求數量' })
    @IsInt()
    @Min(0)
    requested: number;

    @ApiPropertyOptional({ description: '備註' })
    @IsOptional()
    @IsString()
    @MaxLength(MAX_TEXT)
    notes?: string;
}

export class SitrepRequestItemDto {
    @ApiProperty({ description: '需求類型' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    type: string;

    @ApiProperty({ description: '需求描述' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(MAX_TEXT)
    description: string;

    @ApiProperty({ description: '優先度（數字越小越優先）' })
    @IsInt()
    @Min(0)
    @Max(100)
    priority: number;
}

/** POST /api/missions/:sessionId/sitrep */
export class CreateSitrepDto {
    @ApiPropertyOptional({ description: '所屬作戰週期 ID' })
    @IsOptional()
    @IsUUID()
    operationalPeriodId?: string;

    @ApiProperty({ description: '報告涵蓋期間起（ISO 8601）' })
    @IsDateString()
    periodStart: string;

    @ApiProperty({ description: '報告涵蓋期間迄（ISO 8601）' })
    @IsDateString()
    periodEnd: string;

    @ApiPropertyOptional({ description: '摘要' })
    @IsOptional()
    @IsString()
    @MaxLength(MAX_TEXT)
    summary?: string;
}

/** POST /api/missions/:sessionId/sitrep/generate */
export class GenerateSitrepDto {
    @ApiProperty({ description: '生成範圍起（ISO 8601）' })
    @IsDateString()
    periodStart: string;

    @ApiProperty({ description: '生成範圍迄（ISO 8601）' })
    @IsDateString()
    periodEnd: string;
}

/** PUT /api/missions/:sessionId/sitrep/:sitrepId */
export class UpdateSitrepDto {
    @ApiPropertyOptional({ description: '摘要' })
    @IsOptional()
    @IsString()
    @MaxLength(MAX_TEXT)
    summary?: string;

    @ApiPropertyOptional({ type: [KeyEventDto], description: '關鍵事件' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => KeyEventDto)
    keyEvents?: KeyEventDto[];

    @ApiPropertyOptional({ type: [ResourceStatusDto], description: '資源狀態' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => ResourceStatusDto)
    resourceStatus?: ResourceStatusDto[];

    /**
     * 傷亡統計是 jsonb 的自由鍵值（輕傷/重傷/死亡/失聯…分類尚未定版），
     * 因此只驗證「物件，且每個值都是非負數字」，不鎖定鍵名。
     */
    @ApiPropertyOptional({ description: '傷亡統計（分類 → 人數）', type: Object })
    @IsOptional()
    @IsObject()
    @Validate(IsNonNegativeNumberRecordConstraint)
    casualties?: Record<string, number>;

    @ApiPropertyOptional({ type: [String], description: '後續行動' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @IsString({ each: true })
    @MaxLength(MAX_TEXT, { each: true })
    nextActions?: string[];

    @ApiPropertyOptional({ type: [SitrepRequestItemDto], description: '支援需求' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => SitrepRequestItemDto)
    requests?: SitrepRequestItemDto[];
}
