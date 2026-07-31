import {
    IsArray,
    IsBoolean,
    IsInt,
    IsObject,
    IsOptional,
    IsString,
    MaxLength,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * 建立貼紙模板（POST /label-templates）
 *
 * 前端呼叫點：web-dashboard/src/pages/LabelManagementPage.tsx
 * 送出 name / description / targetTypes / controlLevels / width / height /
 * layoutConfig 共 7 欄，與本 DTO 一致。
 * `createdBy` 由 controller 從 JWT 注入，不接受呼叫端輸入。
 *
 * 起步寬鬆說明：targetTypes / controlLevels 雖有實務上的固定值
 * （lot/asset/bin、controlled/medical/asset），但 entity 僅宣告 string[]，
 * 現行資料未必受限，故先驗證為字串陣列。
 * 後續可收緊：改 @IsIn([...], { each: true })。
 */
export class CreateLabelTemplateDto {
    @ApiProperty({ description: '模板名稱', maxLength: 200 })
    @IsString()
    @MaxLength(200)
    name: string;

    @ApiPropertyOptional({ description: '模板說明', maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiProperty({ type: [String], description: '適用標的類型（lot/asset/bin）' })
    @IsArray()
    @IsString({ each: true })
    targetTypes: string[];

    @ApiProperty({ type: [String], description: '適用管制層級（controlled/medical/asset）' })
    @IsArray()
    @IsString({ each: true })
    controlLevels: string[];

    @ApiProperty({ description: '標籤寬度（mm）' })
    @IsInt()
    @Min(1)
    width: number;

    @ApiProperty({ description: '標籤高度（mm）' })
    @IsInt()
    @Min(1)
    height: number;

    /**
     * 版面配置 JSON：鍵為標籤欄位名稱，值為位置與字體描述。
     * 刻意不建巢狀 DTO——各元素鍵集不一致（種子資料用 `size`，
     * 前端 LabelManagementPage 送 `{ fields: [{ name, position, size|fontSize }] }`），
     * 且後端從不解構它，僅由 LabelPrintService 原樣透傳給前端渲染器。
     * 加上巢狀白名單會直接擋掉現行前端請求。
     */
    @ApiProperty({ description: '版面配置（自由結構，後端不解析）', type: Object })
    @IsObject()
    layoutConfig: Record<string, unknown>;
}

/**
 * 更新貼紙模板（PATCH /label-templates/:id）
 *
 * service 以 `Object.assign(template, data)` 無過濾合併，白名單在此重要。
 * 前端目前僅送 `isActive`。
 */
export class UpdateLabelTemplateDto {
    @ApiPropertyOptional({ maxLength: 200 })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    name?: string;

    @ApiPropertyOptional({ maxLength: 500 })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string;

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    targetTypes?: string[];

    @ApiPropertyOptional({ type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    controlLevels?: string[];

    @ApiPropertyOptional({ description: '標籤寬度（mm）' })
    @IsOptional()
    @IsInt()
    @Min(1)
    width?: number;

    @ApiPropertyOptional({ description: '標籤高度（mm）' })
    @IsOptional()
    @IsInt()
    @Min(1)
    height?: number;

    @ApiPropertyOptional({ description: '版面配置（自由結構，後端不解析）', type: Object })
    @IsOptional()
    @IsObject()
    layoutConfig?: Record<string, unknown>;

    @ApiPropertyOptional({ description: '是否啟用' })
    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}
