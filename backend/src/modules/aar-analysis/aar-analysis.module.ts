import { Module } from '@nestjs/common';
import { AarAnalysisService } from './aar-analysis.service';

@Module({
    providers: [AarAnalysisService],
    exports: [AarAnalysisService],
})
export class AarAnalysisModule { }
