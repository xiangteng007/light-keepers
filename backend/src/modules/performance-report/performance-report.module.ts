import { Module } from '@nestjs/common';
import { PerformanceReportService } from './performance-report.service';

@Module({
    providers: [PerformanceReportService],
    exports: [PerformanceReportService],
})
export class PerformanceReportModule { }
