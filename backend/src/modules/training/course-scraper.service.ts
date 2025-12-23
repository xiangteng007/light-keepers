import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ScrapingSource } from './scraping-source.entity';
import { ScrapedCourse } from './scraped-course.entity';
import * as cheerio from 'cheerio';

/**
 * 課程爬蟲服務
 * 定期從設定的外部網站爬取課程資訊
 */
@Injectable()
export class CourseScraperService {
    private readonly logger = new Logger(CourseScraperService.name);

    constructor(
        @InjectRepository(ScrapingSource)
        private scrapingSourceRepo: Repository<ScrapingSource>,
        @InjectRepository(ScrapedCourse)
        private scrapedCourseRepo: Repository<ScrapedCourse>,
    ) { }

    /**
     * 每天早上 6 點自動執行爬蟲
     */
    @Cron(CronExpression.EVERY_DAY_AT_6AM)
    async scheduledScrape() {
        this.logger.log('🕷️ 開始執行排程課程爬蟲...');
        await this.scrapeAllSources();
    }

    /**
     * 爬取所有啟用的來源
     */
    async scrapeAllSources(): Promise<{ success: number; failed: number }> {
        const sources = await this.scrapingSourceRepo.find({ where: { isActive: true } });
        let success = 0, failed = 0;

        for (const source of sources) {
            try {
                await this.scrapeSource(source.id);
                success++;
            } catch (error) {
                failed++;
                this.logger.error(`爬取 ${source.name} 失敗: ${error.message}`);
            }
        }

        this.logger.log(`🕷️ 爬蟲完成: ${success} 成功, ${failed} 失敗`);
        return { success, failed };
    }

    /**
     * 爬取單一來源
     */
    async scrapeSource(sourceId: string): Promise<ScrapedCourse[]> {
        const source = await this.scrapingSourceRepo.findOne({ where: { id: sourceId } });
        if (!source) throw new Error('來源不存在');

        this.logger.log(`🕷️ 開始爬取: ${source.name} (${source.url})`);

        try {
            // 抓取網頁內容
            const response = await fetch(source.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.8',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const html = await response.text();
            const courses = await this.parseCoursePage(source, html);

            // 更新來源狀態
            await this.scrapingSourceRepo.update(sourceId, {
                lastScrapedAt: new Date(),
                lastScrapedStatus: 'success',
                lastScrapedCount: courses.length,
                lastError: undefined,
            });

            this.logger.log(`✅ ${source.name}: 成功爬取 ${courses.length} 門課程`);
            return courses;

        } catch (error) {
            // 記錄錯誤
            await this.scrapingSourceRepo.update(sourceId, {
                lastScrapedAt: new Date(),
                lastScrapedStatus: 'failed',
                lastError: error.message,
            });
            throw error;
        }
    }

    /**
     * 解析課程頁面
     */
    private async parseCoursePage(source: ScrapingSource, html: string): Promise<ScrapedCourse[]> {
        const $ = cheerio.load(html);
        const courses: ScrapedCourse[] = [];
        const selectors = source.selectors || {};

        // 根據不同網站使用不同的解析邏輯
        const courseSelectorMap = this.getDefaultSelectors(source.url);
        const finalSelectors = { ...courseSelectorMap, ...selectors };

        // 通用解析邏輯
        $(finalSelectors.courseList || 'table tr, .course-item, article').each((index, element) => {
            try {
                const $el = $(element);

                // 嘗試提取課程資訊
                const title = $el.find(finalSelectors.courseTitle || 'a, .title, h3').first().text().trim();
                const dateText = $el.find(finalSelectors.courseDate || '.date, td:nth-child(2)').text().trim();
                const location = $el.find(finalSelectors.courseLocation || '.location, td:nth-child(3)').text().trim();
                const link = $el.find(finalSelectors.courseLink || 'a').first().attr('href');
                const image = $el.find(finalSelectors.courseImage || 'img').first().attr('src');

                // 只有標題存在才儲存
                if (title && title.length > 2) {
                    const fullUrl = link ? new URL(link, source.url).href : source.url;
                    const externalId = `${source.id}-${Buffer.from(title).toString('base64').substring(0, 50)}`;

                    courses.push({
                        sourceId: source.id,
                        title,
                        courseDate: dateText || undefined,
                        location: location || undefined,
                        originalUrl: fullUrl,
                        imageUrl: image ? new URL(image, source.url).href : undefined,
                        organizer: source.name,
                        externalId,
                    } as ScrapedCourse);
                }
            } catch (e) {
                // 忽略單一項目解析錯誤
            }
        });

        // 儲存到資料庫 (upsert)
        for (const course of courses) {
            await this.scrapedCourseRepo.upsert(course, ['externalId']);
        }

        return courses;
    }

    /**
     * 根據網站 URL 取得預設選擇器
     */
    private getDefaultSelectors(url: string): Record<string, string> {
        if (url.includes('angel-wings.tw')) {
            return {
                courseList: '.course-list li, table tr',
                courseTitle: 'a, td:first-child',
                courseDate: '.date, td:nth-child(2)',
            };
        }
        if (url.includes('sfast.org')) {
            return {
                courseList: '.product-item, table tr',
                courseTitle: '.product-name, a',
                courseDate: '.product-date',
            };
        }
        if (url.includes('wangyingfoundation.org')) {
            return {
                courseList: 'table tr, .course-row',
                courseTitle: 'td:first-child a, .course-name',
                courseDate: 'td:nth-child(2)',
            };
        }
        if (url.includes('emt.org.tw')) {
            return {
                courseList: 'table tbody tr',
                courseTitle: 'td:first-child',
                courseDate: 'td:nth-child(2)',
                courseLocation: 'td:nth-child(3)',
            };
        }
        return {};
    }

    // ==================== CRUD 操作 ====================

    /**
     * 取得所有爬蟲來源
     */
    async getAllSources(): Promise<ScrapingSource[]> {
        return this.scrapingSourceRepo.find({ order: { createdAt: 'DESC' } });
    }

    /**
     * 新增爬蟲來源
     */
    async createSource(data: Partial<ScrapingSource>): Promise<ScrapingSource> {
        const source = this.scrapingSourceRepo.create(data);
        return this.scrapingSourceRepo.save(source);
    }

    /**
     * 更新爬蟲來源
     */
    async updateSource(id: string, data: Partial<ScrapingSource>): Promise<ScrapingSource | null> {
        await this.scrapingSourceRepo.update(id, data);
        return this.scrapingSourceRepo.findOne({ where: { id } });
    }

    /**
     * 刪除爬蟲來源
     */
    async deleteSource(id: string): Promise<void> {
        await this.scrapingSourceRepo.delete(id);
    }

    /**
     * 取得已爬取的課程
     */
    async getScrapedCourses(sourceId?: string): Promise<ScrapedCourse[]> {
        const where = sourceId ? { sourceId } : {};
        return this.scrapedCourseRepo.find({
            where,
            order: { scrapedAt: 'DESC' },
            take: 100,
        });
    }

    /**
     * 手動觸發爬取
     */
    async triggerScrape(sourceId?: string): Promise<{ success: number; failed: number }> {
        if (sourceId) {
            await this.scrapeSource(sourceId);
            return { success: 1, failed: 0 };
        }
        return this.scrapeAllSources();
    }
}
