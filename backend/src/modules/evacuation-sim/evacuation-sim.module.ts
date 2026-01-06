import { Module } from '@nestjs/common';
import { EvacuationSimService } from './evacuation-sim.service';

@Module({
    providers: [EvacuationSimService],
    exports: [EvacuationSimService],
})
export class EvacuationSimModule { }
