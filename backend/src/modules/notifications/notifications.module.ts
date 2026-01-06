import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notifications.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationQueueService } from './notification-queue.service';
import { NotificationGateway } from './notification.gateway';
import { SharedAuthModule } from '../shared/shared-auth.module';
import { AuthModule } from '../auth/auth.module';
import { Account } from '../accounts/entities/account.entity';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Notification, Account]),
        SharedAuthModule,
        AuthModule, // Required for FirebaseAdminService
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService, NotificationQueueService, NotificationGateway],
    exports: [NotificationsService, NotificationQueueService, NotificationGateway],
})
export class NotificationsModule { }

