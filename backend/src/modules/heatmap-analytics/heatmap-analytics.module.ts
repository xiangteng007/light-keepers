import { Module } from '@nestjs/common';
import { HeatmapAnalyticsService } from './heatmap-analytics.service';

@Module({
    providers: [HeatmapAnalyticsService],
    exports: [HeatmapAnalyticsService],
})
export class HeatmapAnalyticsModule { }
