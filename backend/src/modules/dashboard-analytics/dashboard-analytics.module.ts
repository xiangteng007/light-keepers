import { Module } from '@nestjs/common';
import { DashboardAnalyticsService } from './dashboard-analytics.service';
import { DashboardAnalyticsController } from './dashboard-analytics.controller';

@Module({
    providers: [DashboardAnalyticsService],
    controllers: [DashboardAnalyticsController],
    exports: [DashboardAnalyticsService],
})
export class DashboardAnalyticsModule { }
