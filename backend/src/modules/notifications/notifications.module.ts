/**
 * Notifications Module - 統一通知中心
 * 
 * Unified facade for all notification channels:
 * 1. NotificationsService - 核心通知邏輯
 * 2. LINE Notify - LINE 推播 (via LineBotModule)
 * 
 * v2.1 - Consolidated after module optimization
 */

import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Notification } from './notifications.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { SharedAuthModule } from '../shared/shared-auth.module';
import { AuthModule } from '../auth/auth.module';
import { Account } from '../accounts/entities/account.entity';
import { LineBotModule } from '../line-bot/line-bot.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Notification, Account]),
        SharedAuthModule,
        AuthModule,
        forwardRef(() => LineBotModule),
    ],
    controllers: [NotificationsController],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
