import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
} from '@nestjs/common';
import { CourseScraperService } from './course-scraper.service';

/**
 * 課程爬蟲 API
 * 管理爬蟲來源和觸發爬取
 */
@Controller('training/scraper')
export class CourseScraperController {
    constructor(private readonly scraperService: CourseScraperService) { }

    // ==================== 爬蟲來源管理 ====================

    /**
     * 取得所有爬蟲來源
     */
    @Get('sources')
    async getSources() {
        const sources = await this.scraperService.getAllSources();
        return {
            success: true,
            data: sources,
            count: sources.length,
        };
    }

    /**
     * 新增爬蟲來源
     */
    @Post('sources')
    async createSource(@Body() body: {
        name: string;
        url: string;
        description?: string;
        selectors?: Record<string, string>;
        cronSchedule?: string;
    }) {
        const source = await this.scraperService.createSource(body);
        return {
            success: true,
            message: '爬蟲來源已新增',
            data: source,
        };
    }

    /**
     * 更新爬蟲來源
     */
    @Put('sources/:id')
    async updateSource(
        @Param('id') id: string,
        @Body() body: {
            name?: string;
            url?: string;
            description?: string;
            selectors?: Record<string, string>;
            isActive?: boolean;
            cronSchedule?: string;
        }
    ) {
        const source = await this.scraperService.updateSource(id, body);
        return {
            success: true,
            message: '爬蟲來源已更新',
            data: source,
        };
    }

    /**
     * 刪除爬蟲來源
     */
    @Delete('sources/:id')
    async deleteSource(@Param('id') id: string) {
        await this.scraperService.deleteSource(id);
        return {
            success: true,
            message: '爬蟲來源已刪除',
        };
    }

    // ==================== 爬蟲操作 ====================

    /**
     * 手動觸發爬取 (全部或單一來源)
     */
    @Post('scrape')
    async triggerScrape(@Query('sourceId') sourceId?: string) {
        const result = await this.scraperService.triggerScrape(sourceId);
        return {
            success: true,
            message: `爬取完成: ${result.success} 成功, ${result.failed} 失敗`,
            data: result,
        };
    }

    /**
     * 取得已爬取的課程
     */
    @Get('courses')
    async getScrapedCourses(@Query('sourceId') sourceId?: string) {
        const courses = await this.scraperService.getScrapedCourses(sourceId);
        return {
            success: true,
            data: courses,
            count: courses.length,
        };
    }
}
