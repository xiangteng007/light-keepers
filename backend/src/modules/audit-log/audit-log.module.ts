import { Module, Global } from '@nestjs/common';
import { AuditLogService } from './audit-log.service';
import { AnomalyDetectorService } from './services/anomaly-detector.service';

@Global()
@Module({
    providers: [AuditLogService, AnomalyDetectorService],
    exports: [AuditLogService, AnomalyDetectorService],
})
export class AuditLogModule { }

