import { Module, Global, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LineBotController } from './line-bot.controller';
import { LineBotService } from './line-bot.service';
import { Account } from '../accounts/entities';
import { Report } from '../reports/reports.entity';
import { Task } from '../tasks/entities';
import { ReportsModule } from '../reports/reports.module';
import {
    SessionStateService,
    ImageUploadService,
    AiClassificationService,
    DisasterReportService,
} from './disaster-report';
import { AiVisionController } from './disaster-report/ai-vision.controller';
import { RichMenuService } from './services/rich-menu.service';
import { FlexMessageService } from './services/flex-message.service';
// Consolidated from line-notify and line-liff modules
import { LineNotifyService } from '../line-notify/line-notify.service';
import { LineLiffService } from '../line-liff/line-liff.service';

/**
 * LINE Bot Module - Consolidated LINE Integration
 * 
 * Consolidates:
 * - line-bot: Core LINE Messaging API integration
 * - line-notify: LINE Notify API (group notifications)
 * - line-liff: LINE Front-end Framework (mini-apps)
 */
@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Account, Report, Task]),
        forwardRef(() => ReportsModule),
    ],
    controllers: [LineBotController, AiVisionController],
    providers: [
        LineBotService,
        SessionStateService,
        ImageUploadService,
        AiClassificationService,
        DisasterReportService,
        RichMenuService,
        FlexMessageService,
        // Consolidated services
        LineNotifyService,
        LineLiffService,
    ],
    exports: [
        LineBotService,
        DisasterReportService,
        AiClassificationService,
        RichMenuService,
        FlexMessageService,
        // Consolidated exports
        LineNotifyService,
        LineLiffService,
    ],
})
export class LineBotModule { }
