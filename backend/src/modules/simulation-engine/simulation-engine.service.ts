/**
 * Simulation Engine Service
 * 
 * Unified facade service for all simulation operations
 * - Drill scenarios and execution
 * - Structural damage assessment
 * - Natural disaster simulations
 */

import { Injectable, Logger, Inject, forwardRef } from '@nestjs/common';
import { DrillSimulationService } from '../drill-simulation/drill.service';
import { DamageSimulationService } from '../damage-simulation/damage-simulation.service';

@Injectable()
export class SimulationEngineService {
    private readonly logger = new Logger(SimulationEngineService.name);

    constructor(
        @Inject(forwardRef(() => DrillSimulationService))
        private readonly drillService: DrillSimulationService,
        @Inject(forwardRef(() => DamageSimulationService))
        private readonly damageService: DamageSimulationService,
    ) {}

    // ==================== Status ====================

    /**
     * Get overall simulation engine status
     */
    getStatus(): {
        drillMode: boolean;
        activeScenarioId: string | null;
        engineReady: boolean;
    } {
        const drillState = this.drillService.getGlobalState();
        return {
            drillMode: drillState.isDrillMode,
            activeScenarioId: drillState.activeScenarioId,
            engineReady: true,
        };
    }

    // ==================== Drill Simulation Facade ====================

    /**
     * Check if system is in drill mode
     */
    isDrillMode(): boolean {
        return this.drillService.isDrillMode();
    }

    /**
     * Start a drill scenario
     */
    async startDrill(scenarioId: string): Promise<{ success: boolean; message: string }> {
        return this.drillService.startDrill(scenarioId);
    }

    /**
     * Stop active drill
     */
    async stopDrill(): Promise<{ success: boolean; result?: any }> {
        return this.drillService.stopDrill();
    }

    /**
     * Get all drill scenarios
     */
    async getAllDrillScenarios(): Promise<any[]> {
        return this.drillService.getAllScenarios();
    }

    /**
     * Create new drill scenario
     */
    async createDrillScenario(data: {
        title: string;
        description?: string;
        events: any[];
        createdBy: string;
    }): Promise<any> {
        return this.drillService.createScenario(data);
    }

    // ==================== Damage Simulation Facade ====================

    /**
     * Assess building structural damage
     */
    async assessStructuralDamage(
        building: {
            id: string;
            name: string;
            structureType: string;
            yearBuilt: number;
            floors?: number;
            location?: { lat: number; lng: number };
        },
        observations: {
            type: string;
            location: string;
            severity: 'mild' | 'moderate' | 'severe';
            description: string;
            photos?: string[];
        }[],
    ): Promise<any> {
        return this.damageService.assessStructure(building, observations);
    }

    /**
     * Simulate earthquake impact
     */
    simulateEarthquakeImpact(
        building: {
            id: string;
            name: string;
            structureType: string;
            yearBuilt: number;
            floors?: number;
            location?: { lat: number; lng: number };
        },
        magnitude: number,
        distance: number,
    ): any {
        return this.damageService.simulateEarthquake(building, magnitude, distance);
    }

    /**
     * Simulate flood damage
     */
    simulateFloodImpact(
        building: {
            id: string;
            name: string;
            structureType: string;
            yearBuilt: number;
            floors?: number;
            location?: { lat: number; lng: number };
        },
        waterLevel: number,
    ): any {
        return this.damageService.simulateFlood(building, waterLevel);
    }

    // ==================== Combined Operations ====================

    /**
     * Run full disaster simulation including drill and damage assessment
     */
    async runDisasterSimulation(params: {
        disasterType: 'earthquake' | 'flood' | 'typhoon';
        magnitude?: number;
        waterLevel?: number;
        buildings: Array<{
            id: string;
            name: string;
            structureType: string;
            yearBuilt: number;
            floors?: number;
            location?: { lat: number; lng: number };
        }>;
        startDrill?: boolean;
        drillScenarioId?: string;
    }) {
        this.logger.log(`Starting ${params.disasterType} simulation for ${params.buildings.length} buildings`);

        const results: any[] = [];

        for (const building of params.buildings) {
            let simResult;

            switch (params.disasterType) {
                case 'earthquake':
                    simResult = this.damageService.simulateEarthquake(
                        building,
                        params.magnitude || 6.5,
                        10, // default distance
                    );
                    break;
                case 'flood':
                    simResult = this.damageService.simulateFlood(
                        building,
                        params.waterLevel || 1.5,
                    );
                    break;
                default:
                    simResult = { building: building.id, status: 'not_simulated' };
            }

            results.push({ ...simResult, buildingId: building.id, buildingName: building.name });
        }

        // Optionally start drill
        let drillResult = null;
        if (params.startDrill && params.drillScenarioId) {
            drillResult = await this.drillService.startDrill(params.drillScenarioId);
        }

        return {
            disasterType: params.disasterType,
            buildingsAssessed: results.length,
            simulations: results,
            drillStarted: drillResult,
            timestamp: new Date(),
        };
    }
}
