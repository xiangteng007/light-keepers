/**
 * Notifications Module - 統一通知中心
 * 
 * Unified facade for all notification channels:
 * 1. NotificationsService - 核心通知邏輯
 * 2. PushNotificationService - FCM 推播
 * 3. LINE Notify - LINE 推播 (via LineBotModule)
 * 
 * v2.0 - Facade Pattern
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notifications.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { PushNotificationService } from '../notification/services/push-notification.service';
import { PushNotificationController } from '../notification/push-notification.controller';
import { SharedAuthModule } from '../shared/shared-auth.module';
import { AuthModule } from '../auth/auth.module';
import { Account } from '../accounts/entities/account.entity';
import { LineBotModule } from '../line-bot/line-bot.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification, Account]),
        SharedAuthModule,
        AuthModule,
        forwardRef(() => LineBotModule), // LINE 通知整合
    ],
    controllers: [NotificationsController, PushNotificationController],
    providers: [NotificationsService, PushNotificationService],
    exports: [NotificationsService, PushNotificationService],
})
export class NotificationsModule { }


