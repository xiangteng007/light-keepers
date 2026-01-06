import { Module } from '@nestjs/common';
import { DisasterSummaryService } from './disaster-summary.service';

@Module({
    providers: [DisasterSummaryService],
    exports: [DisasterSummaryService],
})
export class DisasterSummaryModule { }
