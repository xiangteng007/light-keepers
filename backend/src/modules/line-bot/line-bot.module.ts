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

@Global()
@Module({
    imports: [
        TypeOrmModule.forFeature([Account, Report, Task]),
        forwardRef(() => ReportsModule), // Use forwardRef to break circular dependency
    ],
    controllers: [LineBotController, AiVisionController],
    providers: [
        LineBotService,
        SessionStateService,
        ImageUploadService,
        AiClassificationService,
        DisasterReportService,
        // ReportsService is now imported from ReportsModule via forwardRef
    ],
    exports: [LineBotService, DisasterReportService, AiClassificationService],
})
export class LineBotModule { }


