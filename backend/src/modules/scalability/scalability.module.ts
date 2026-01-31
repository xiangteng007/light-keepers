import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

// Services
import { OfflineSyncService } from './services/offline-sync.service';
import { ApiVersioningService } from './services/api-versioning.service';
import { SlaMonitorService } from './services/sla-monitor.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { RateLimiterService } from './services/rate-limiter.service';

// Unified Service
import { ScalabilityService } from './scalability.service';

// Controller
import { ScalabilityController } from './scalability.controller';

/**
 * Scalability Module
 * 
 * 提供企業級可擴展性功能：
 * - 離線同步 (Offline-First)
 * - API 版本控制
 * - SLA 監控
 * - 熔斷器
 * - 限流器
 */
@Global()
@Module({
    imports: [ConfigModule],
    controllers: [ScalabilityController],
    providers: [
        OfflineSyncService,
        ApiVersioningService,
        SlaMonitorService,
        CircuitBreakerService,
        RateLimiterService,
        ScalabilityService,
    ],
    exports: [
        ScalabilityService,
        OfflineSyncService,
        CircuitBreakerService,
        RateLimiterService,
    ],
})
export class ScalabilityModule {}
