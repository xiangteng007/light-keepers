import { Module } from '@nestjs/common';
import { CrowdReportingService } from './crowd-reporting.service';

@Module({
    providers: [CrowdReportingService],
    exports: [CrowdReportingService],
})
export class CrowdReportingModule { }
