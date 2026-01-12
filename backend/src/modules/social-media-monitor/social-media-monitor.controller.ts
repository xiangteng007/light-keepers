/**
 * social-media-monitor.controller.ts
 * 
 * v3.0: 社群媒體監視 API Controller
 * - 進階篩選 (時間/地區/情緒/互動指標)
 * - CSV/JSON 匯出
 * - 通知配置管理
 */
import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Query,
    Param,
    Res,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SocialMediaMonitorService } from './social-media-monitor.service';
import { NotificationService } from './services/notification.service';
import {
    AnalyzePostDto,
    SetKeywordsDto,
    SetExcludeWordsDto,
    GetPostsQueryDto,
    ExportQueryDto,
    CreateNotificationConfigDto,
    PostAnalysisResponseDto,
    KeywordTrendDto,
    MonitorStatsDto,
} from './dto/social-monitor.dto';

@ApiTags('Social Media Monitor v3.0 (社群監視)')
@Controller('social-monitor')
export class SocialMediaMonitorController {
    constructor(
        private readonly monitorService: SocialMediaMonitorService,
        private readonly notificationService: NotificationService,
    ) { }

    // ===== 貼文查詢 =====
    @Get('posts')
    @ApiOperation({ summary: '取得監控貼文列表 (支援進階篩選)' })
    @ApiResponse({ status: 200, description: '成功取得' })
    async getPosts(@Query() query: GetPostsQueryDto) {
        return this.monitorService.getMonitoredPosts({
            platform: query.platform,
            minUrgency: query.minUrgency,
            keyword: query.keyword,
            sentiment: query.sentiment,
            location: query.location,
            from: query.from,
            to: query.to,
            minLikes: query.minLikes,
            minComments: query.minComments,
            minShares: query.minShares,
            minViews: query.minViews,
            limit: query.limit || 50,
        });
    }

    // ===== 匯出 =====
    @Get('export')
    @ApiOperation({ summary: '匯出監控資料 (CSV/JSON)' })
    @ApiQuery({ name: 'format', enum: ['csv', 'json'], required: false })
    async exportData(@Query() query: ExportQueryDto, @Res() res: Response) {
        const format = query.format || 'json';

        if (format === 'csv') {
            const csv = this.monitorService.exportToCsv(query);
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=social-monitor-export.csv');
            return res.send(csv);
        } else {
            const json = this.monitorService.exportToJson(query);
            res.setHeader('Content-Type', 'application/json');
            res.setHeader('Content-Disposition', 'attachment; filename=social-monitor-export.json');
            return res.json(json);
        }
    }

    // ===== 趨勢與統計 =====
    @Get('trends')
    @ApiOperation({ summary: '取得關鍵字趨勢' })
    @ApiResponse({ status: 200, type: [KeywordTrendDto] })
    getTrends() {
        return this.monitorService.getTrends();
    }

    @Get('stats')
    @ApiOperation({ summary: '取得監控統計' })
    @ApiResponse({ status: 200, type: MonitorStatsDto })
    getStats() {
        return this.monitorService.getStats();
    }

    // ===== 關鍵字管理 =====
    @Get('keywords')
    @ApiOperation({ summary: '取得監控關鍵字' })
    getKeywords(): string[] {
        return this.monitorService.getKeywords();
    }

    @Post('keywords')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '設定監控關鍵字' })
    setKeywords(@Body() dto: SetKeywordsDto): { keywords: string[] } {
        this.monitorService.setKeywords(dto.keywords);
        return { keywords: dto.keywords };
    }

    // ===== 排除詞管理 =====
    @Get('exclude-words')
    @ApiOperation({ summary: '取得排除詞列表' })
    getExcludeWords(): string[] {
        return this.monitorService.getExcludeWords();
    }

    @Post('exclude-words')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '設定排除詞' })
    setExcludeWords(@Body() dto: SetExcludeWordsDto): { excludeWords: string[] } {
        this.monitorService.setExcludeWords(dto.excludeWords);
        return { excludeWords: dto.excludeWords };
    }

    // ===== 貼文分析 =====
    @Post('analyze')
    @ApiOperation({ summary: '手動分析貼文' })
    @ApiResponse({ status: 201, type: PostAnalysisResponseDto })
    async analyzePost(@Body() dto: AnalyzePostDto): Promise<PostAnalysisResponseDto> {
        const result = await this.monitorService.analyzePost({
            id: `manual-${Date.now()}`,
            platform: dto.platform,
            content: dto.content,
            author: dto.author || 'unknown',
            createdAt: new Date().toISOString(),
            url: dto.url,
            likeCount: dto.likeCount,
            commentCount: dto.commentCount,
            shareCount: dto.shareCount,
            viewCount: dto.viewCount,
        });

        return {
            postId: result.postId,
            platform: result.platform,
            matchedKeywords: result.matchedKeywords,
            sentiment: result.sentiment as 'positive' | 'negative' | 'neutral',
            urgency: result.urgency,
            location: result.location || undefined,
            analyzedAt: result.analyzedAt,
        };
    }

    // ===== 資料清理 =====
    @Delete('purge')
    @ApiOperation({ summary: '清除舊資料' })
    purgeOld(@Query('maxAgeHours') maxAgeHours?: number): { purged: number } {
        const purged = this.monitorService.purgeOld(maxAgeHours || 24);
        return { purged };
    }

    // ===== 通知配置 CRUD =====
    @Get('notifications')
    @ApiOperation({ summary: '取得所有通知配置' })
    async getNotificationConfigs() {
        return this.notificationService.getConfigs();
    }

    @Post('notifications')
    @ApiOperation({ summary: '建立通知配置' })
    async createNotificationConfig(@Body() dto: CreateNotificationConfigDto) {
        return this.notificationService.createConfig(dto as any);
    }

    @Put('notifications/:id')
    @ApiOperation({ summary: '更新通知配置' })
    async updateNotificationConfig(@Param('id') id: string, @Body() dto: Partial<CreateNotificationConfigDto>) {
        return this.notificationService.updateConfig(id, dto as any);
    }

    @Delete('notifications/:id')
    @ApiOperation({ summary: '刪除通知配置' })
    async deleteNotificationConfig(@Param('id') id: string) {
        await this.notificationService.deleteConfig(id);
        return { deleted: true };
    }
}
