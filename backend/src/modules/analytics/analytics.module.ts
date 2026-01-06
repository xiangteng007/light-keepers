import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Report } from '../reports/reports.entity';
import { FieldReport, SosSignal } from '../field-reports/entities';
import { DispatchTask } from '../task-dispatch/entities/dispatch-task.entity';
import { TrendPredictionController } from './trend-prediction.controller';
import { TrendPredictionService } from './trend-prediction.service';
import { DashboardStatsController } from './dashboard-stats.controller';
import { DashboardStatsService } from './dashboard-stats.service';

@Module({
    imports: [TypeOrmModule.forFeature([
        Report,
        FieldReport,
        SosSignal,
        DispatchTask,
    ])],
    controllers: [TrendPredictionController, DashboardStatsController],
    providers: [TrendPredictionService, DashboardStatsService],
    exports: [TrendPredictionService, DashboardStatsService],
})
export class AnalyticsModule { }
