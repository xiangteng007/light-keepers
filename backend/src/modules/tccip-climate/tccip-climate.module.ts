import { Module } from '@nestjs/common';
import { TccipClimateService } from './tccip-climate.service';

@Module({
    providers: [TccipClimateService],
    exports: [TccipClimateService],
})
export class TccipClimateModule { }
