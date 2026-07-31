import {
    IsBoolean,
    IsEnum,
    IsNotEmpty,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    IsUUID,
    Max,
    Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DecisionType } from '../entities/decision-log.entity';

/**
 * 記錄決策（POST /api/missions/:sessionId/sitrep/decisions）
 *
 * 特別重要：controller 以 `...body` 展開後直接交給 decisionRepo.create()，
 * 未經過濾。若無白名單 DTO，呼叫端可自行寫入 approvedBy / approvedAt /
 * impactSummary 等本應由伺服器控制的欄位。
 *
 * missionSessionId 來自路由參數、decidedBy / decidedByName 來自 JWT，
 * 三者皆不接受呼叫端輸入，故不列於此 DTO。
 */
export class LogDecisionDto {
    @ApiProperty({ enum: DecisionType, description: '決策類型' })
    @IsEnum(DecisionType)
    decisionType: DecisionType;

    @ApiProperty({ description: '決策內容描述' })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiPropertyOptional({ description: '決策理由' })
    @IsOptional()
    @IsString()
    rationale?: string;

    @ApiPropertyOptional({ description: '關聯實體類型，如 task / report / sector' })
    @IsOptional()
    @IsString()
    relatedEntityType?: string;

    @ApiPropertyOptional({ description: '關聯實體 ID（uuid 欄位）' })
    @IsOptional()
    @IsUUID()
    relatedEntityId?: string;

    @ApiPropertyOptional({ description: '是否由 AI 輔助' })
    @IsOptional()
    @IsBoolean()
    aiAssisted?: boolean;

    @ApiPropertyOptional({ description: 'AI 任務 ID（uuid 欄位）' })
    @IsOptional()
    @IsUUID()
    aiJobId?: string;

    @ApiPropertyOptional({ description: 'AI 信心值（0-1）' })
    @IsOptional()
    @IsNumber()
    @Min(0)
    @Max(1)
    aiConfidence?: number;

    /** jsonb 快照欄位：內容為任意實體變更前的樣態，無固定結構。 */
    @ApiPropertyOptional({ description: '變更前狀態快照', type: Object })
    @IsOptional()
    @IsObject()
    beforeState?: Record<string, unknown>;

    /** jsonb 快照欄位：內容為任意實體變更後的樣態，無固定結構。 */
    @ApiPropertyOptional({ description: '變更後狀態快照', type: Object })
    @IsOptional()
    @IsObject()
    afterState?: Record<string, unknown>;
}
