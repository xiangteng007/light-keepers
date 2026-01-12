/**
 * social-monitor.dto.ts
 * 
 * v3.0: 社群監視 API DTO - 含互動指標、進階篩選、匯出
 */
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsArray, IsNumber, Min, Max, IsEnum, IsUrl, IsDateString, IsBoolean } from 'class-validator';
import { SocialPlatform, SentimentType } from '../entities/social-post.entity';
import { NotificationChannel } from '../entities/notification-config.entity';

// ===== 分析貼文 (v3.0 擴展) =====
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

    // v3.0: 互動指標
    @ApiPropertyOptional({ description: '按讚數' })
    @IsOptional()
    @IsNumber()
    likeCount?: number;

    @ApiPropertyOptional({ description: '留言數' })
    @IsOptional()
    @IsNumber()
    commentCount?: number;

    @ApiPropertyOptional({ description: '分享數' })
    @IsOptional()
    @IsNumber()
    shareCount?: number;

    @ApiPropertyOptional({ description: '瀏覽數' })
    @IsOptional()
    @IsNumber()
    viewCount?: number;
}

// ===== 設定關鍵字 =====
export class SetKeywordsDto {
    @ApiProperty({ description: '關鍵字列表', example: ['地震', '颱風', '水災'] })
    @IsArray()
    @IsString({ each: true })
    keywords: string[];
}

// ===== 設定排除詞 =====
export class SetExcludeWordsDto {
    @ApiProperty({ description: '排除詞列表', example: ['演習', '測試', '模擬'] })
    @IsArray()
    @IsString({ each: true })
    excludeWords: string[];
}

// ===== 查詢參數 (v3.0 擴展) =====
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

    // v3.0: 進階篩選
    @ApiPropertyOptional({ description: '情緒篩選' })
    @IsOptional()
    @IsString()
    sentiment?: SentimentType;

    @ApiPropertyOptional({ description: '地區篩選' })
    @IsOptional()
    @IsString()
    location?: string;

    @ApiPropertyOptional({ description: '開始時間' })
    @IsOptional()
    @IsDateString()
    from?: string;

    @ApiPropertyOptional({ description: '結束時間' })
    @IsOptional()
    @IsDateString()
    to?: string;

    @ApiPropertyOptional({ description: '最低按讚數' })
    @IsOptional()
    @IsNumber()
    minLikes?: number;

    @ApiPropertyOptional({ description: '最低留言數' })
    @IsOptional()
    @IsNumber()
    minComments?: number;

    @ApiPropertyOptional({ description: '最低分享數' })
    @IsOptional()
    @IsNumber()
    minShares?: number;

    @ApiPropertyOptional({ description: '最低瀏覽數' })
    @IsOptional()
    @IsNumber()
    minViews?: number;
}

// ===== 匯出參數 =====
export class ExportQueryDto extends GetPostsQueryDto {
    @ApiPropertyOptional({ description: '匯出格式', enum: ['csv', 'json'], default: 'json' })
    @IsOptional()
    @IsString()
    format?: 'csv' | 'json';
}

// ===== 通知配置 DTO =====
export class CreateNotificationConfigDto {
    @ApiProperty({ description: '配置名稱' })
    @IsString()
    name: string;

    @ApiProperty({ description: '通知頻道', enum: ['email', 'telegram', 'line', 'slack', 'webhook'] })
    @IsString()
    channel: NotificationChannel;

    @ApiPropertyOptional({ description: '是否啟用', default: true })
    @IsOptional()
    @IsBoolean()
    enabled?: boolean;

    @ApiPropertyOptional({ description: '最低緊急度', default: 7 })
    @IsOptional()
    @IsNumber()
    minUrgency?: number;

    @ApiProperty({ description: '頻道配置 (依頻道類型)' })
    config: Record<string, any>;

    @ApiPropertyOptional({ description: '篩選平台' })
    @IsOptional()
    @IsArray()
    platforms?: string[];

    @ApiPropertyOptional({ description: '篩選關鍵字' })
    @IsOptional()
    @IsArray()
    keywords?: string[];
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

    // v3.0
    @ApiPropertyOptional()
    likeCount?: number;

    @ApiPropertyOptional()
    commentCount?: number;

    @ApiPropertyOptional()
    shareCount?: number;

    @ApiPropertyOptional()
    viewCount?: number;
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
