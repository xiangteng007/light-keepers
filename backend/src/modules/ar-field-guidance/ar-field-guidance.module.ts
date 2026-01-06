import { Module } from '@nestjs/common';
import { ArFieldGuidanceService } from './ar-field-guidance.service';
import { ArFieldGuidanceController } from './ar-field-guidance.controller';

@Module({
    providers: [ArFieldGuidanceService],
    controllers: [ArFieldGuidanceController],
    exports: [ArFieldGuidanceService],
})
export class ArFieldGuidanceModule { }
