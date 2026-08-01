import { Type } from 'class-transformer';
import {
    ArrayMaxSize,
    IsArray,
    IsDateString,
    IsIn,
    IsNotEmpty,
    IsOptional,
    IsString,
    MaxLength,
    ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * AAR（After Action Review，任務後檢討）更新端點的輸入驗證。
 *
 * 同 sitrep.dto.ts 的理由：原本是行內型別，ValidationPipe 對它無效。
 * AAR 是復盤與課責文件，內容會被引用於後續改善追蹤，需要固定結構。
 */

const MAX_ARRAY_ITEMS = 200;
const MAX_TEXT = 5000;

const DECISION_OUTCOMES = ['effective', 'partially_effective', 'ineffective', 'pending'] as const;
const LESSON_CATEGORIES = [
    'operations',
    'communications',
    'logistics',
    'coordination',
    'safety',
    'technology',
    'other',
] as const;
const LESSON_PRIORITIES = ['high', 'medium', 'low'] as const;
const LESSON_STATUSES = ['identified', 'in_progress', 'implemented', 'deferred'] as const;

export class DecisionReviewDto {
    @ApiProperty({ description: '對應的決策紀錄 ID' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    decisionId: string;

    @ApiProperty({ description: '決策時間（ISO 8601）' })
    @IsDateString()
    timestamp: string;

    @ApiProperty({ description: '決策描述' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(MAX_TEXT)
    description: string;

    @ApiProperty({ description: '決策理由' })
    @IsString()
    @MaxLength(MAX_TEXT)
    rationale: string;

    @ApiProperty({ enum: DECISION_OUTCOMES, description: '事後評估結果' })
    @IsIn(DECISION_OUTCOMES as unknown as string[])
    outcome: (typeof DECISION_OUTCOMES)[number];

    @ApiPropertyOptional({ description: '備註' })
    @IsOptional()
    @IsString()
    @MaxLength(MAX_TEXT)
    notes?: string;

    @ApiPropertyOptional({ type: [String], description: '建議事項' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @IsString({ each: true })
    @MaxLength(MAX_TEXT, { each: true })
    recommendations?: string[];
}

export class LessonLearnedDto {
    @ApiProperty({ description: '經驗項 ID' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    id: string;

    @ApiProperty({ enum: LESSON_CATEGORIES, description: '分類' })
    @IsIn(LESSON_CATEGORIES as unknown as string[])
    category: (typeof LESSON_CATEGORIES)[number];

    @ApiProperty({ description: '觀察到的現象' })
    @IsString()
    @IsNotEmpty()
    @MaxLength(MAX_TEXT)
    observation: string;

    @ApiProperty({ description: '造成的影響' })
    @IsString()
    @MaxLength(MAX_TEXT)
    impact: string;

    @ApiProperty({ description: '改善建議' })
    @IsString()
    @MaxLength(MAX_TEXT)
    recommendation: string;

    @ApiProperty({ enum: LESSON_PRIORITIES, description: '優先度' })
    @IsIn(LESSON_PRIORITIES as unknown as string[])
    priority: (typeof LESSON_PRIORITIES)[number];

    @ApiPropertyOptional({ description: '負責人／單位' })
    @IsOptional()
    @IsString()
    @MaxLength(200)
    assignedTo?: string;

    @ApiProperty({ enum: LESSON_STATUSES, description: '改善狀態' })
    @IsIn(LESSON_STATUSES as unknown as string[])
    status: (typeof LESSON_STATUSES)[number];
}

/** PUT /api/missions/:sessionId/aar/:aarId */
export class UpdateAarDto {
    @ApiPropertyOptional({ description: '執行摘要' })
    @IsOptional()
    @IsString()
    @MaxLength(MAX_TEXT)
    executiveSummary?: string;

    @ApiPropertyOptional({ type: [DecisionReviewDto], description: '決策檢討' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => DecisionReviewDto)
    decisionsReview?: DecisionReviewDto[];

    @ApiPropertyOptional({ type: [LessonLearnedDto], description: '經驗學習' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @ValidateNested({ each: true })
    @Type(() => LessonLearnedDto)
    lessonsLearned?: LessonLearnedDto[];

    @ApiPropertyOptional({ type: [String], description: '建議事項' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @IsString({ each: true })
    @MaxLength(MAX_TEXT, { each: true })
    recommendations?: string[];

    @ApiPropertyOptional({ type: [String], description: '做得好的部分' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @IsString({ each: true })
    @MaxLength(MAX_TEXT, { each: true })
    successes?: string[];

    @ApiPropertyOptional({ type: [String], description: '遭遇的困難' })
    @IsOptional()
    @IsArray()
    @ArrayMaxSize(MAX_ARRAY_ITEMS)
    @IsString({ each: true })
    @MaxLength(MAX_TEXT, { each: true })
    challenges?: string[];
}
