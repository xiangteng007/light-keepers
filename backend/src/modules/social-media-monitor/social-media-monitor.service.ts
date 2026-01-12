import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GEO_EVENTS } from '../../common/events';

/**
 * Social Media Monitor Service
 * v2.0: Monitor social media for disaster-related keywords with event emission
 */
@Injectable()
export class SocialMediaMonitorService {
    private readonly logger = new Logger(SocialMediaMonitorService.name);
    private keywords: string[] = ['災害', '地震', '颱風', '水災', '火災', '救災', '避難', '土石流', '停電', '斷水', '道路中斷', '受困', '失蹤'];
    private monitoredPosts: Map<string, SocialPost> = new Map();

    constructor(private readonly eventEmitter: EventEmitter2) { }

    /**
     * 設定關鍵字
     */
    setKeywords(keywords: string[]): void {
        this.keywords = keywords;
        this.logger.log(`Keywords updated: ${keywords.join(', ')}`);
    }

    /**
     * 取得關鍵字
     */
    getKeywords(): string[] {
        return this.keywords;
    }

    /**
     * 分析貼文
     */
    async analyzePost(post: SocialPostInput): Promise<PostAnalysis> {
        const matchedKeywords = this.keywords.filter((k) =>
            post.content.toLowerCase().includes(k.toLowerCase()));

        const sentiment = this.analyzeSentiment(post.content);
        const urgency = this.calculateUrgency(matchedKeywords, sentiment);
        const location = this.extractLocation(post.content);

        const result: PostAnalysis = {
            postId: post.id,
            platform: post.platform,
            matchedKeywords,
            sentiment,
            urgency,
            location,
            analyzedAt: new Date(),
        };

        if (matchedKeywords.length > 0) {
            this.monitoredPosts.set(post.id, { ...post, analysis: result });

            // v2.0: 發送社群情資偵測事件
            this.eventEmitter.emit(GEO_EVENTS.SOCIAL_INTEL_DETECTED, {
                postId: post.id,
                platform: post.platform,
                keywords: matchedKeywords,
                urgency,
                location,
                timestamp: new Date(),
            });

            // 高緊急度 (>=7) 發送警報事件
            if (urgency >= 7) {
                this.eventEmitter.emit(GEO_EVENTS.ALERT_RECEIVED, {
                    source: 'social_media',
                    postId: post.id,
                    platform: post.platform,
                    urgency,
                    location,
                    content: post.content.substring(0, 200),
                    timestamp: new Date(),
                });
                this.logger.warn(`[HIGH URGENCY] Social post detected: ${post.id} (urgency: ${urgency})`);
            }
        }

        return result;
    }

    /**
     * 取得監控結果
     */
    getMonitoredPosts(filter?: PostFilter): SocialPost[] {
        let posts = Array.from(this.monitoredPosts.values());

        if (filter?.platform) {
            posts = posts.filter((p) => p.platform === filter.platform);
        }
        if (filter?.minUrgency) {
            posts = posts.filter((p) => (p.analysis?.urgency || 0) >= filter.minUrgency!);
        }
        if (filter?.keyword) {
            posts = posts.filter((p) => p.analysis?.matchedKeywords.includes(filter.keyword!));
        }

        return posts.slice(0, filter?.limit || 100);
    }

    /**
     * 取得趨勢
     */
    getTrends(): KeywordTrend[] {
        const counts: Record<string, number> = {};

        for (const post of this.monitoredPosts.values()) {
            for (const kw of post.analysis?.matchedKeywords || []) {
                counts[kw] = (counts[kw] || 0) + 1;
            }
        }

        return Object.entries(counts)
            .map(([keyword, count]) => ({ keyword, count }))
            .sort((a, b) => b.count - a.count);
    }

    /**
     * 取得統計
     */
    getStats(): MonitorStats {
        const posts = Array.from(this.monitoredPosts.values());
        const byPlatform: Record<string, number> = {};
        const byUrgency: Record<string, number> = { high: 0, medium: 0, low: 0 };

        for (const post of posts) {
            byPlatform[post.platform] = (byPlatform[post.platform] || 0) + 1;
            const urgency = post.analysis?.urgency || 0;
            if (urgency >= 7) byUrgency['high']++;
            else if (urgency >= 4) byUrgency['medium']++;
            else byUrgency['low']++;
        }

        return {
            totalPosts: posts.length,
            byPlatform,
            byUrgency,
            lastUpdated: new Date(),
        };
    }

    /**
     * 清除舊資料
     */
    purgeOld(maxAgeHours: number = 24): number {
        const cutoff = Date.now() - maxAgeHours * 3600000;
        let purged = 0;

        for (const [id, post] of this.monitoredPosts) {
            if (new Date(post.createdAt).getTime() < cutoff) {
                this.monitoredPosts.delete(id);
                purged++;
            }
        }

        return purged;
    }

    private analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
        const negativeWords = ['危險', '嚴重', '受困', '傷亡', '損失', '崩塌'];
        const positiveWords = ['安全', '救援成功', '恢復', '感謝'];

        const negCount = negativeWords.filter((w) => content.includes(w)).length;
        const posCount = positiveWords.filter((w) => content.includes(w)).length;

        if (negCount > posCount) return 'negative';
        if (posCount > negCount) return 'positive';
        return 'neutral';
    }

    private calculateUrgency(keywords: string[], sentiment: string): number {
        let urgency = keywords.length * 2;
        if (sentiment === 'negative') urgency += 3;
        return Math.min(10, urgency);
    }

    private extractLocation(content: string): string | null {
        const cityPatterns = ['台北', '新北', '桃園', '台中', '台南', '高雄'];
        for (const city of cityPatterns) {
            if (content.includes(city)) return city;
        }
        return null;
    }
}

// Types (exported)
export interface SocialPostInput { id: string; platform: string; content: string; author: string; createdAt: string; url?: string; }
export interface SocialPost extends SocialPostInput { analysis?: PostAnalysis; }
export interface PostAnalysis { postId: string; platform: string; matchedKeywords: string[]; sentiment: string; urgency: number; location: string | null; analyzedAt: Date; }
export interface PostFilter { platform?: string; minUrgency?: number; keyword?: string; limit?: number; }
export interface KeywordTrend { keyword: string; count: number; }
export interface MonitorStats { totalPosts: number; byPlatform: Record<string, number>; byUrgency: Record<string, number>; lastUpdated: Date; }

