import { Module } from '@nestjs/common';
import { DamageSimulationService } from './damage-simulation.service';

@Module({
    providers: [DamageSimulationService],
    exports: [DamageSimulationService],
})
export class DamageSimulationModule { }
