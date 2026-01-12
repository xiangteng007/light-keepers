/**
 * social-media-monitor.module.ts
 * 
 * v2.0: 社群媒體監視模組
 * - Controller: API endpoints
 * - Service: 分析引擎 + 事件發送
 * - Entity: 持久化儲存 (TypeORM)
 */
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SocialMediaMonitorService } from './social-media-monitor.service';
import { SocialMediaMonitorController } from './social-media-monitor.controller';
import { SocialPost } from './entities/social-post.entity';

@Module({
    imports: [TypeOrmModule.forFeature([SocialPost])],
    controllers: [SocialMediaMonitorController],
    providers: [SocialMediaMonitorService],
    exports: [SocialMediaMonitorService],
})
export class SocialMediaMonitorModule { }
