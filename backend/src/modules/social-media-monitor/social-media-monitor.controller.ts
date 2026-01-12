/**
 * social-media-monitor.controller.ts
 * 
 * v2.0: 社群媒體監視 API Controller
 */
import {
    Controller,
    Get,
    Post,
    Delete,
    Body,
    Query,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SocialMediaMonitorService } from './social-media-monitor.service';
import {
    AnalyzePostDto,
    SetKeywordsDto,
    GetPostsQueryDto,
    PostAnalysisResponseDto,
    KeywordTrendDto,
    MonitorStatsDto,
} from './dto/social-monitor.dto';

@ApiTags('Social Media Monitor (社群監視)')
@Controller('social-monitor')
export class SocialMediaMonitorController {
    constructor(private readonly monitorService: SocialMediaMonitorService) { }

    /**
     * 取得監控中的貼文列表
     */
    @Get('posts')
    @ApiOperation({ summary: '取得監控貼文列表' })
    @ApiResponse({ status: 200, description: '成功取得' })
    async getPosts(@Query() query: GetPostsQueryDto) {
        return this.monitorService.getMonitoredPosts({
            platform: query.platform,
            minUrgency: query.minUrgency,
            keyword: query.keyword,
            limit: query.limit || 50,
        });
    }

    /**
     * 取得關鍵字趨勢
     */
    @Get('trends')
    @ApiOperation({ summary: '取得關鍵字趨勢' })
    @ApiResponse({ status: 200, type: [KeywordTrendDto] })
    getTrends() {
        return this.monitorService.getTrends();
    }

    /**
     * 取得監控統計
     */
    @Get('stats')
    @ApiOperation({ summary: '取得監控統計' })
    @ApiResponse({ status: 200, type: MonitorStatsDto })
    getStats() {
        return this.monitorService.getStats();
    }

    /**
     * 取得目前關鍵字
     */
    @Get('keywords')
    @ApiOperation({ summary: '取得監控關鍵字' })
    getKeywords(): string[] {
        return this.monitorService.getKeywords();
    }

    /**
     * 設定監控關鍵字
     */
    @Post('keywords')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '設定監控關鍵字' })
    setKeywords(@Body() dto: SetKeywordsDto): { keywords: string[] } {
        this.monitorService.setKeywords(dto.keywords);
        return { keywords: dto.keywords };
    }

    /**
     * 手動分析貼文
     */
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

    /**
     * 清除舊資料
     */
    @Delete('purge')
    @ApiOperation({ summary: '清除舊資料' })
    purgeOld(@Query('maxAgeHours') maxAgeHours?: number): { purged: number } {
        const purged = this.monitorService.purgeOld(maxAgeHours || 24);
        return { purged };
    }
}
