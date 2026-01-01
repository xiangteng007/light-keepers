import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { AdvancedFilterController } from './advanced-filter.controller';
import { AdvancedFilterService } from './advanced-filter.service';
import { Report } from './reports.entity';
import { Task } from '../tasks/entities';

@Module({
    imports: [TypeOrmModule.forFeature([Report, Task])],
    controllers: [ReportsController, AdvancedFilterController],
    providers: [ReportsService, AdvancedFilterService],
    exports: [ReportsService, AdvancedFilterService],
})
export class ReportsModule { }
