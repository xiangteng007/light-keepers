import { Module } from '@nestjs/common';
import { PsychologicalTrackingService } from './psychological-tracking.service';

@Module({
    providers: [PsychologicalTrackingService],
    exports: [PsychologicalTrackingService],
})
export class PsychologicalTrackingModule { }
