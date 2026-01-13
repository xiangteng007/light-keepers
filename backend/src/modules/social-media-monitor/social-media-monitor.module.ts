/**
 * social-media-monitor.module.ts
 * 
 * v3.0: 社群媒體監視模組
 * - Controller: API endpoints (含匯出、通知)
 * - Service: 分析引擎 + 事件發送
 * - Providers: Facebook, Instagram, Twitter API providers
 * - NotificationService: Telegram/LINE/Webhook
 * - Entities: SocialPost, NotificationConfig
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialMediaMonitorService } from './social-media-monitor.service';
import { SocialMediaMonitorController } from './social-media-monitor.controller';
import { NotificationService } from './services/notification.service';
import { FacebookProvider } from './providers/facebook.provider';
import { InstagramProvider } from './providers/instagram.provider';
import { TwitterProvider } from './providers/twitter.provider';
import { SocialPost } from './entities/social-post.entity';
import { NotificationConfig } from './entities/notification-config.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SocialPost, NotificationConfig])],
    controllers: [SocialMediaMonitorController],
    providers: [
        SocialMediaMonitorService,
        NotificationService,
        FacebookProvider,
        InstagramProvider,
        TwitterProvider,
    ],
    exports: [
        SocialMediaMonitorService,
        NotificationService,
        FacebookProvider,
        InstagramProvider,
        TwitterProvider,
    ],
})
export class SocialMediaMonitorModule { }

