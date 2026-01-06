import { Module } from '@nestjs/common';
import { ReportSchedulerService } from './report-scheduler.service';

@Module({
    providers: [ReportSchedulerService],
    exports: [ReportSchedulerService],
})
export class ReportSchedulerModule { }
