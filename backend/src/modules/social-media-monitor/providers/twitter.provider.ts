/**
 * Twitter/X API v2 Provider
 * 
 * Fetches tweets using Twitter API v2
 * v1.0: Search tweets, user timeline
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface Tweet {
    id: string;
    text: string;
    author_id?: string;
    created_at: string;
    public_metrics?: {
        retweet_count: number;
        reply_count: number;
        like_count: number;
        quote_count: number;
        impression_count?: number;
    };
    entities?: {
        hashtags?: { tag: string }[];
        mentions?: { username: string }[];
        urls?: { expanded_url: string }[];
    };
    geo?: {
        place_id?: string;
        coordinates?: { type: string; coordinates: number[] };
    };
}

export interface TwitterUser {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
}

export interface TwitterSearchResponse {
    data?: Tweet[];
    includes?: {
        users?: TwitterUser[];
    };
    meta?: {
        next_token?: string;
        result_count: number;
    };
}

@Injectable()
export class TwitterProvider {
    private readonly logger = new Logger(TwitterProvider.name);
    private readonly client: AxiosInstance;
    private readonly bearerToken: string;
    private readonly isConfigured: boolean;

    constructor(private readonly configService: ConfigService) {
        this.bearerToken = this.configService.get<string>('TWITTER_BEARER_TOKEN', '');
        this.isConfigured = !!this.bearerToken;

        this.client = axios.create({
            baseURL: 'https://api.twitter.com/2',
            timeout: 10000,
            headers: this.isConfigured ? {
                Authorization: `Bearer ${this.bearerToken}`,
            } : {},
        });

        if (!this.isConfigured) {
            this.logger.warn('Twitter API not configured - using mock mode');
        }
    }

    /**
     * Check if provider is configured
     */
    isReady(): boolean {
        return this.isConfigured;
    }

    /**
     * Search recent tweets
     */
    async searchTweets(query: string, maxResults: number = 25): Promise<Tweet[]> {
        if (!this.isConfigured) {
            return this.getMockTweets(query, maxResults);
        }

        try {
            const response = await this.client.get<TwitterSearchResponse>('/tweets/search/recent', {
                params: {
                    query: `${query} lang:zh -is:retweet`,
                    'tweet.fields': 'created_at,public_metrics,entities,geo',
                    'user.fields': 'name,username,profile_image_url',
                    expansions: 'author_id',
                    max_results: Math.min(maxResults, 100),
                },
            });

            this.logger.log(`Found ${response.data.meta?.result_count || 0} tweets for query: ${query}`);
            return response.data.data || [];
        } catch (error: any) {
            this.logger.error(`Failed to search tweets: ${error.message}`);
            return [];
        }
    }

    /**
     * Get user's recent tweets
     */
    async getUserTweets(userId: string, maxResults: number = 25): Promise<Tweet[]> {
        if (!this.isConfigured) {
            return this.getMockTweets('user_timeline', maxResults);
        }

        try {
            const response = await this.client.get<TwitterSearchResponse>(`/users/${userId}/tweets`, {
                params: {
                    'tweet.fields': 'created_at,public_metrics,entities,geo',
                    max_results: Math.min(maxResults, 100),
                },
            });

            return response.data.data || [];
        } catch (error: any) {
            this.logger.error(`Failed to fetch user tweets: ${error.message}`);
            return [];
        }
    }

    /**
     * Get single tweet by ID
     */
    async getTweet(tweetId: string): Promise<Tweet | null> {
        if (!this.isConfigured) {
            return this.getMockSingleTweet(tweetId);
        }

        try {
            const response = await this.client.get<{ data: Tweet }>(`/tweets/${tweetId}`, {
                params: {
                    'tweet.fields': 'created_at,public_metrics,entities,geo',
                    expansions: 'author_id',
                },
            });

            return response.data.data;
        } catch (error: any) {
            this.logger.error(`Failed to fetch tweet ${tweetId}: ${error.message}`);
            return null;
        }
    }

    // ===== Mock Data for Development =====

    private getMockTweets(query: string, maxResults: number): Tweet[] {
        const mockTweets: Tweet[] = [];
        const samples = [
            { text: '🚨 台北市信義區傳出地震災情，目前消防隊已抵達現場 #地震 #台北', keyword: '地震' },
            { text: '🌊 新北市三峽區因豪雨造成淹水，請民眾注意安全 #水災 #新北市', keyword: '水災' },
            { text: '💪 台中市消防局成功完成救援任務，3名受困民眾已脫困 #救災', keyword: '救災' },
            { text: '⚠️ 高雄市鳳山區已開設臨時避難所，位於鳳山國小 #避難所', keyword: '避難' },
            { text: '🚗 花蓮蘇花公路因土石流中斷，預計3天後恢復通車 #道路中斷', keyword: '土石流' },
            { text: '📢 台東縣政府發布停電通知，影響約2000戶 #停電', keyword: '停電' },
        ];

        for (let i = 0; i < Math.min(maxResults, samples.length); i++) {
            mockTweets.push({
                id: `mock_tweet_${i + 1}`,
                text: samples[i].text,
                author_id: `mock_user_${i + 1}`,
                created_at: new Date(Date.now() - i * 1800000).toISOString(),
                public_metrics: {
                    retweet_count: Math.floor(Math.random() * 50),
                    reply_count: Math.floor(Math.random() * 30),
                    like_count: Math.floor(Math.random() * 200),
                    quote_count: Math.floor(Math.random() * 10),
                },
                entities: {
                    hashtags: [{ tag: samples[i].keyword }],
                },
            });
        }

        return mockTweets;
    }

    private getMockSingleTweet(tweetId: string): Tweet {
        return {
            id: tweetId,
            text: '這是一則模擬的推文內容 #測試',
            author_id: 'mock_author',
            created_at: new Date().toISOString(),
            public_metrics: {
                retweet_count: 15,
                reply_count: 8,
                like_count: 67,
                quote_count: 3,
            },
        };
    }
}
