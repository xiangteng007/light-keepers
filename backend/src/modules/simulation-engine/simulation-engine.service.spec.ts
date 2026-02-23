import { SimulationEngineService } from './simulation-engine.service';

describe('SimulationEngineService', () => {
    let service: SimulationEngineService;
    let drillService: Record<string, jest.Mock>;
    let damageService: Record<string, jest.Mock>;

    beforeEach(() => {
        drillService = {
            getGlobalState: jest.fn().mockReturnValue({ isDrillMode: false, activeScenarioId: null }),
            isDrillMode: jest.fn().mockReturnValue(false),
            startDrill: jest.fn().mockResolvedValue({ success: true, message: '演習啟動' }),
            stopDrill: jest.fn().mockResolvedValue({ success: true }),
            getAllScenarios: jest.fn().mockResolvedValue([{ id: 's1' }]),
            createScenario: jest.fn().mockResolvedValue({ id: 's2' }),
        };
        damageService = {
            assessStructure: jest.fn().mockResolvedValue({ grade: 'moderate' }),
            simulateEarthquake: jest.fn().mockReturnValue({ damage: 'moderate' }),
            simulateFlood: jest.fn().mockReturnValue({ damage: 'minor' }),
        };

        service = new SimulationEngineService(drillService as any, damageService as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getStatus', () => {
        it('should return engine status', () => {
            const status = service.getStatus();
            expect(status.drillMode).toBe(false);
            expect(status.engineReady).toBe(true);
        });
    });

    describe('drill delegation', () => {
        it('should delegate isDrillMode', () => {
            expect(service.isDrillMode()).toBe(false);
        });

        it('should delegate startDrill', async () => {
            const result = await service.startDrill('s1');
            expect(result.success).toBe(true);
            expect(drillService.startDrill).toHaveBeenCalledWith('s1');
        });

        it('should delegate stopDrill', async () => {
            const result = await service.stopDrill();
            expect(result.success).toBe(true);
        });

        it('should delegate getAllDrillScenarios', async () => {
            const scenarios = await service.getAllDrillScenarios();
            expect(scenarios).toHaveLength(1);
        });
    });

    describe('damage delegation', () => {
        const building = { id: 'b1', name: 'Building', structureType: 'RC', yearBuilt: 2010 };

        it('should delegate assessStructuralDamage', async () => {
            await service.assessStructuralDamage(building, []);
            expect(damageService.assessStructure).toHaveBeenCalled();
        });

        it('should delegate simulateEarthquakeImpact', () => {
            service.simulateEarthquakeImpact(building, 6.5, 10);
            expect(damageService.simulateEarthquake).toHaveBeenCalledWith(building, 6.5, 10);
        });

        it('should delegate simulateFloodImpact', () => {
            service.simulateFloodImpact(building, 1.5);
            expect(damageService.simulateFlood).toHaveBeenCalledWith(building, 1.5);
        });
    });

    describe('runDisasterSimulation', () => {
        it('should run earthquake simulation for multiple buildings', async () => {
            const result = await service.runDisasterSimulation({
                disasterType: 'earthquake',
                magnitude: 7.0,
                buildings: [
                    { id: 'b1', name: 'A', structureType: 'RC', yearBuilt: 2000 },
                    { id: 'b2', name: 'B', structureType: 'Steel', yearBuilt: 2015 },
                ],
            });
            expect(result.buildingsAssessed).toBe(2);
            expect(result.disasterType).toBe('earthquake');
            expect(damageService.simulateEarthquake).toHaveBeenCalledTimes(2);
        });

        it('should optionally start drill during simulation', async () => {
            const result = await service.runDisasterSimulation({
                disasterType: 'flood',
                waterLevel: 2.0,
                buildings: [{ id: 'b1', name: 'A', structureType: 'RC', yearBuilt: 2000 }],
                startDrill: true,
                drillScenarioId: 's1',
            });
            expect(result.drillStarted).toBeDefined();
            expect(drillService.startDrill).toHaveBeenCalledWith('s1');
        });
    });
});
