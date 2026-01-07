/**
 * Comms Core Module - 通訊中樞
 * 
 * 整合模組: notifications, push-notification, push-notification-v2,
 *           line-bot, line-liff, line-notify, telegram-bot,
 *           email-template, slack-integration, announcements,
 *           realtime, realtime-chat, ptt
 * 
 * 職責:
 * - 多渠道推播通知
 * - LINE Bot / LIFF 整合
 * - 即時訊息 (WebSocket)
 * - 公告系統
 */

import { Module } from '@nestjs/common';
import { NotificationsModule } from '../../modules/notifications/notifications.module';
import { LineBotModule } from '../../modules/line-bot/line-bot.module';
import { RealtimeModule } from '../../modules/realtime/realtime.module';
import { AnnouncementsModule } from '../../modules/announcements/announcements.module';

@Module({
    imports: [
        NotificationsModule,
        LineBotModule,
        RealtimeModule,
        AnnouncementsModule,
        // 未來整合: TelegramModule, SlackModule, etc.
    ],
    exports: [NotificationsModule, LineBotModule, RealtimeModule, AnnouncementsModule],
})
export class CommsCoreModule { }
