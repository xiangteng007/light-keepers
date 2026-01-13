/**
 * Instagram Basic Display API Provider
 * 
 * Fetches media from Instagram accounts
 * v1.0: User media, hashtag search (limited)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface InstagramMedia {
    id: string;
    caption?: string;
    media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
    media_url: string;
    permalink: string;
    thumbnail_url?: string;
    timestamp: string;
    username: string;
    like_count?: number;
    comments_count?: number;
}

export interface InstagramFeed {
    data: InstagramMedia[];
    paging?: {
        cursors: { before: string; after: string };
        next?: string;
    };
}

@Injectable()
export class InstagramProvider {
    private readonly logger = new Logger(InstagramProvider.name);
    private readonly client: AxiosInstance;
    private readonly accessToken: string;
    private readonly isConfigured: boolean;

    constructor(private readonly configService: ConfigService) {
        this.accessToken = this.configService.get<string>('INSTAGRAM_ACCESS_TOKEN', '');
        this.isConfigured = !!this.accessToken;

        this.client = axios.create({
            baseURL: 'https://graph.instagram.com',
            timeout: 10000,
        });

        if (!this.isConfigured) {
            this.logger.warn('Instagram API not configured - using mock mode');
        }
    }

    /**
     * Check if provider is configured
     */
    isReady(): boolean {
        return this.isConfigured;
    }

    /**
     * Fetch user's media
     */
    async getUserMedia(userId: string = 'me', limit: number = 25): Promise<InstagramMedia[]> {
        if (!this.isConfigured) {
            return this.getMockMedia(limit);
        }

        try {
            const response = await this.client.get<InstagramFeed>(`/${userId}/media`, {
                params: {
                    access_token: this.accessToken,
                    fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
                    limit,
                },
            });

            this.logger.log(`Fetched ${response.data.data.length} media items`);
            return response.data.data;
        } catch (error: any) {
            this.logger.error(`Failed to fetch Instagram media: ${error.message}`);
            return [];
        }
    }

    /**
     * Search by hashtag (requires Instagram Graph API for Business)
     */
    async searchHashtag(hashtag: string, limit: number = 25): Promise<InstagramMedia[]> {
        if (!this.isConfigured) {
            return this.getMockHashtagResults(hashtag, limit);
        }

        // Note: Hashtag search requires Instagram Graph API (Business Account)
        this.logger.warn('Instagram hashtag search requires Business API');
        return [];
    }

    /**
     * Get single media by ID
     */
    async getMedia(mediaId: string): Promise<InstagramMedia | null> {
        if (!this.isConfigured) {
            return this.getMockSingleMedia(mediaId);
        }

        try {
            const response = await this.client.get<InstagramMedia>(`/${mediaId}`, {
                params: {
                    access_token: this.accessToken,
                    fields: 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,username',
                },
            });

            return response.data;
        } catch (error: any) {
            this.logger.error(`Failed to fetch media ${mediaId}: ${error.message}`);
            return null;
        }
    }

    // ===== Mock Data for Development =====

    private getMockMedia(limit: number): InstagramMedia[] {
        const mockMedia: InstagramMedia[] = [];
        const samples = [
            { caption: '#台北 今日地震災情報導 #地震 #災害' },
            { caption: '消防隊員正在進行救援行動 💪 #救災 #英雄' },
            { caption: '避難所物資充足，請民眾放心 #避難 #防災' },
            { caption: '道路搶修中，預計明日恢復通行 #道路中斷' },
            { caption: '感謝所有志工的付出！ #志工 #感恩' },
        ];

        for (let i = 0; i < Math.min(limit, samples.length); i++) {
            mockMedia.push({
                id: `mock_ig_${i + 1}`,
                caption: samples[i].caption,
                media_type: 'IMAGE',
                media_url: `https://picsum.photos/seed/${i}/640/640`,
                permalink: `https://instagram.com/p/mock_${i + 1}`,
                timestamp: new Date(Date.now() - i * 7200000).toISOString(),
                username: 'disaster_response_tw',
                like_count: Math.floor(Math.random() * 500),
                comments_count: Math.floor(Math.random() * 100),
            });
        }

        return mockMedia;
    }

    private getMockHashtagResults(hashtag: string, limit: number): InstagramMedia[] {
        const media = this.getMockMedia(Math.min(limit, 3));
        return media.map(m => ({
            ...m,
            caption: `#${hashtag} ${m.caption}`,
        }));
    }

    private getMockSingleMedia(mediaId: string): InstagramMedia {
        return {
            id: mediaId,
            caption: '這是一則模擬的 Instagram 貼文',
            media_type: 'IMAGE',
            media_url: 'https://picsum.photos/640/640',
            permalink: `https://instagram.com/p/${mediaId}`,
            timestamp: new Date().toISOString(),
            username: 'mock_user',
            like_count: 123,
            comments_count: 45,
        };
    }
}
