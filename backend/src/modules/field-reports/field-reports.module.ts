import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    FieldReport,
    ReportAttachment,
    SosSignal,
    LiveLocationShare,
    TaskClaim,
    TaskProgressUpdate,
    EntityLock,
    LocationHistory,
} from './entities';
import { AuditLog } from '../audit/audit-log.entity';
import { FieldReportsController } from './field-reports.controller';
import { FieldReportsService } from './field-reports.service';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';
import { SosController } from './sos.controller';
import { SosService } from './sos.service';
import { LocationShareController } from './location-share.controller';
import { LocationShareService } from './location-share.service';
import { TaskClaimsController } from './task-claims.controller';
import { TaskClaimsService } from './task-claims.service';
import { AuditService } from './audit.service';
import { FieldReportsGateway } from './field-reports.gateway';
import { GcsStorageService } from './gcs-storage.service';
import { EmergencyNotificationService } from './emergency-notification.service';
import { ReportDeduplicationService } from './report-deduplication.service';
import { ReportSlaService } from './report-sla.service';
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LineBotModule } from '../line-bot/line-bot.module';
import { Account } from '../accounts/entities/account.entity';
import { StorageModule } from '../../common/storage/storage.module';
import { FIELD_REPORT_STORAGE_FEATURE } from '../../common/storage/storage.tokens';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            FieldReport,
            ReportAttachment,
            SosSignal,
            LiveLocationShare,
            TaskClaim,
            TaskProgressUpdate,
            AuditLog,
            EntityLock,
            LocationHistory,
            Account,
        ]),
        forwardRef(() => AuthModule), // For AuthService / JwtModule (原註解寫 JwtAuthGuard，該 guard 已於 1.6 收斂中移除)
        forwardRef(() => NotificationsModule), // For EmergencyNotificationService
        forwardRef(() => LineBotModule), // For EmergencyNotificationService
        // INF-1 / M.3b: attachments go through the storage abstraction, bound to
        // the bucket field reports have always used (GCS_BUCKET).
        StorageModule.forFeature(FIELD_REPORT_STORAGE_FEATURE),
    ],
    controllers: [
        FieldReportsController,
        AttachmentsController,
        SosController,
        LocationShareController,
        TaskClaimsController,
    ],
    providers: [
        FieldReportsService,
        AttachmentsService,
        SosService,
        LocationShareService,
        TaskClaimsService,
        AuditService,
        FieldReportsGateway,
        GcsStorageService,
        EmergencyNotificationService,
        ReportDeduplicationService,
        ReportSlaService,
    ],
    exports: [
        TypeOrmModule, // Export TypeOrmModule so other modules can use FieldReport repository
        FieldReportsService,
        AttachmentsService,
        SosService,
        LocationShareService,
        TaskClaimsService,
        AuditService,
        FieldReportsGateway,
        EmergencyNotificationService,
        ReportDeduplicationService,
        ReportSlaService,
    ],
})
export class FieldReportsModule { }
