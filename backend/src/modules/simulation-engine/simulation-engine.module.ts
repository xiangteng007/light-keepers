/**
 * Simulation Engine Module
 * 
 * Unified module consolidating all simulation capabilities:
 * - Drill Simulation (演練模擬)
 * - Damage Simulation (災損模擬)
 * 
 * This facade module re-exports from specialized simulation modules
 * for a unified API while maintaining backward compatibility.
 */

import { Module, forwardRef } from '@nestjs/common';
import { DrillSimulationModule } from '../drill-simulation/drill-simulation.module';
import { DamageSimulationModule } from '../damage-simulation/damage-simulation.module';
import { SimulationEngineService } from './simulation-engine.service';

@Module({
    imports: [
        forwardRef(() => DrillSimulationModule),
        forwardRef(() => DamageSimulationModule),
    ],
    providers: [SimulationEngineService],
    exports: [
        SimulationEngineService,
        DrillSimulationModule,
        DamageSimulationModule,
    ],
})
export class SimulationEngineModule {}
