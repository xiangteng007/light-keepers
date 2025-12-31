import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notifications.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SharedAuthModule } from '../shared/shared-auth.module';
import { Account } from '../accounts/entities/account.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification, Account]),
        SharedAuthModule,
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
