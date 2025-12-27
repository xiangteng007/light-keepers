import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { Report } from './reports.entity';
import { Task } from '../tasks/entities';

@Module({
    imports: [TypeOrmModule.forFeature([Report, Task])],
    controllers: [ReportsController],
    providers: [ReportsService],
    exports: [ReportsService],
})
export class ReportsModule { }
