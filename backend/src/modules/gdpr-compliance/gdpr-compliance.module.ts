import { Module } from '@nestjs/common';
import { GdprComplianceService } from './gdpr-compliance.service';

@Module({
    providers: [GdprComplianceService],
    exports: [GdprComplianceService],
})
export class GdprComplianceModule { }
