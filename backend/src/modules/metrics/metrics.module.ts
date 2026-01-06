/**
 * Metrics Module
 * API performance monitoring
 */

import { Module, Global, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ApiMetricsService, MetricsMiddleware } from './api-metrics.service';
import { MetricsController } from './metrics.controller';

@Global()
@Module({
    providers: [ApiMetricsService, MetricsMiddleware],
    controllers: [MetricsController],
    exports: [ApiMetricsService],
})
export class MetricsModule implements NestModule {
    configure(consumer: MiddlewareConsumer): void {
        consumer.apply(MetricsMiddleware).forRoutes('*');
    }
}
