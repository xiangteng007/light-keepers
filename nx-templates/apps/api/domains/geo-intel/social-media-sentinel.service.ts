/**
 * Social Media Sentinel Service - Stub/Mock Implementation
 * File: apps/api/src/app/domains/geo-intel/social-media-sentinel.service.ts
 * 
 * 🔍 Polls social media for disaster-related posts.
 * 
 * STUB MODE: Generates fake disaster posts for testing the Intel Agent
 * without requiring real API keys (Instagram/Facebook Graph API).
 * 
 * Production Mode: Replace `generateFakePost()` with real API calls.
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import {
    GEO_INTEL_EVENTS,
    SocialMediaAlertEvent,
} from '@light-keepers/shared/events';
import { GeoLocationDto } from '@light-keepers/shared/dtos';

// ============================================================
// Configuration
// ============================================================

interface SocialMediaConfig {
    enabled: boolean;
    stubMode: boolean;
    pollIntervalSeconds: number;
    platforms: ('instagram' | 'facebook' | 'twitter' | 'line')[];
    keywords: string[];
}

const DEFAULT_CONFIG: SocialMediaConfig = {
    enabled: true,
    stubMode: true, // 👈 Toggle this for production
    pollIntervalSeconds: 60,
    platforms: ['instagram', 'facebook'],
    keywords: [
        // Chinese keywords
        '地震', '淹水', '水災', '土石流', '火災', '颱風', '海嘯', '救援', '失蹤',
        // English keywords
        'earthquake', 'flood', 'fire', 'typhoon', 'rescue', 'emergency',
        // Hashtags
        '#高雄', '#台南', '#屏東', '#嘉義', '#災害', '#救災',
    ],
};

// ============================================================
// Fake Data Generator (Stub Mode)
// ============================================================

const FAKE_POSTS_POOL = [
    {
        content: '剛剛三民區這邊淹得好嚴重！水已經到膝蓋了 #高雄 #淹水 #救援',
        location: { latitude: 22.6533, longitude: 120.3014, address: '高雄市三民區' },
        keywords: ['淹水', '救援', '#高雄'],
        severity: 0.8,
    },
    {
        content: '左營這邊有地震嗎？房子晃很大 #高雄 #地震',
        location: { latitude: 22.6889, longitude: 120.2933, address: '高雄市左營區' },
        keywords: ['地震', '#高雄'],
        severity: 0.6,
    },
    {
        content: 'Flood warning in Kaohsiung! Be careful everyone #emergency #flood',
        location: { latitude: 22.6273, longitude: 120.3014, address: 'Kaohsiung City' },
        keywords: ['flood', 'emergency'],
        severity: 0.7,
    },
    {
        content: '屏東市區大樓火災！消防車正在趕過去 #屏東 #火災',
        location: { latitude: 22.6690, longitude: 120.4871, address: '屏東市' },
        keywords: ['火災', '#屏東'],
        severity: 0.9,
    },
    {
        content: '颱風要來了，大家記得準備防颱物資 #颱風 #台灣',
        location: { latitude: 22.6273, longitude: 120.3014, address: '台灣' },
        keywords: ['颱風'],
        severity: 0.5,
    },
    {
        content: '土石流警戒！山區居民請盡速撤離 #土石流 #嘉義',
        location: { latitude: 23.4801, longitude: 120.4491, address: '嘉義山區' },
        keywords: ['土石流', '#嘉義'],
        severity: 0.85,
    },
    {
        content: '有人看到失蹤的阿公嗎？穿藍色外套的老人家 #協尋 #高雄',
        location: { latitude: 22.6273, longitude: 120.3014, address: '高雄市' },
        keywords: ['失蹤', '#高雄'],
        severity: 0.4,
    },
];

// ============================================================
// Service Implementation
// ============================================================

@Injectable()
export class SocialMediaSentinelService implements OnModuleInit {
    private readonly logger = new Logger(SocialMediaSentinelService.name);
    private config: SocialMediaConfig;
    private postCounter = 0;

    constructor(
        private readonly eventEmitter: EventEmitter2,
        private readonly configService: ConfigService,
    ) {
        // Load config from environment or use defaults
        this.config = {
            ...DEFAULT_CONFIG,
            enabled: this.configService.get('SOCIAL_MEDIA_ENABLED', true),
            stubMode: this.configService.get('SOCIAL_MEDIA_STUB_MODE', true),
        };
    }

    onModuleInit() {
        this.logger.log('🔍 Social Media Sentinel initialized');
        this.logger.log(`   Mode: ${this.config.stubMode ? 'STUB (fake data)' : 'PRODUCTION'}`);
        this.logger.log(`   Platforms: ${this.config.platforms.join(', ')}`);
        this.logger.log(`   Poll interval: ${this.config.pollIntervalSeconds}s`);
        this.logger.log(`   Keywords: ${this.config.keywords.length} configured`);
    }

    // ============================================================
    // Scheduled Polling (Every 60 seconds)
    // ============================================================

    @Cron(CronExpression.EVERY_MINUTE)
    async pollSocialMedia(): Promise<void> {
        if (!this.config.enabled) {
            return;
        }

        this.logger.debug('🔄 [Sentinel] Polling social media...');

        try {
            if (this.config.stubMode) {
                await this.pollStubMode();
            } else {
                await this.pollProductionMode();
            }
        } catch (error) {
            this.logger.error(`[Sentinel] Polling error: ${error}`);
        }
    }

    // ============================================================
    // Stub Mode - Generate Fake Posts
    // ============================================================

    private async pollStubMode(): Promise<void> {
        // 30% chance of generating a fake alert each poll
        const shouldGenerate = Math.random() < 0.3;

        if (!shouldGenerate) {
            this.logger.debug('[Sentinel] No new threats detected (stub)');
            return;
        }

        const fakePost = this.generateFakePost();

        this.logger.log(`🚨 [Sentinel] STUB ALERT DETECTED:`);
        this.logger.log(`   Platform: ${fakePost.platform}`);
        this.logger.log(`   Content: ${fakePost.content.substring(0, 50)}...`);
        this.logger.log(`   Confidence: ${(fakePost.confidenceScore * 100).toFixed(0)}%`);

        // Emit event for Intel Agent to process
        this.eventEmitter.emit(GEO_INTEL_EVENTS.SOCIAL_MEDIA_ALERT, fakePost);
    }

    private generateFakePost(): SocialMediaAlertEvent {
        // Pick a random post from the pool
        const template = FAKE_POSTS_POOL[
            Math.floor(Math.random() * FAKE_POSTS_POOL.length)
        ];

        // Pick a random platform
        const platform = this.config.platforms[
            Math.floor(Math.random() * this.config.platforms.length)
        ];

        this.postCounter++;

        return {
            platform: platform as 'instagram' | 'facebook' | 'twitter' | 'line',
            postId: `stub-${Date.now()}-${this.postCounter}`,
            content: template.content,
            detectedKeywords: template.keywords,
            location: template.location as GeoLocationDto,
            confidenceScore: template.severity + (Math.random() * 0.1 - 0.05), // Add some variance
            timestamp: new Date(),
        };
    }

    // ============================================================
    // Production Mode - Real API Calls
    // ============================================================

    private async pollProductionMode(): Promise<void> {
        // TODO: Implement real Instagram Graph API / Facebook API calls
        // This requires:
        // 1. INSTAGRAM_ACCESS_TOKEN env variable
        // 2. FACEBOOK_PAGE_ACCESS_TOKEN env variable
        // 3. Approved API access from Meta

        for (const platform of this.config.platforms) {
            switch (platform) {
                case 'instagram':
                    await this.pollInstagram();
                    break;
                case 'facebook':
                    await this.pollFacebook();
                    break;
                case 'twitter':
                    await this.pollTwitter();
                    break;
                case 'line':
                    await this.pollLINE();
                    break;
            }
        }
    }

    private async pollInstagram(): Promise<void> {
        const accessToken = this.configService.get('INSTAGRAM_ACCESS_TOKEN');
        if (!accessToken) {
            this.logger.warn('[Sentinel] Instagram: No access token configured');
            return;
        }

        // Instagram Graph API - Search hashtags
        // https://developers.facebook.com/docs/instagram-api/guides/hashtag-search

        // Example implementation:
        // const response = await axios.get(
        //   `https://graph.instagram.com/v18.0/ig_hashtag_search`,
        //   {
        //     params: {
        //       user_id: userId,
        //       q: '#高雄淹水',
        //       access_token: accessToken,
        //     },
        //   }
        // );

        this.logger.debug('[Sentinel] Instagram polling not yet implemented');
    }

    private async pollFacebook(): Promise<void> {
        const accessToken = this.configService.get('FACEBOOK_ACCESS_TOKEN');
        if (!accessToken) {
            this.logger.warn('[Sentinel] Facebook: No access token configured');
            return;
        }

        this.logger.debug('[Sentinel] Facebook polling not yet implemented');
    }

    private async pollTwitter(): Promise<void> {
        const bearerToken = this.configService.get('TWITTER_BEARER_TOKEN');
        if (!bearerToken) {
            this.logger.warn('[Sentinel] Twitter/X: No bearer token configured');
            return;
        }

        this.logger.debug('[Sentinel] Twitter polling not yet implemented');
    }

    private async pollLINE(): Promise<void> {
        // LINE doesn't have a public search API
        // This would require LINE Official Account messaging
        this.logger.debug('[Sentinel] LINE polling not applicable');
    }

    // ============================================================
    // Manual Trigger (for testing)
    // ============================================================

    async triggerFakeAlert(): Promise<SocialMediaAlertEvent> {
        const fakePost = this.generateFakePost();

        this.logger.log(`🧪 [Sentinel] MANUAL TEST ALERT:`);
        this.logger.log(`   Content: ${fakePost.content}`);

        this.eventEmitter.emit(GEO_INTEL_EVENTS.SOCIAL_MEDIA_ALERT, fakePost);

        return fakePost;
    }

    // ============================================================
    // Analytics
    // ============================================================

    getStats() {
        return {
            enabled: this.config.enabled,
            stubMode: this.config.stubMode,
            totalAlertsGenerated: this.postCounter,
            platforms: this.config.platforms,
            keywordsCount: this.config.keywords.length,
        };
    }
}
