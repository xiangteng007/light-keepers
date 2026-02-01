/**
 * donor-reporting.module.ts
 * 
 * v5.1: Donor Reporting & Grant Management
 * 
 * Features:
 * - Grant/Funding tracking
 * - Donor dashboard
 * - Impact metrics reporting
 * - Financial transparency reports
 */
import { Module, Global } from '@nestjs/common';
import { DonorReportingService } from './donor-reporting.service';
import { DonorReportingController } from './donor-reporting.controller';

@Global()
@Module({
    controllers: [DonorReportingController],
    providers: [DonorReportingService],
    exports: [DonorReportingService],
})
export class DonorReportingModule { }
