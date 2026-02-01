import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IcsFormsController } from './ics-forms.controller';
import { IcsFormsService } from './ics-forms.service';
import { IcsForm } from './entities/ics-form.entity';

/**
 * ICS Forms Module
 *
 * FEMA ICS/NIMS 標準表單模組 (P0-1)
 *
 * 支援表單：
 * - ICS-201: Incident Briefing
 * - ICS-202: Incident Objectives
 * - ICS-203: Organization Assignment List
 * - ICS-204: Assignment List
 * - ICS-205: Incident Radio Communications Plan
 * - ICS-206: Medical Plan
 * - ICS-207: Incident Organization Chart
 * - ICS-209: Incident Status Summary
 * - ICS-213: General Message
 * - ICS-214: Activity Log
 */
@Module({
    imports: [TypeOrmModule.forFeature([IcsForm])],
    controllers: [IcsFormsController],
    providers: [IcsFormsService],
    exports: [IcsFormsService],
})
export class IcsFormsModule {}
