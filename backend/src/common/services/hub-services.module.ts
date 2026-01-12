/**
 * hub-services.module.ts
 * 
 * v4.0: Hub 服務模組 - 集中註冊所有整合服務
 */
import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationHubService } from './notification-hub.service';
import { GeoIntelHubService } from './geo-intel-hub.service';
import { AnalyticsHubService } from './analytics-hub.service';
import { AIHubService } from './ai-hub.service';
import { OfflineHubService } from './offline-hub.service';
import { NotificationConfig } from '../../modules/social-media-monitor/entities/notification-config.entity';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([NotificationConfig]),
    ],
    providers: [
        NotificationHubService,
        GeoIntelHubService,
        AnalyticsHubService,
        AIHubService,
        OfflineHubService,
    ],
    exports: [
        NotificationHubService,
        GeoIntelHubService,
        AnalyticsHubService,
        AIHubService,
        OfflineHubService,
    ],
})
export class HubServicesModule { }
