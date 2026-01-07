import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
    FieldReport,
    ReportAttachment,
    SosSignal,
    LiveLocationShare,
    TaskClaim,
    TaskProgressUpdate,
    AuditLog,
    EntityLock,
    LocationHistory,
} from './entities';
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
import { AuthModule } from '../auth/auth.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { LineBotModule } from '../line-bot/line-bot.module';
import { Account } from '../accounts/entities/account.entity';
import { Role } from '../accounts/entities/role.entity';

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
        forwardRef(() => AuthModule), // For JwtAuthGuard
        forwardRef(() => NotificationsModule), // For EmergencyNotificationService
        forwardRef(() => LineBotModule), // For EmergencyNotificationService
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
    ],
})
export class FieldReportsModule { }
