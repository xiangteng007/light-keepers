import { Module } from '@nestjs/common';
import { FatigueDetectionService } from './fatigue-detection.service';

@Module({
    providers: [FatigueDetectionService],
    exports: [FatigueDetectionService],
})
export class FatigueDetectionModule { }
