import { Type } from 'class-transformer';
import {
    IsArray,
    IsBoolean,
    IsDateString,
    IsEnum,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { SphereStandardCategory } from '../services/sphere-standards.service';

/**
 * HXL 匯出選項（對應 HxlExportService 的 HxlExportOptions）
 */
export class HxlExportOptionsDto {
    @ApiProperty({ enum: ['csv', 'json'], description: '匯出格式' })
    @IsEnum(['csv', 'json'])
    format: 'csv' | 'json';

    @ApiProperty({ description: '是否輸出表頭' })
    @IsBoolean()
    includeHeaders: boolean;

    /** 目前 service 未讀取此欄位，保留以相容既有呼叫端。 */
    @ApiPropertyOptional({ description: '日期格式（尚未實作）' })
    @IsOptional()
    @IsString()
    dateFormat?: string;
}

/**
 * 3W 報告期間
 */
export class ReportingPeriodDto {
    @ApiProperty({ description: '起始日期（ISO8601）' })
    @IsDateString()
    start: string;

    @ApiProperty({ description: '結束日期（ISO8601）' })
    @IsDateString()
    end: string;
}

/**
 * HXL：匯出災情報告
 *
 * `reports` 刻意維持 `Record<string, unknown>[]` 而非巢狀 DTO：
 * 這是「呼叫端既有物件原樣轉出」的匯出端點，項目形狀由上游資料源決定
 * （HxlExportService 的欄位讀取全部帶 fallback，缺欄位不會拋錯）。
 * 若在此鎖定巢狀欄位白名單，forbidNonWhitelisted 會把呼叫端多帶的欄位
 * 全部擋成 400。改以「外層信封嚴格驗證 + 項目僅驗證為物件」折衷；
 * 端點本身另有 CoreJwtGuard + UnifiedRolesGuard 保護。
 */
export class ExportReportsHxlDto {
    @ApiProperty({ description: '待匯出的災情報告清單', type: [Object] })
    @IsArray()
    @IsObject({ each: true })
    reports: Record<string, unknown>[];

    @ApiPropertyOptional({ type: HxlExportOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => HxlExportOptionsDto)
    options?: HxlExportOptionsDto;
}

/**
 * HXL：匯出物資發放紀錄（`distributions` 為原樣轉出，理由同上）
 */
export class ExportResourcesHxlDto {
    @ApiProperty({ description: '待匯出的物資發放紀錄清單', type: [Object] })
    @IsArray()
    @IsObject({ each: true })
    distributions: Record<string, unknown>[];

    @ApiPropertyOptional({ type: HxlExportOptionsDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => HxlExportOptionsDto)
    options?: HxlExportOptionsDto;
}

/**
 * IATI：任務地點（IatiReportingService 讀取的欄位）
 */
export class IatiMissionLocationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    address?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    latitude?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    longitude?: number;
}

/**
 * IATI：產生任務 XML
 *
 * 欄位取自 IatiReportingService.generateIatiXml() 實際讀取的路徑。
 * 除 `id` 外全部選填（service 對每個欄位都有 fallback），
 * name/title 與 startTime/createdAt 各為擇一的別名組。
 * 後續可收緊：status 改 @IsEnum（planning/active/standby/completed/cancelled）。
 */
export class GenerateIatiXmlDto {
    @ApiProperty({ description: '任務 ID（組成 IATI identifier）' })
    @IsString()
    id: string;

    @ApiPropertyOptional({ description: '任務名稱（與 title 擇一）' })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ description: '任務標題（name 的別名）' })
    @IsOptional()
    @IsString()
    title?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    description?: string;

    @ApiPropertyOptional({ description: 'planning/active/standby/completed/cancelled，其餘視為執行中' })
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: '開始時間（ISO8601，與 createdAt 擇一）' })
    @IsOptional()
    @IsDateString()
    startTime?: string;

    @ApiPropertyOptional({ description: '結束時間（ISO8601）' })
    @IsOptional()
    @IsDateString()
    endTime?: string;

    @ApiPropertyOptional({ description: '建立時間（ISO8601，startTime 的 fallback）' })
    @IsOptional()
    @IsDateString()
    createdAt?: string;

    @ApiPropertyOptional({ type: IatiMissionLocationDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => IatiMissionLocationDto)
    location?: IatiMissionLocationDto;

    @ApiPropertyOptional({ description: '預算（TWD），有值時產生 IATI transaction' })
    @IsOptional()
    @IsNumber()
    budget?: number;
}

/**
 * 3W：由任務清單產生矩陣
 *
 * `missions` 同樣為原樣轉出的呼叫端物件（ThreeWMatrixService 全欄位帶 fallback），
 * 因此僅驗證為物件陣列；`period` 則嚴格驗證。
 */
export class GenerateThreeWMatrixDto {
    @ApiProperty({ description: '任務清單', type: [Object] })
    @IsArray()
    @IsObject({ each: true })
    missions: Record<string, unknown>[];

    @ApiProperty({ type: ReportingPeriodDto })
    @ValidateNested()
    @Type(() => ReportingPeriodDto)
    period: ReportingPeriodDto;
}

/**
 * Sphere：設施評估資料（對應 SphereStandardsService 的 FacilityData）
 *
 * 原始 interface 帶有 `[key: string]: unknown` index signature，但 service
 * 僅讀取以下 7 個具名欄位；此處只列出這些欄位，未列欄位在
 * forbidNonWhitelisted 下會被擋（行為收緊，需留意舊呼叫端）。
 */
export class FacilityDataDto {
    @ApiPropertyOptional({ description: '設施位置' })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ description: '收容人數' })
    @IsOptional()
    @IsNumber()
    population?: number;

    @ApiPropertyOptional({ description: '每日供水量（公升）' })
    @IsOptional()
    @IsNumber()
    waterSupplyLiters?: number;

    @ApiPropertyOptional({ description: '廁所數量' })
    @IsOptional()
    @IsNumber()
    toiletCount?: number;

    @ApiPropertyOptional({ description: '遮蔽面積（平方公尺）' })
    @IsOptional()
    @IsNumber()
    coveredAreaM2?: number;

    @ApiPropertyOptional({ description: '每人每日熱量（kcal）' })
    @IsOptional()
    @IsNumber()
    dailyKcal?: number;

    @ApiPropertyOptional({ description: '藥品供應率（%）' })
    @IsOptional()
    @IsNumber()
    drugAvailabilityPercent?: number;
}

/**
 * Sphere：單一類別合規評估
 */
export class AssessSphereComplianceDto {
    @ApiProperty({ type: FacilityDataDto })
    @ValidateNested()
    @Type(() => FacilityDataDto)
    facilityData: FacilityDataDto;

    @ApiProperty({ enum: SphereStandardCategory, description: 'Sphere 標準類別' })
    @IsEnum(SphereStandardCategory)
    category: SphereStandardCategory;
}

/**
 * Sphere：產生完整合規報告
 */
export class GenerateSphereReportDto {
    @ApiProperty({ type: FacilityDataDto })
    @ValidateNested()
    @Type(() => FacilityDataDto)
    facilityData: FacilityDataDto;

    @ApiProperty({ description: '評估人員' })
    @IsString()
    assessor: string;
}
