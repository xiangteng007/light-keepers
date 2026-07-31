import { Type } from 'class-transformer';
import {
    IsArray,
    IsDate,
    IsIn,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// ===================== ICS-201 =====================

/** ICS-201 指揮體系編組 */
export class Ics201OrganizationDto {
    @ApiProperty({ description: '事件指揮官' })
    @IsString()
    incidentCommander: string;

    @ApiPropertyOptional({ description: '作業組' })
    @IsOptional()
    @IsString()
    operations?: string;

    @ApiPropertyOptional({ description: '計畫組' })
    @IsOptional()
    @IsString()
    planning?: string;

    @ApiPropertyOptional({ description: '後勤組' })
    @IsOptional()
    @IsString()
    logistics?: string;

    @ApiPropertyOptional({ description: '財務組' })
    @IsOptional()
    @IsString()
    finance?: string;
}

/** ICS-201 資源摘要項目 */
export class Ics201ResourceSummaryDto {
    @ApiProperty({ description: '資源名稱' })
    @IsString()
    resource: string;

    @ApiProperty({ description: '數量' })
    @IsNumber()
    quantity: number;

    @ApiProperty({ description: '所在位置' })
    @IsString()
    location: string;

    @ApiProperty({ description: '狀態' })
    @IsString()
    status: string;
}

/**
 * 生成 ICS-201 事件概述（對應 IcsFormsService 的 Ics201Data）
 *
 * 原始 interface 全欄位必填，此處照實轉寫；operationalPeriod 由 service
 * 自行產生，不接受呼叫端輸入。
 */
export class GenerateIcs201Dto {
    @ApiProperty({ description: '事件名稱' })
    @IsString()
    incidentName: string;

    @ApiProperty({ description: '事件編號' })
    @IsString()
    incidentNumber: string;

    @ApiProperty({ description: '製表時間（ISO8601）' })
    @Type(() => Date)
    @IsDate()
    dateTimePrepared: Date;

    @ApiPropertyOptional({ description: '現場示意圖（URL 或 data URI）' })
    @IsOptional()
    @IsString()
    mapSketch?: string;

    @ApiProperty({ description: '現況描述' })
    @IsString()
    situation: string;

    @ApiProperty({ description: '應變目標', type: [String] })
    @IsArray()
    @IsString({ each: true })
    objectives: string[];

    @ApiProperty({ type: Ics201OrganizationDto })
    @ValidateNested()
    @Type(() => Ics201OrganizationDto)
    currentOrganization: Ics201OrganizationDto;

    @ApiProperty({ type: [Ics201ResourceSummaryDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Ics201ResourceSummaryDto)
    resourcesSummary: Ics201ResourceSummaryDto[];
}

// ===================== ICS-214 =====================

/** ICS-214 作業期間 */
export class Ics214OperationalPeriodDto {
    @ApiProperty({ description: '起始時間（ISO8601）' })
    @Type(() => Date)
    @IsDate()
    from: Date;

    @ApiProperty({ description: '結束時間（ISO8601）' })
    @Type(() => Date)
    @IsDate()
    to: Date;
}

/** ICS-214 活動日誌項目 */
export class Ics214ActivityLogEntryDto {
    @ApiProperty({ description: '活動時間（ISO8601）' })
    @Type(() => Date)
    @IsDate()
    time: Date;

    @ApiProperty({ description: '活動內容' })
    @IsString()
    activity: string;
}

/**
 * 生成 ICS-214 活動日誌（對應 IcsFormsService 的 Ics214Data）
 */
export class GenerateIcs214Dto {
    @ApiProperty({ description: '事件名稱' })
    @IsString()
    incidentName: string;

    @ApiProperty({ type: Ics214OperationalPeriodDto })
    @ValidateNested()
    @Type(() => Ics214OperationalPeriodDto)
    operationalPeriod: Ics214OperationalPeriodDto;

    @ApiProperty({ description: '填表人姓名' })
    @IsString()
    name: string;

    @ApiProperty({ description: '職務' })
    @IsString()
    position: string;

    @ApiProperty({ description: '所屬機關' })
    @IsString()
    homeAgency: string;

    @ApiProperty({ type: [Ics214ActivityLogEntryDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => Ics214ActivityLogEntryDto)
    activityLog: Ics214ActivityLogEntryDto[];
}

// ===================== HXL 匯出 =====================

/** HXL 任務地點（international 模組使用 lat/lng，與 humanitarian 模組的 latitude/longitude 不同） */
export class HxlMissionLocationDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    lat?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    lng?: number;
}

/**
 * HXL 匯出：任務項目
 *
 * HxlExportService.exportMissions() 對每個欄位都有 fallback，故全部選填。
 */
export class ExportMissionHxlItemDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional({ type: HxlMissionLocationDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => HxlMissionLocationDto)
    location?: HxlMissionLocationDto;

    @ApiPropertyOptional({ description: '開始日期（ISO8601）' })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({ description: '結束日期（ISO8601）' })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    status?: string;

    @ApiPropertyOptional({ description: '受益人數' })
    @IsOptional()
    @IsNumber()
    beneficiaries?: number;
}

/**
 * HXL 匯出：資源項目（此處 location 為單純字串，非物件）
 */
export class ExportResourceHxlItemDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    quantity?: number;

    @ApiPropertyOptional({ description: '單位，預設 units' })
    @IsOptional()
    @IsString()
    unit?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ description: '狀態，預設 available' })
    @IsOptional()
    @IsString()
    status?: string;
}

/**
 * HXL 匯出：3W 活動項目
 */
export class Export3WHxlItemDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    organization?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    sector?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    activity?: string;

    @ApiPropertyOptional({ description: '一級行政區' })
    @IsOptional()
    @IsString()
    adm1?: string;

    @ApiPropertyOptional({ description: '二級行政區' })
    @IsOptional()
    @IsString()
    adm2?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ description: '開始日期（ISO8601）' })
    @IsOptional()
    @IsString()
    startDate?: string;

    @ApiPropertyOptional({ description: '結束日期（ISO8601）' })
    @IsOptional()
    @IsString()
    endDate?: string;

    @ApiPropertyOptional({ description: '目標人數' })
    @IsOptional()
    @IsNumber()
    targeted?: number;

    @ApiPropertyOptional({ description: '實際觸及人數' })
    @IsOptional()
    @IsNumber()
    reached?: number;
}

// ===================== OCHA 3W =====================

export const ORG_TYPES = ['UN', 'INGO', 'NNGO', 'Government', 'Other'] as const;
export const THREE_W_STATUSES = ['planned', 'ongoing', 'completed', 'suspended'] as const;

/** 3W - Who */
export class ThreeWWhoDto {
    @ApiProperty({ description: '組織名稱' })
    @IsString()
    organization: string;

    @ApiProperty({ enum: ORG_TYPES, description: '組織類型' })
    @IsIn(ORG_TYPES as unknown as string[])
    organizationType: 'UN' | 'INGO' | 'NNGO' | 'Government' | 'Other';

    @ApiProperty({ description: 'Cluster 名稱（自由字串）' })
    @IsString()
    cluster: string;

    @ApiPropertyOptional({ description: '主責機構' })
    @IsOptional()
    @IsString()
    leadAgency?: string;
}

/** 3W - What */
export class ThreeWWhatDto {
    @ApiProperty({ description: '活動名稱' })
    @IsString()
    activity: string;

    @ApiProperty({ description: '活動類型' })
    @IsString()
    activityType: string;

    @ApiProperty({ description: 'Sector（自由字串）' })
    @IsString()
    sector: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    subSector?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    indicator?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    targetValue?: number;

    @ApiPropertyOptional()
    @IsOptional()
    @IsNumber()
    achievedValue?: number;
}

/** 3W - 座標 */
export class ThreeWCoordinatesDto {
    @ApiProperty()
    @IsNumber()
    lat: number;

    @ApiProperty()
    @IsNumber()
    lng: number;
}

/** 3W - Where */
export class ThreeWWhereDto {
    @ApiProperty({ description: '國家' })
    @IsString()
    country: string;

    @ApiProperty({ description: '一級行政區' })
    @IsString()
    admin1: string;

    @ApiPropertyOptional({ description: '二級行政區' })
    @IsOptional()
    @IsString()
    admin2?: string;

    @ApiPropertyOptional({ description: '三級行政區' })
    @IsOptional()
    @IsString()
    admin3?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ description: 'P-code' })
    @IsOptional()
    @IsString()
    pcode?: string;

    @ApiPropertyOptional({ type: ThreeWCoordinatesDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ThreeWCoordinatesDto)
    coordinates?: ThreeWCoordinatesDto;
}

/** 3W - When */
export class ThreeWWhenDto {
    @ApiProperty({ description: '開始日期（ISO8601）' })
    @Type(() => Date)
    @IsDate()
    startDate: Date;

    @ApiPropertyOptional({ description: '結束日期（ISO8601）' })
    @IsOptional()
    @Type(() => Date)
    @IsDate()
    endDate?: Date;

    @ApiProperty({ description: '回報週期，如 monthly' })
    @IsString()
    reportingPeriod: string;
}

/** 3W - 受益人統計 */
export class ThreeWBeneficiariesDto {
    @ApiProperty({ description: '目標人數' })
    @IsNumber()
    targeted: number;

    @ApiProperty({ description: '實際觸及人數' })
    @IsNumber()
    reached: number;

    /** 依族群分類的人數，鍵值由回報單位自訂（性別、年齡層…），故不建 DTO。 */
    @ApiPropertyOptional({ description: '分類統計（自由鍵值）', type: Object })
    @IsOptional()
    @IsObject()
    categories?: Record<string, number>;
}

/**
 * 新增 3W 記錄（對應 Omit<ThreeWRecord, 'id'>）
 */
export class Add3WRecordDto {
    @ApiProperty({ type: ThreeWWhoDto })
    @ValidateNested()
    @Type(() => ThreeWWhoDto)
    who: ThreeWWhoDto;

    @ApiProperty({ type: ThreeWWhatDto })
    @ValidateNested()
    @Type(() => ThreeWWhatDto)
    what: ThreeWWhatDto;

    @ApiProperty({ type: ThreeWWhereDto })
    @ValidateNested()
    @Type(() => ThreeWWhereDto)
    where: ThreeWWhereDto;

    @ApiProperty({ type: ThreeWWhenDto })
    @ValidateNested()
    @Type(() => ThreeWWhenDto)
    when: ThreeWWhenDto;

    @ApiPropertyOptional({ type: ThreeWBeneficiariesDto })
    @IsOptional()
    @ValidateNested()
    @Type(() => ThreeWBeneficiariesDto)
    beneficiaries?: ThreeWBeneficiariesDto;

    @ApiProperty({ enum: THREE_W_STATUSES })
    @IsIn(THREE_W_STATUSES as unknown as string[])
    status: 'planned' | 'ongoing' | 'completed' | 'suspended';

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    notes?: string;
}

/**
 * 匯入 OCHA 3W 資料項目
 *
 * 這是外部 OCHA 資料交換格式（snake_case），與內部 ThreeWRecord 不同；
 * OchaIntegrationService.importFromOcha() 逐項 try/catch 且全欄位帶預設值，
 * 因此全部選填。多組欄位互為別名（organization/org、cluster/sector、
 * admin1/county、admin2/district）。
 */
export class Import3WItemDto {
    @ApiPropertyOptional({ description: '組織名稱（與 org 擇一）' })
    @IsOptional()
    @IsString()
    organization?: string;

    @ApiPropertyOptional({ description: 'organization 的別名' })
    @IsOptional()
    @IsString()
    org?: string;

    @ApiPropertyOptional({ enum: ORG_TYPES, description: '組織類型，預設 Other' })
    @IsOptional()
    @IsIn(ORG_TYPES as unknown as string[])
    org_type?: 'UN' | 'INGO' | 'NNGO' | 'Government' | 'Other';

    @ApiPropertyOptional({ description: 'Cluster（與 sector 擇一）' })
    @IsOptional()
    @IsString()
    cluster?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    activity?: string;

    @ApiPropertyOptional({ description: '活動類型，預設 general' })
    @IsOptional()
    @IsString()
    activity_type?: string;

    @ApiPropertyOptional({ description: 'Sector，同時作為 cluster 的 fallback' })
    @IsOptional()
    @IsString()
    sector?: string;

    @ApiPropertyOptional({ description: '國家，預設 Taiwan' })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({ description: '一級行政區（與 county 擇一）' })
    @IsOptional()
    @IsString()
    admin1?: string;

    @ApiPropertyOptional({ description: 'admin1 的別名' })
    @IsOptional()
    @IsString()
    county?: string;

    @ApiPropertyOptional({ description: '二級行政區（與 district 擇一）' })
    @IsOptional()
    @IsString()
    admin2?: string;

    @ApiPropertyOptional({ description: 'admin2 的別名' })
    @IsOptional()
    @IsString()
    district?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ description: '開始日期（ISO8601），預設為現在' })
    @IsOptional()
    @IsString()
    start_date?: string;

    @ApiPropertyOptional({ description: '結束日期（ISO8601）' })
    @IsOptional()
    @IsString()
    end_date?: string;

    @ApiPropertyOptional({ description: '回報週期，預設 monthly' })
    @IsOptional()
    @IsString()
    reporting_period?: string;

    @ApiPropertyOptional({ description: '目標人數，預設 0' })
    @IsOptional()
    @IsNumber()
    targeted?: number;

    @ApiPropertyOptional({ description: '實際觸及人數，預設 0' })
    @IsOptional()
    @IsNumber()
    reached?: number;

    @ApiPropertyOptional({ enum: THREE_W_STATUSES, description: '狀態，預設 ongoing' })
    @IsOptional()
    @IsIn(THREE_W_STATUSES as unknown as string[])
    status?: 'planned' | 'ongoing' | 'completed' | 'suspended';
}

// ===================== Sphere =====================

/**
 * 快速 Sphere 檢核（對應 SphereStandardsService.quickCheck 的 Partial<{...}>）
 *
 * 四個欄位皆以 `!== undefined` 判斷，全部選填。
 */
export class QuickSphereCheckDto {
    @ApiPropertyOptional({ description: '每人每日供水量（公升），低於 15 會被標記' })
    @IsOptional()
    @IsNumber()
    waterPerPerson?: number;

    @ApiPropertyOptional({ description: '每座廁所使用人數，高於 20 會被標記' })
    @IsOptional()
    @IsNumber()
    personsPerToilet?: number;

    @ApiPropertyOptional({ description: '每人每日熱量（kcal），低於 2100 會被標記' })
    @IsOptional()
    @IsNumber()
    caloriesPerPerson?: number;

    @ApiPropertyOptional({ description: '每人居住面積（平方公尺），低於 3.5 會被標記' })
    @IsOptional()
    @IsNumber()
    spacePerPerson?: number;
}
