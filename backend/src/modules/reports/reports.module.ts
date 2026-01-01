import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AdvancedFilterController } from './advanced-filter.controller';
import { AdvancedFilterService } from './advanced-filter.service';
import { ReportDispatcherService } from './report-dispatcher.service';
import { Report } from './reports.entity';
import { Task } from '../tasks/entities';
import { Account } from '../accounts/entities';
import { LineBotModule } from '../line-bot/line-bot.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Report, Task, Account]),
        forwardRef(() => LineBotModule), // forwardRef to break circular dependency
    ],
    controllers: [ReportsController, AdvancedFilterController],
    providers: [ReportsService, AdvancedFilterService, ReportDispatcherService],
    exports: [ReportsService, AdvancedFilterService, ReportDispatcherService],
})
export class ReportsModule { }

