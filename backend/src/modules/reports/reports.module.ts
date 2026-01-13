import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AdvancedFilterController } from './advanced-filter.controller';
import { AdvancedFilterService } from './advanced-filter.service';
import { ReportDispatcherService } from './report-dispatcher.service';
import { ReportSchedulerService } from './services/report-scheduler.service';
import { ReportSchedulerController } from './report-scheduler.controller';
import { Report } from './reports.entity';
import { Task } from '../tasks/entities';
import { Account } from '../accounts/entities';
import { LineBotModule } from '../line-bot/line-bot.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Report, Task, Account]),
        ScheduleModule.forRoot(),
        forwardRef(() => LineBotModule), // forwardRef to break circular dependency
    ],
    controllers: [ReportsController, AdvancedFilterController, ReportSchedulerController],
    providers: [ReportsService, AdvancedFilterService, ReportDispatcherService, ReportSchedulerService],
    exports: [ReportsService, AdvancedFilterService, ReportDispatcherService, ReportSchedulerService],
})
export class ReportsModule { }
