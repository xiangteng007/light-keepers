import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LineBotController } from './line-bot.controller';
import { LineBotService } from './line-bot.service';
import { Account } from '../accounts/entities';
import { Report } from '../reports/reports.entity';
import { Task } from '../tasks/entities';
import { ReportsService } from '../reports/reports.service';
import {
    SessionStateService,
    ImageUploadService,
    AiClassificationService,
    DisasterReportService,
} from './disaster-report';
import { AiVisionController } from './disaster-report/ai-vision.controller';

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Account, Report, Task]),
    ],
    controllers: [LineBotController, AiVisionController],
    providers: [
        LineBotService,
        SessionStateService,
        ImageUploadService,
        AiClassificationService,
        DisasterReportService,
        ReportsService,
    ],
    exports: [LineBotService, DisasterReportService, AiClassificationService],
})
export class LineBotModule { }


