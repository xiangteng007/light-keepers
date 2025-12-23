import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Volunteer } from '../volunteers/volunteers.entity';
import { VolunteerAssignment } from '../volunteers/volunteer-assignments.entity';
import { Report } from '../reports/reports.entity';
import { ReportsExportController } from './reports-export.controller';
import { ReportsExportService } from './reports-export.service';

@Module({
    imports: [TypeOrmModule.forFeature([Volunteer, VolunteerAssignment, Report])],
    controllers: [ReportsExportController],
    providers: [ReportsExportService],
    exports: [ReportsExportService],
})
export class ReportsExportModule { }
