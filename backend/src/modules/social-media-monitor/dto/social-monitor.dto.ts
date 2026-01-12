/**
 * social-monitor.dto.ts
 * 
 * 社群監視 API DTO
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, Min, Max, IsEnum, IsUrl } from 'class-validator';
import { SocialPlatform, SentimentType } from '../entities/social-post.entity';

// ===== 分析貼文 =====
export class AnalyzePostDto {
    @ApiProperty({ description: '平台', example: 'facebook' })
    @IsString()
    platform: SocialPlatform;

    @ApiPropertyOptional({ description: '平台原始 ID' })
    @IsOptional()
    @IsString()
    externalId?: string;

    @ApiProperty({ description: '貼文內容' })
    @IsString()
    content: string;

    @ApiPropertyOptional({ description: '作者' })
    @IsOptional()
    @IsString()
    author?: string;

    @ApiPropertyOptional({ description: '原始連結' })
    @IsOptional()
    @IsUrl()
    url?: string;
}

// ===== 設定關鍵字 =====
export class SetKeywordsDto {
    @ApiProperty({ description: '關鍵字列表', example: ['地震', '颱風', '水災'] })
    @IsArray()
    @IsString({ each: true })
    keywords: string[];
}

// ===== 查詢參數 =====
export class GetPostsQueryDto {
    @ApiPropertyOptional({ description: '平台篩選' })
    @IsOptional()
    @IsString()
    platform?: SocialPlatform;

    @ApiPropertyOptional({ description: '最低緊急度', minimum: 1, maximum: 10 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(10)
    minUrgency?: number;

    @ApiPropertyOptional({ description: '關鍵字篩選' })
    @IsOptional()
    @IsString()
    keyword?: string;

    @ApiPropertyOptional({ description: '限制筆數', default: 50 })
    @IsOptional()
    @IsNumber()
    @Min(1)
    @Max(500)
    limit?: number;
}

// ===== Response DTOs =====
export class PostAnalysisResponseDto {
    @ApiProperty()
    postId: string;

    @ApiProperty()
    platform: string;

    @ApiProperty({ type: [String] })
    matchedKeywords: string[];

    @ApiProperty({ enum: ['positive', 'negative', 'neutral'] })
    sentiment: SentimentType;

    @ApiProperty({ minimum: 1, maximum: 10 })
    urgency: number;

    @ApiPropertyOptional()
    location?: string;

    @ApiProperty()
    analyzedAt: Date;
}

export class KeywordTrendDto {
    @ApiProperty()
    keyword: string;

    @ApiProperty()
    count: number;
}

export class MonitorStatsDto {
    @ApiProperty()
    totalPosts: number;

    @ApiProperty({ type: Object })
    byPlatform: Record<string, number>;

    @ApiProperty({ type: Object })
    byUrgency: { high: number; medium: number; low: number };

    @ApiProperty()
    lastUpdated: Date;
}
