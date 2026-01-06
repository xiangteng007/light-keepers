import { Module } from '@nestjs/common';
import { AutoSummaryService } from './auto-summary.service';

@Module({
    providers: [AutoSummaryService],
    exports: [AutoSummaryService],
})
export class AutoSummaryModule { }
