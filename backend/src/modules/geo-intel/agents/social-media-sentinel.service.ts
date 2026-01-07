/**
 * Social Media Sentinel Service - 社群媒體哨兵服務
 * 
 * Domain: Geo-Intelligence (地理情報中心)
 * AI Agent: Intel Agent (情報彙整官)
 * 
 * 功能：
 * - 24/7 監控社群平台 (Facebook Groups, Threads, Instagram, LINE OpenChat)
 * - 使用 Gemini AI 分析內容，過濾雜訊
 * - 自動驗證事件並標記地圖
 * - 觸發告警通知
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ConfigService } from '@nestjs/config';

// Entity for storing detected incidents
export class SocialIncident {
    id: string;
    platform: 'facebook' | 'threads' | 'instagram' | 'line_openchat';
    sourceUrl: string;
    originalContent: string;
    translatedContent?: string;
    aiAnalysis: {
        isDisasterRelated: boolean;
        confidence: number;
        incidentType: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        extractedLocation?: string;
        keywords: string[];
        summary: string;
    };
    location?: {
        lat: number;
        lng: number;
        address: string;
    };
    status: 'pending' | 'verified' | 'dismissed' | 'resolved';
    verifiedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

// Platform scraper interface
interface SocialPost {
    id: string;
    platform: string;
    content: string;
    author: string;
    timestamp: Date;
    url: string;
    images?: string[];
    location?: string;
}

@Injectable()
export class SocialMediaSentinelService {
    private readonly logger = new Logger(SocialMediaSentinelService.name);
    private genAI: GoogleGenerativeAI;
    private model: any;

    // 監控的社群平台來源
    private readonly monitoredSources = {
        facebook: [
            '台灣防災資訊網',
            '颱風論壇',
            '地震速報',
            '各縣市防災社團',
        ],
        threads: [
            '@taiwan_disaster',
            '@ncdr_tw',
            '#台灣災情',
        ],
        instagram: [
            '#颱風',
            '#地震',
            '#水災',
            '#救災',
        ],
        line_openchat: [
            '社區防災群組',
            '里長服務群',
            '志工群組',
        ],
    };

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
        // @InjectRepository(SocialIncident)
        // private readonly incidentRepo: Repository<SocialIncident>,
    ) {
        this.initializeAI();
    }

    private initializeAI() {
        const apiKey = this.configService.get<string>('GEMINI_API_KEY');
        if (apiKey) {
            this.genAI = new GoogleGenerativeAI(apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
            this.logger.log('🤖 Gemini AI initialized for Social Media Sentinel');
        } else {
            this.logger.warn('⚠️ GEMINI_API_KEY not configured, AI analysis disabled');
        }
    }

    /**
     * 每 5 分鐘執行一次社群監控掃描
     */
    @Cron(CronExpression.EVERY_5_MINUTES)
    async scanAllPlatforms(): Promise<void> {
        this.logger.log('🔍 Starting social media scan...');

        try {
            // 並行抓取所有平台
            const [fbPosts, threadsPosts, igPosts, linePosts] = await Promise.all([
                this.scrapeFacebookGroups(),
                this.scrapeThreads(),
                this.scrapeInstagram(),
                this.scrapeLineOpenChat(),
            ]);

            const allPosts = [...fbPosts, ...threadsPosts, ...igPosts, ...linePosts];
            this.logger.log(`📥 Collected ${allPosts.length} posts from all platforms`);

            // 使用 AI 分析每篇貼文
            for (const post of allPosts) {
                await this.analyzePostWithAI(post);
            }
        } catch (error) {
            this.logger.error('Social media scan failed', error);
        }
    }

    /**
     * 使用 Gemini AI 分析貼文內容
     */
    async analyzePostWithAI(post: SocialPost): Promise<SocialIncident | null> {
        if (!this.model) {
            this.logger.debug('AI model not available, skipping analysis');
            return null;
        }

        const prompt = `
你是一個災害情報分析專家。請分析以下社群媒體貼文，判斷是否與災害相關。

貼文內容：
"""
${post.content}
"""

請以 JSON 格式回答（只輸出 JSON，不要其他文字）：
{
    "isDisasterRelated": true/false,
    "confidence": 0.0-1.0,
    "incidentType": "earthquake|typhoon|flood|fire|landslide|traffic|other|none",
    "severity": "low|medium|high|critical",
    "extractedLocation": "地點名稱或 null",
    "keywords": ["關鍵字1", "關鍵字2"],
    "summary": "一句話摘要"
}

判斷標準：
- 包含具體災情描述（如：淹水、停電、道路中斷）→ 災害相關
- 一般天氣討論或新聞轉貼 → 不相關
- 包含求救、通報、警告 → 高嚴重性
- 歷史回顧或科普文章 → 不相關
`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // 解析 JSON 回應
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                this.logger.warn('AI response not valid JSON');
                return null;
            }

            const analysis = JSON.parse(jsonMatch[0]);

            // 只處理災害相關且信心度 > 0.7 的貼文
            if (analysis.isDisasterRelated && analysis.confidence > 0.7) {
                const incident: SocialIncident = {
                    id: `${post.platform}-${post.id}`,
                    platform: post.platform as any,
                    sourceUrl: post.url,
                    originalContent: post.content,
                    aiAnalysis: analysis,
                    status: 'pending',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                };

                // 嘗試地理編碼
                if (analysis.extractedLocation) {
                    incident.location = await this.geocodeLocation(analysis.extractedLocation);
                }

                // 儲存事件
                // await this.incidentRepo.save(incident);

                // 發送事件通知
                this.eventEmitter.emit('social.incident.detected', incident);

                // 如果嚴重性高，觸發即時告警
                if (analysis.severity === 'critical' || analysis.severity === 'high') {
                    this.eventEmitter.emit('alert.urgent', {
                        type: 'SOCIAL_MEDIA_INCIDENT',
                        incident,
                        message: `[${analysis.incidentType}] ${analysis.summary}`,
                    });
                }

                this.logger.log(
                    `🚨 Incident detected: [${analysis.severity}] ${analysis.incidentType} - ${analysis.summary}`,
                );

                return incident;
            }

            return null;
        } catch (error) {
            this.logger.error('AI analysis failed', error);
            return null;
        }
    }

    /**
     * 地理編碼 - 將地名轉換為座標
     */
    private async geocodeLocation(locationName: string): Promise<{ lat: number; lng: number; address: string } | undefined> {
        // 使用 Google Maps Geocoding API 或本地資料庫
        // 這裡以台灣常見地名為例
        const taiwanLocations: Record<string, { lat: number; lng: number }> = {
            '台北': { lat: 25.0330, lng: 121.5654 },
            '新北': { lat: 25.0169, lng: 121.4627 },
            '桃園': { lat: 24.9936, lng: 121.3010 },
            '台中': { lat: 24.1477, lng: 120.6736 },
            '台南': { lat: 22.9998, lng: 120.2270 },
            '高雄': { lat: 22.6273, lng: 120.3014 },
            '花蓮': { lat: 23.9910, lng: 121.6114 },
            '台東': { lat: 22.7583, lng: 121.1444 },
        };

        for (const [name, coords] of Object.entries(taiwanLocations)) {
            if (locationName.includes(name)) {
                return { ...coords, address: locationName };
            }
        }

        return undefined;
    }

    // ==================== Platform Scrapers ====================

    /**
     * 抓取 Facebook 社團貼文
     */
    private async scrapeFacebookGroups(): Promise<SocialPost[]> {
        // 實作需使用 Facebook Graph API 或第三方爬蟲服務
        // 這裡提供 stub 實作
        this.logger.debug('Scraping Facebook groups...');

        // TODO: 整合 Facebook Graph API
        // 需要: App ID, App Secret, User Access Token
        // 端點: GET /{group-id}/feed

        return [];
    }

    /**
     * 抓取 Threads 貼文
     */
    private async scrapeThreads(): Promise<SocialPost[]> {
        this.logger.debug('Scraping Threads...');

        // TODO: Threads 尚無官方 API，需使用非官方方法
        // 可考慮：
        // 1. 透過 Instagram 帳號關聯
        // 2. 使用 Puppeteer 爬蟲

        return [];
    }

    /**
     * 抓取 Instagram 貼文 (Hashtag 搜尋)
     */
    private async scrapeInstagram(): Promise<SocialPost[]> {
        this.logger.debug('Scraping Instagram hashtags...');

        // TODO: 整合 Instagram Basic Display API 或 Graph API
        // 端點: GET /ig_hashtag_search

        return [];
    }

    /**
     * 抓取 LINE OpenChat 訊息
     */
    private async scrapeLineOpenChat(): Promise<SocialPost[]> {
        this.logger.debug('Scraping LINE OpenChat...');

        // TODO: LINE 官方無 OpenChat API，可考慮：
        // 1. 使用 LINE Bot 加入群組被動接收
        // 2. 透過 LINE Notify Webhook
        // 3. 使用 LIFF App 讓用戶主動回報

        return [];
    }

    // ==================== Manual Trigger ====================

    /**
     * 手動觸發單一貼文分析
     */
    async analyzeUrl(url: string): Promise<SocialIncident | null> {
        // 根據 URL 判斷平台
        let platform: string = 'unknown';
        if (url.includes('facebook.com')) platform = 'facebook';
        else if (url.includes('threads.net')) platform = 'threads';
        else if (url.includes('instagram.com')) platform = 'instagram';

        // TODO: 實作 URL 內容抓取

        return null;
    }

    /**
     * 取得待驗證事件列表
     */
    async getPendingIncidents(): Promise<SocialIncident[]> {
        // return this.incidentRepo.find({
        //     where: { status: 'pending' },
        //     order: { createdAt: 'DESC' },
        //     take: 50,
        // });
        return [];
    }

    /**
     * 人工驗證事件
     */
    async verifyIncident(incidentId: string, verified: boolean, userId: string): Promise<void> {
        // const incident = await this.incidentRepo.findOneBy({ id: incidentId });
        // if (incident) {
        //     incident.status = verified ? 'verified' : 'dismissed';
        //     incident.verifiedBy = userId;
        //     incident.updatedAt = new Date();
        //     await this.incidentRepo.save(incident);
        //
        //     if (verified) {
        //         // 確認後更新地圖
        //         this.eventEmitter.emit('map.overlay.create', {
        //             type: 'incident',
        //             data: incident,
        //         });
        //     }
        // }
    }
}
