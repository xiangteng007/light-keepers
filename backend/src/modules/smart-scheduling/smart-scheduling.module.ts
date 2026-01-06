import { Module } from '@nestjs/common';
import { SmartSchedulingService } from './smart-scheduling.service';

@Module({
    providers: [SmartSchedulingService],
    exports: [SmartSchedulingService],
})
export class SmartSchedulingModule { }
