import {
    IsArray,
    IsDefined,
    IsIn,
    IsOptional,
    IsString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const EDXL_DISTRIBUTION_TYPES = [
    'Report',
    'Update',
    'Cancel',
    'Request',
    'Response',
    'Dispatch',
] as const;

export type EdxlDistributionInputType = (typeof EDXL_DISTRIBUTION_TYPES)[number];

/**
 * 建立 EDXL-DE 2.0 派送信封
 *
 * 注意 `payload` 刻意保持不定型（`unknown`）：EDXL-DE 標準的
 * contentObject/nonXMLContent 就是任意內容的承載槽。
 * EdxlDeAdapterService.createDistribution() 只做
 * `Buffer.from(JSON.stringify(payload)).toString('base64')`，
 * 從不檢視任何欄位；wrapCapAlert() 也以 `{ capAlert: <base64 CAP XML> }`
 * 走同一條路徑。若在此加上結構驗證，會破壞標準的任意內容契約。
 * 端點另有 CoreJwtGuard/UnifiedRolesGuard + @RequiredLevel(OFFICER) 保護。
 *
 * 唯一限制：必須可被 JSON.stringify 序列化（循環結構會在 service 內拋錯）。
 */
export class CreateEdxlDistributionDto {
    @ApiProperty({ description: '發送者識別（機關代碼或帳號）' })
    @IsString()
    sender: string;

    @ApiProperty({ enum: EDXL_DISTRIBUTION_TYPES, description: '派送類型' })
    @IsIn(EDXL_DISTRIBUTION_TYPES as unknown as string[])
    type: EdxlDistributionInputType;

    @ApiProperty({
        description: '任意承載內容（將被 JSON 序列化後 base64 編碼）',
        type: Object,
    })
    @IsDefined()
    payload: unknown;

    @ApiPropertyOptional({ description: '收件者（email）', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    recipients?: string[];

    @ApiPropertyOptional({ description: '目標區域', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    targetAreas?: string[];

    @ApiPropertyOptional({ description: '關鍵字', type: [String] })
    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    keywords?: string[];

    @ApiPropertyOptional({ description: '關聯事件 ID' })
    @IsOptional()
    @IsString()
    incidentId?: string;
}
