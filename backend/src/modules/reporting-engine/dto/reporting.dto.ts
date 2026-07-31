import { Type } from 'class-transformer';
import {
    Allow,
    IsArray,
    IsBoolean,
    IsIn,
    IsObject,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const REPORT_DEFINITION_TYPES = [
    'mission',
    'resource',
    'volunteer',
    'incident',
    'financial',
    'custom',
] as const;

export const REPORT_SECTION_TYPES = ['table', 'chart', 'summary', 'text', 'map'] as const;
export const REPORT_CHART_TYPES = ['bar', 'line', 'pie', 'area'] as const;
export const REPORT_FILTER_OPERATORS = [
    'eq', 'ne', 'gt', 'lt', 'gte', 'lte', 'in', 'between', 'like',
] as const;

export const REPORT_SCHEDULE_FREQUENCIES = ['daily', 'weekly', 'monthly', 'custom'] as const;
export const REPORT_SCHEDULE_FORMATS = ['pdf', 'excel', 'csv'] as const;

export const REPORT_TEMPLATE_CATEGORIES = [
    'mission',
    'resource',
    'volunteer',
    'incident',
    'ics',
    'custom',
] as const;

/**
 * 報表區塊定義（對應 ReportSection）
 */
export class ReportSectionDto {
    @ApiProperty({ description: '區塊 ID' })
    @IsString()
    id: string;

    @ApiProperty({ description: '區塊標題' })
    @IsString()
    title: string;

    @ApiProperty({ enum: REPORT_SECTION_TYPES })
    @IsIn(REPORT_SECTION_TYPES as unknown as string[])
    type: 'table' | 'chart' | 'summary' | 'text' | 'map';

    @ApiProperty({ description: '資料來源識別' })
    @IsString()
    dataSource: string;

    @ApiPropertyOptional({ type: [String], description: '欄位清單' })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    columns?: string[];

    @ApiPropertyOptional({ enum: REPORT_CHART_TYPES })
    @IsOptional()
    @IsIn(REPORT_CHART_TYPES as unknown as string[])
    chartType?: 'bar' | 'line' | 'pie' | 'area';

    /** 區塊層級的呈現選項，隨 type 而異，無固定結構。 */
    @ApiPropertyOptional({ description: '呈現選項（自由鍵值）', type: Object })
    @IsOptional()
    @IsObject()
    options?: Record<string, unknown>;
}

/**
 * 報表篩選條件（對應 ReportFilter）
 *
 * `value` 型別依 operator 而異（in 為陣列、between 為區間、eq 為純量），
 * 故維持不定型；欄位名與運算子本身則嚴格驗證。
 */
export class ReportFilterDto {
    @ApiProperty({ description: '欄位名稱' })
    @IsString()
    field: string;

    @ApiProperty({ enum: REPORT_FILTER_OPERATORS })
    @IsIn(REPORT_FILTER_OPERATORS as unknown as string[])
    operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'between' | 'like';

    // 用 @Allow() 而非 @IsOptional()：whitelist 會剝除完全沒有驗證中繼資料的
    // 屬性，@Allow() 是「放行但不驗證」的正確標記。
    @ApiProperty({ description: '比較值（型別依 operator 而異）' })
    @Allow()
    value: unknown;
}

/**
 * 建立報表定義（對應 Omit<ReportDefinition, 'id' | 'createdAt'>）
 */
export class CreateReportDefinitionDto {
    @ApiProperty({ description: '報表名稱' })
    @IsString()
    name: string;

    @ApiProperty({ enum: REPORT_DEFINITION_TYPES })
    @IsIn(REPORT_DEFINITION_TYPES as unknown as string[])
    type: 'mission' | 'resource' | 'volunteer' | 'incident' | 'financial' | 'custom';

    @ApiProperty({ type: [ReportSectionDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReportSectionDto)
    sections: ReportSectionDto[];

    @ApiProperty({ type: [ReportFilterDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ReportFilterDto)
    filters: ReportFilterDto[];

    @ApiProperty({ description: '建立者' })
    @IsString()
    createdBy: string;
}

/**
 * 建立報表排程（對應 Omit<ReportSchedule, 'id' | 'nextRun'>）
 *
 * `lastRun` 雖為 Omit 所允許，但屬伺服器管理欄位，刻意不列入白名單。
 */
export class CreateReportScheduleDto {
    @ApiProperty({ description: '排程名稱' })
    @IsString()
    name: string;

    @ApiProperty({ description: '對應的報表定義 ID' })
    @IsString()
    definitionId: string;

    @ApiProperty({ enum: REPORT_SCHEDULE_FREQUENCIES })
    @IsIn(REPORT_SCHEDULE_FREQUENCIES as unknown as string[])
    frequency: 'daily' | 'weekly' | 'monthly' | 'custom';

    @ApiPropertyOptional({ description: 'cron 表達式（目前 service 尚未讀取）' })
    @IsOptional()
    @IsString()
    cronExpression?: string;

    @ApiProperty({ type: [String], description: '收件者' })
    @IsArray()
    @IsString({ each: true })
    recipients: string[];

    @ApiProperty({ enum: REPORT_SCHEDULE_FORMATS })
    @IsIn(REPORT_SCHEDULE_FORMATS as unknown as string[])
    format: 'pdf' | 'excel' | 'csv';

    @ApiProperty({ description: '是否啟用' })
    @IsBoolean()
    enabled: boolean;

    @ApiProperty({ description: '建立者' })
    @IsString()
    createdBy: string;
}

/**
 * 更新報表排程
 *
 * 刻意排除 `id` 與 `nextRun`：service 以 `{ ...schedule, ...updates }` 覆寫後
 * 仍以原 key 存回 Map，呼叫端若送 `id` 會造成記錄與索引鍵不一致
 * （後續 getSchedule(回傳的 id) 會查無資料）；`nextRun` 則由 frequency 推導。
 */
export class UpdateReportScheduleDto {
    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    name?: string;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    definitionId?: string;

    @ApiPropertyOptional({ enum: REPORT_SCHEDULE_FREQUENCIES })
    @IsOptional()
    @IsIn(REPORT_SCHEDULE_FREQUENCIES as unknown as string[])
    frequency?: 'daily' | 'weekly' | 'monthly' | 'custom';

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    cronExpression?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    recipients?: string[];

    @ApiPropertyOptional({ enum: REPORT_SCHEDULE_FORMATS })
    @IsOptional()
    @IsIn(REPORT_SCHEDULE_FORMATS as unknown as string[])
    format?: 'pdf' | 'excel' | 'csv';

    @ApiPropertyOptional()
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @ApiPropertyOptional()
    @IsOptional()
    @IsString()
    createdBy?: string;
}

/**
 * 建立報表範本（對應 Omit<ReportTemplate, 'id' | 'createdAt' | 'updatedAt'>）
 */
export class CreateReportTemplateDto {
    @ApiProperty({ description: '範本名稱' })
    @IsString()
    name: string;

    @ApiProperty({ enum: REPORT_TEMPLATE_CATEGORIES })
    @IsIn(REPORT_TEMPLATE_CATEGORIES as unknown as string[])
    category: 'mission' | 'resource' | 'volunteer' | 'incident' | 'ics' | 'custom';

    @ApiProperty({ description: '範本內容（含 {{variable}} 佔位符）' })
    @IsString()
    content: string;

    @ApiProperty({ type: [String], description: '宣告的變數名稱' })
    @IsArray()
    @IsString({ each: true })
    variables: string[];

    @ApiProperty({ description: '建立者' })
    @IsString()
    createdBy: string;
}

/**
 * 範本變數鍵名允許的格式（英數與底線）。
 *
 * 渲染端點的 `variables` 是真正的動態鍵值：鍵由各範本自行宣告
 * （每個 template 帶自己的 variables 清單），無法以靜態 DTO 或 enum 表達，
 * 故該參數維持 `Record<string, unknown>`。
 *
 * 但鍵名格式必須限制：TemplateService.render() 會把 key 未經跳脫
 * 直接插入 `new RegExp(\`{{${key}}}\`)`。像 `.*` 這種鍵會改寫整份範本，
 * `(a+)+` 則構成 ReDoS。以下工具供 controller 於入口攔截，
 * 封住該注入面（service 端的跳脫修正另案處理）。
 */
export const TEMPLATE_VARIABLE_KEY_PATTERN = /^[A-Za-z0-9_]+$/;

/** 回傳不合法的變數鍵名清單；空陣列代表全部合法。 */
export function findInvalidTemplateVariableKeys(
    variables: Record<string, unknown>,
): string[] {
    return Object.keys(variables ?? {}).filter(
        (key) => !TEMPLATE_VARIABLE_KEY_PATTERN.test(key),
    );
}
