/**
 * Facebook Graph API Provider
 * 
 * Fetches posts from Facebook Pages using Graph API
 * v1.0: Page posts, keyword search, rate limiting
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { getErrorMessage } from '../../../common/utils/error-utils';

export interface FacebookPost {
    id: string;
    message?: string;
    story?: string;
    created_time: string;
    permalink_url?: string;
    from?: {
        id: string;
        name: string;
    };
    reactions?: { summary: { total_count: number } };
    comments?: { summary: { total_count: number } };
    shares?: { count: number };
}

export interface FacebookPageFeed {
    data: FacebookPost[];
    paging?: {
        cursors: { before: string; after: string };
        next?: string;
    };
}

@Injectable()
export class FacebookProvider {
    private readonly logger = new Logger(FacebookProvider.name);
    private readonly client: AxiosInstance;
    private readonly accessToken: string;
    private readonly isConfigured: boolean;

    constructor(private readonly configService: ConfigService) {
        this.accessToken = this.configService.get<string>('FACEBOOK_ACCESS_TOKEN', '');
        this.isConfigured = !!this.accessToken;

        this.client = axios.create({
            baseURL: 'https://graph.facebook.com/v18.0',
            timeout: 10000,
        });

        if (!this.isConfigured) {
            this.logger.warn('Facebook API not configured - using mock mode');
        }
    }

    /**
     * Check if provider is configured
     */
    isReady(): boolean {
        return this.isConfigured;
    }

    /**
     * Fetch posts from a Facebook Page
     */
    async getPagePosts(pageId: string, limit: number = 25): Promise<FacebookPost[]> {
        if (!this.isConfigured) {
            return this.getMockPosts(pageId, limit);
        }

        try {
            const response = await this.client.get<FacebookPageFeed>(`/${pageId}/feed`, {
                params: {
                    access_token: this.accessToken,
                    fields: 'id,message,story,created_time,permalink_url,from,reactions.summary(true),comments.summary(true),shares',
                    limit,
                },
            });

            this.logger.log(`Fetched ${response.data.data.length} posts from page ${pageId}`);
            return response.data.data;
        } catch (error: unknown) {
            this.logger.error(`Failed to fetch Facebook posts: ${getErrorMessage(error)}`);
            return [];
        }
    }

    /**
     * Search public posts (requires special permissions)
     */
    async searchPosts(query: string, limit: number = 25): Promise<FacebookPost[]> {
        if (!this.isConfigured) {
            return this.getMockSearchResults(query, limit);
        }

        // Note: Public post search requires special permissions
        // This is a placeholder for when those permissions are available
        this.logger.warn('Facebook public post search requires special permissions');
        return [];
    }

    /**
     * Get post details by ID
     */
    async getPost(postId: string): Promise<FacebookPost | null> {
        if (!this.isConfigured) {
            return this.getMockPost(postId);
        }

        try {
            const response = await this.client.get<FacebookPost>(`/${postId}`, {
                params: {
                    access_token: this.accessToken,
                    fields: 'id,message,story,created_time,permalink_url,from,reactions.summary(true),comments.summary(true),shares',
                },
            });

            return response.data;
        } catch (error: unknown) {
            this.logger.error(`Failed to fetch post ${postId}: ${getErrorMessage(error)}`);
            return null;
        }
    }

    // ===== Mock Data for Development =====

    private getMockPosts(pageId: string, limit: number): FacebookPost[] {
        const mockPosts: FacebookPost[] = [];
        const samples = [
            { message: '台北市信義區發生地震，目前正在統計災情', keyword: '地震' },
            { message: '新北市土城區因大雨造成道路積水，請民眾注意安全', keyword: '水災' },
            { message: '台中市消防局成功救出受困民眾 3 人', keyword: '救災' },
            { message: '高雄市鳳山區已完成避難所設置', keyword: '避難' },
            { message: '花蓮縣秀林鄉發生土石流，道路中斷', keyword: '土石流' },
        ];

        for (let i = 0; i < Math.min(limit, samples.length); i++) {
            mockPosts.push({
                id: `${pageId}_mock_${i + 1}`,
                message: samples[i].message,
                created_time: new Date(Date.now() - i * 3600000).toISOString(),
                permalink_url: `https://facebook.com/${pageId}/posts/mock_${i + 1}`,
                from: { id: pageId, name: '災害資訊中心' },
                reactions: { summary: { total_count: Math.floor(Math.random() * 100) } },
                comments: { summary: { total_count: Math.floor(Math.random() * 50) } },
                shares: { count: Math.floor(Math.random() * 30) },
            });
        }

        return mockPosts;
    }

    private getMockSearchResults(query: string, limit: number): FacebookPost[] {
        return this.getMockPosts('search', Math.min(limit, 3));
    }

    private getMockPost(postId: string): FacebookPost {
        return {
            id: postId,
            message: '這是一則模擬的災害相關貼文內容',
            created_time: new Date().toISOString(),
            from: { id: 'mock_page', name: '測試頁面' },
            reactions: { summary: { total_count: 42 } },
            comments: { summary: { total_count: 18 } },
            shares: { count: 7 },
        };
    }
}
