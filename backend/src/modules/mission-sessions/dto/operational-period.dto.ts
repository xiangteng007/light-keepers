import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsDateString,
    IsIn,
    IsInt,
    IsNotEmpty,
    IsOptional,
    IsString,
    Max,
    MaxLength,
    Min,
    ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * IAP 作戰週期（Operational Period）端點的輸入驗證。
 *
 * 同 sitrep.dto.ts 的理由：原本是行內型別，ValidationPipe 對它完全無效。
 * 這裡的內容是全隊行動依據（目標、風險評估、資源配置），
 * 未驗證的輸入會直接落進 jsonb 欄位並被前端當成指揮文件呈現。
 */

const MAX_ARRAY_ITEMS = 200;
const MAX_TEXT = 5000;

const OBJECTIVE_STATUSES = ['pending', 'in_progress', 'achieved', 'not_achieved'] as const;

export class ObjectiveDto {
    @ApiProperty({ description: '目標 ID（由呼叫端產生，用於前端對應）' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    id: string;

    @ApiProperty({ description: '優先度（數字越小越優先）' })
    @IsInt()
    @Min(0)
    @Max(100)
    priority: number;

    @ApiProperty({ description: '目標描述' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(MAX_TEXT)
    description: string;

    @ApiProperty({ description: '可衡量的達成條件' })
    @IsString()
    @MaxLength(MAX_TEXT)
    measurable: string;

    @ApiPropertyOptional({ description: '負責人／單位' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    assignedTo?: string;

    @ApiProperty({ enum: OBJECTIVE_STATUSES, description: '目標狀態' })
    @IsIn(OBJECTIVE_STATUSES as unknown as string[])
    status: (typeof OBJECTIVE_STATUSES)[number];
}

export class RiskAssessmentDto {
    @ApiProperty({ description: '風險項 ID' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    id: string;

    @ApiProperty({ description: '危害描述' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(MAX_TEXT)
    hazard: string;

    @ApiProperty({ description: '發生可能性 1-5' })
    @IsInt()
    @Min(1)
    @Max(5)
    likelihood: 1 | 2 | 3 | 4 | 5;

    @ApiProperty({ description: '後果嚴重度 1-5' })
    @IsInt()
    @Min(1)
    @Max(5)
    consequence: 1 | 2 | 3 | 4 | 5;

    @ApiProperty({ description: '緩解措施' })
    @IsString()
    @MaxLength(MAX_TEXT)
    mitigation: string;

    @ApiPropertyOptional({ description: '負責人／單位' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    responsible?: string;
}

export class ResourceAllocationDto {
    @ApiProperty({ description: '資源類型' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    resourceType: string;

    @ApiProperty({ description: '數量' })
    @IsInt()
    @Min(0)
    quantity: number;

    @ApiPropertyOptional({ description: '配賦對象' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    assignedTo?: string;

    @ApiPropertyOptional({ description: '位置' })
    @IsOptional()
    @IsString()
    @MaxLength(500)
    location?: string;

    @ApiPropertyOptional({ description: '備註' })
    @IsOptional()
    @IsString()
    @MaxLength(MAX_TEXT)
    notes?: string;
}

/** POST /api/missions/:sessionId/iap/periods */
export class CreateOperationalPeriodDto {
    @ApiPropertyOptional({ description: '週期名稱' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    name?: string;

    @ApiProperty({ description: '起始時間（ISO 8601）' })
    @IsDateString()
    startTime: string;

    @ApiPropertyOptional({ description: '結束時間（ISO 8601）' })
    @IsOptional()
    @IsDateString()
    endTime?: string;

    @ApiPropertyOptional({ type: [ObjectiveDto], description: '作戰目標' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => ObjectiveDto)
    objectives?: ObjectiveDto[];

    @ApiPropertyOptional({ type: [String], description: '優先事項' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @IsString({ each: true })
    @MaxLength(MAX_TEXT, { each: true })
    priorities?: string[];

    @ApiPropertyOptional({ description: '指揮官指導' })
    @IsOptional()
    @IsString()
    @MaxLength(MAX_TEXT)
    commanderGuidance?: string;
}

/** PUT /api/missions/:sessionId/iap/periods/:periodId */
export class UpdateOperationalPeriodDto {
    @ApiPropertyOptional({ description: '週期名稱' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    name?: string;

    @ApiPropertyOptional({ type: [ObjectiveDto], description: '作戰目標' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => ObjectiveDto)
    objectives?: ObjectiveDto[];

    @ApiPropertyOptional({ type: [String], description: '優先事項' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @IsString({ each: true })
    @MaxLength(MAX_TEXT, { each: true })
    priorities?: string[];

    @ApiPropertyOptional({ type: [RiskAssessmentDto], description: '風險評估' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => RiskAssessmentDto)
    riskAssessment?: RiskAssessmentDto[];

    @ApiPropertyOptional({ type: [ResourceAllocationDto], description: '資源配置' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => ResourceAllocationDto)
    resourceAllocation?: ResourceAllocationDto[];

    @ApiPropertyOptional({ description: '指揮官指導' })
    @IsOptional()
    @IsString()
    @MaxLength(MAX_TEXT)
    commanderGuidance?: string;

    @ApiPropertyOptional({ description: '結束時間（ISO 8601）' })
    @IsOptional()
    @IsDateString()
    endTime?: string;
}
