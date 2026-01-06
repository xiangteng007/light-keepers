import { Module } from '@nestjs/common';
import { AerialImageAnalysisService } from './aerial-image-analysis.service';
import { AerialImageAnalysisController } from './aerial-image-analysis.controller';

@Module({
    providers: [AerialImageAnalysisService],
    controllers: [AerialImageAnalysisController],
    exports: [AerialImageAnalysisService],
})
export class AerialImageAnalysisModule { }
