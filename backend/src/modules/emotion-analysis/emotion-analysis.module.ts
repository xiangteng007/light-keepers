import { Module } from '@nestjs/common';
import { EmotionAnalysisService } from './emotion-analysis.service';

@Module({
    providers: [EmotionAnalysisService],
    exports: [EmotionAnalysisService],
})
export class EmotionAnalysisModule { }
