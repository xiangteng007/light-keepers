import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Services
import { OfflineSyncService } from './services/offline-sync.service';
import { ApiVersioningService } from './services/api-versioning.service';
import { SlaMonitorService } from './services/sla-monitor.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { RateLimiterService } from './services/rate-limiter.service';
import { MultiRegionService } from './services/multi-region.service';
import { EventExternalizationService } from './services/event-externalization.service';

// Unified Service
import { ScalabilityService } from './scalability.service';

// Controller
import { ScalabilityController } from './scalability.controller';

/**
 * Scalability Module
 * 
 * P3 擴展性增強：
 * - 離線同步 (Offline-First)
 * - API 版本控制
 * - SLA 監控
 * - 熔斷器
 * - 限流器
 * - 多區域部署
 * - 事件外部化 (Pub/Sub)
 */
@Global()
@Module({
    imports: [
        ConfigModule,
        EventEmitterModule.forRoot(),
    ],
    controllers: [ScalabilityController],
    providers: [
        OfflineSyncService,
        ApiVersioningService,
        SlaMonitorService,
        CircuitBreakerService,
        RateLimiterService,
        MultiRegionService,
        EventExternalizationService,
        ScalabilityService,
    ],
    exports: [
        ScalabilityService,
        OfflineSyncService,
        CircuitBreakerService,
        RateLimiterService,
        MultiRegionService,
        EventExternalizationService,
    ],
})
export class ScalabilityModule {}

