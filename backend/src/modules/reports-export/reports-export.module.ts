import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Volunteer } from '../volunteers/volunteers.entity';
import { VolunteerAssignment } from '../volunteers/volunteer-assignments.entity';
import { Report } from '../reports/reports.entity';
import { Resource } from '../resources/resources.entity';
import { ResourceTransaction } from '../resources/resource-transaction.entity';
import { FieldReport, SosSignal } from '../field-reports/entities';
import { ReportSchedule, ReportExecution } from './report-schedule.entity';
import { ReportsExportController } from './reports-export.controller';
import { ReportScheduleController } from './report-schedule.controller';
import { ReportsExportService } from './reports-export.service';
import { ReportScheduleService } from './report-schedule.service';

@Module({
    imports: [TypeOrmModule.forFeature([
        Volunteer,
        VolunteerAssignment,
        Report,
        Resource,
        ResourceTransaction,
        FieldReport,
        SosSignal,
        ReportSchedule,
        ReportExecution,
    ])],
    controllers: [ReportsExportController, ReportScheduleController],
    providers: [ReportsExportService, ReportScheduleService],
    exports: [ReportsExportService, ReportScheduleService],
})
export class ReportsExportModule { }
