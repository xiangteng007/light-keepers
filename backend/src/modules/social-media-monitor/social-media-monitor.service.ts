import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { GEO_EVENTS } from '../../common/events';
import { NotificationService, AlertPayload } from './services/notification.service';

/**
 * Social Media Monitor Service
 * v3.0: 含進階篩選、互動指標、匯出、通知整合
 */
@Injectable()
export class SocialMediaMonitorService {
    private readonly logger = new Logger(SocialMediaMonitorService.name);
    private keywords: string[] = ['災害', '地震', '颱風', '水災', '火災', '救災', '避難', '土石流', '停電', '斷水', '道路中斷', '受困', '失蹤'];
    private excludeWords: string[] = ['演習', '測試', '模擬'];
    private monitoredPosts: Map<string, SocialPost> = new Map();

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly notificationService: NotificationService,
    ) { }

    // ===== 關鍵字管理 =====
    setKeywords(keywords: string[]): void {
        this.keywords = keywords;
        this.logger.log(`Keywords updated: ${keywords.join(', ')}`);
    }

    getKeywords(): string[] {
        return this.keywords;
    }

    setExcludeWords(words: string[]): void {
        this.excludeWords = words;
        this.logger.log(`Exclude words updated: ${words.join(', ')}`);
    }

    getExcludeWords(): string[] {
        return this.excludeWords;
    }

    // ===== 貼文分析 =====
    async analyzePost(post: SocialPostInput): Promise<PostAnalysis> {
        // 檢查排除詞
        const hasExcluded = this.excludeWords.some(w =>
            post.content.toLowerCase().includes(w.toLowerCase())
        );
        if (hasExcluded) {
            return {
                postId: post.id,
                platform: post.platform,
                matchedKeywords: [],
                sentiment: 'neutral',
                urgency: 0,
                location: null,
                analyzedAt: new Date(),
                excluded: true,
            };
        }

        const matchedKeywords = this.keywords.filter((k) =>
            post.content.toLowerCase().includes(k.toLowerCase()));

        const sentiment = this.analyzeSentiment(post.content);
        const urgency = this.calculateUrgency(matchedKeywords, sentiment, post);
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
            const storedPost: SocialPost = {
                ...post,
                analysis: result,
                location: location || undefined,
                likeCount: post.likeCount || 0,
                commentCount: post.commentCount || 0,
                shareCount: post.shareCount || 0,
                viewCount: post.viewCount || 0,
            };
            this.monitoredPosts.set(post.id, storedPost);

            // 發送事件
            this.eventEmitter.emit(GEO_EVENTS.SOCIAL_INTEL_DETECTED, {
                postId: post.id,
                platform: post.platform,
                keywords: matchedKeywords,
                urgency,
                location,
                timestamp: new Date(),
            });

            // 高緊急度通知
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

                // v3.0: 發送多頻道通知
                const alertPayload: AlertPayload = {
                    postId: post.id,
                    platform: post.platform,
                    content: post.content,
                    urgency,
                    location: location || undefined,
                    keywords: matchedKeywords,
                    url: post.url,
                };
                this.notificationService.sendAlert(alertPayload).catch(err =>
                    this.logger.error('Notification failed', err)
                );

                this.logger.warn(`[HIGH URGENCY] Social post detected: ${post.id} (urgency: ${urgency})`);
            }
        }

        return result;
    }

    // ===== 進階篩選 (v3.0) =====
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
        if (filter?.sentiment) {
            posts = posts.filter((p) => p.analysis?.sentiment === filter.sentiment);
        }
        if (filter?.location) {
            posts = posts.filter((p) => p.location?.includes(filter.location!));
        }
        if (filter?.from) {
            const fromDate = new Date(filter.from);
            posts = posts.filter((p) => new Date(p.createdAt) >= fromDate);
        }
        if (filter?.to) {
            const toDate = new Date(filter.to);
            posts = posts.filter((p) => new Date(p.createdAt) <= toDate);
        }
        if (filter?.minLikes) {
            posts = posts.filter((p) => (p.likeCount || 0) >= filter.minLikes!);
        }
        if (filter?.minComments) {
            posts = posts.filter((p) => (p.commentCount || 0) >= filter.minComments!);
        }
        if (filter?.minShares) {
            posts = posts.filter((p) => (p.shareCount || 0) >= filter.minShares!);
        }
        if (filter?.minViews) {
            posts = posts.filter((p) => (p.viewCount || 0) >= filter.minViews!);
        }

        return posts.slice(0, filter?.limit || 100);
    }

    // ===== 匯出 (v3.0) =====
    exportToCsv(filter?: PostFilter): string {
        const posts = this.getMonitoredPosts(filter);
        const headers = ['id', 'platform', 'author', 'content', 'urgency', 'sentiment', 'location', 'likes', 'comments', 'shares', 'views', 'keywords', 'createdAt'];

        const rows = posts.map(p => [
            p.id,
            p.platform,
            p.author || '',
            `"${(p.content || '').replace(/"/g, '""')}"`,
            p.analysis?.urgency || 0,
            p.analysis?.sentiment || '',
            p.location || '',
            p.likeCount || 0,
            p.commentCount || 0,
            p.shareCount || 0,
            p.viewCount || 0,
            (p.analysis?.matchedKeywords || []).join(';'),
            p.createdAt,
        ].join(','));

        return [headers.join(','), ...rows].join('\n');
    }

    exportToJson(filter?: PostFilter): object[] {
        return this.getMonitoredPosts(filter);
    }

    // ===== 趨勢與統計 =====
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

    // ===== 私有方法 =====
    private analyzeSentiment(content: string): 'positive' | 'negative' | 'neutral' {
        const negativeWords = ['危險', '嚴重', '受困', '傷亡', '損失', '崩塌', '遇難', '失蹤'];
        const positiveWords = ['安全', '救援成功', '恢復', '感謝', '解除'];
        const negCount = negativeWords.filter((w) => content.includes(w)).length;
        const posCount = positiveWords.filter((w) => content.includes(w)).length;
        if (negCount > posCount) return 'negative';
        if (posCount > negCount) return 'positive';
        return 'neutral';
    }

    private calculateUrgency(keywords: string[], sentiment: string, post: SocialPostInput): number {
        let urgency = keywords.length * 2;
        if (sentiment === 'negative') urgency += 3;
        // v3.0: 互動指標加權
        if ((post.shareCount || 0) > 100) urgency += 2;
        if ((post.commentCount || 0) > 50) urgency += 1;
        return Math.min(10, urgency);
    }

    private extractLocation(content: string): string | null {
        const cityPatterns = ['台北', '新北', '桃園', '台中', '台南', '高雄', '基隆', '新竹', '嘉義', '屏東', '宜蘭', '花蓮', '台東'];
        for (const city of cityPatterns) {
            if (content.includes(city)) return city;
        }
        return null;
    }
}

// Types (exported)
export interface SocialPostInput {
    id: string;
    platform: string;
    content: string;
    author: string;
    createdAt: string;
    url?: string;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    viewCount?: number;
}

export interface SocialPost extends SocialPostInput {
    analysis?: PostAnalysis;
    location?: string;
    likeCount?: number;
    commentCount?: number;
    shareCount?: number;
    viewCount?: number;
}

export interface PostAnalysis {
    postId: string;
    platform: string;
    matchedKeywords: string[];
    sentiment: string;
    urgency: number;
    location: string | null;
    analyzedAt: Date;
    excluded?: boolean;
}

export interface PostFilter {
    platform?: string;
    minUrgency?: number;
    keyword?: string;
    sentiment?: string;
    location?: string;
    from?: string;
    to?: string;
    minLikes?: number;
    minComments?: number;
    minShares?: number;
    minViews?: number;
    limit?: number;
}

export interface KeywordTrend { keyword: string; count: number; }
export interface MonitorStats { totalPosts: number; byPlatform: Record<string, number>; byUrgency: Record<string, number>; lastUpdated: Date; }
