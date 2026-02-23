import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DamageSimulationService } from './damage-simulation.service';

describe('DamageSimulationService', () => {
    let service: DamageSimulationService;

    const building = {
        id: 'bld-1',
        name: '台北市政府大樓',
        structureType: 'reinforced_concrete',
        yearBuilt: 1995,
        floors: 10,
        location: { lat: 25.033, lng: 121.565 },
    };

    const oldBrickBuilding = {
        id: 'bld-2',
        name: '老磚房',
        structureType: 'brick',
        yearBuilt: 1960,
        floors: 3,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DamageSimulationService,
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get<DamageSimulationService>(DamageSimulationService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== assessStructure =====
    describe('assessStructure', () => {
        it('should create assessment with damage score', async () => {
            const observations = [
                { type: 'wall_crack', location: '2F 南牆', severity: 'moderate' as const, description: '裂縫約 2mm' },
            ];
            const result = await service.assessStructure(building, observations);
            expect(result.id).toContain('damage-');
            expect(result.buildingId).toBe('bld-1');
            expect(result.overallRisk).toBeDefined();
            expect(result.collapseRisk).toBeGreaterThan(0);
        });

        it('should classify as critical for severe column damage', async () => {
            const observations = [
                { type: 'column_damage', location: '1F 柱', severity: 'severe' as const, description: '柱體碎裂' },
                { type: 'foundation_crack', location: '地基', severity: 'severe' as const, description: '基礎裂縫' },
                { type: 'floor_tilt', location: '3F 地板', severity: 'severe' as const, description: '傾斜' },
            ];
            const result = await service.assessStructure(oldBrickBuilding, observations);
            expect(result.overallRisk).toBe('critical');
            expect(result.recommendations).toContain('立即疏散所有人員');
        });

        it('should classify as low for mild window damage', async () => {
            const observations = [
                { type: 'window_damage', location: '1F 窗', severity: 'mild' as const, description: '玻璃裂紋' },
            ];
            const result = await service.assessStructure(building, observations);
            expect(result.overallRisk).toBe('low');
        });

        it('should apply age factor for old buildings', async () => {
            const observations = [
                { type: 'wall_crack', location: '1F', severity: 'moderate' as const, description: '裂縫' },
            ];
            const oldResult = await service.assessStructure(oldBrickBuilding, observations);
            const newResult = await service.assessStructure(building, observations);
            expect(oldResult.collapseRisk).toBeGreaterThan(newResult.collapseRisk);
        });
    });

    // ===== simulateEarthquake =====
    describe('simulateEarthquake', () => {
        it('should simulate earthquake impact', () => {
            const result = service.simulateEarthquake(building, 6.5, 10);
            expect(result.buildingId).toBe('bld-1');
            expect(result.magnitude).toBe(6.5);
            expect(result.shakingIntensity).toBeGreaterThan(0);
            expect(result.expectedDamage).toBeDefined();
        });

        it('should advise evacuation for strong earthquakes', () => {
            const result = service.simulateEarthquake(oldBrickBuilding, 7.5, 5);
            expect(result.evacuationAdvised).toBe(true);
            expect(result.structuralInspectionRequired).toBe(true);
        });

        it('should have higher vulnerability for brick buildings', () => {
            const brickResult = service.simulateEarthquake(oldBrickBuilding, 4.0, 50);
            const concreteResult = service.simulateEarthquake(building, 4.0, 50);
            expect(brickResult.collapseProb).toBeGreaterThan(concreteResult.collapseProb);
        });
    });

    // ===== simulateFlood =====
    describe('simulateFlood', () => {
        it('should calculate affected floors', () => {
            const result = service.simulateFlood(building, 6); // 6m water
            expect(result.affectedFloors).toBe(2); // 6m / 3m floor height = 2
            expect(result.damagePercentage).toBe(20); // 2/10 * 100
        });

        it('should detect electrical risk above 0.5m', () => {
            const result = service.simulateFlood(building, 0.6);
            expect(result.electricalRisk).toBe(true);
        });

        it('should not detect electrical risk below 0.5m', () => {
            const result = service.simulateFlood(building, 0.3);
            expect(result.electricalRisk).toBe(false);
        });

        it('should detect foundation risk for old buildings above 1m', () => {
            const result = service.simulateFlood(oldBrickBuilding, 1.5);
            expect(result.foundationRisk).toBe(true);
        });

        it('should recommend cut power above 0.3m', () => {
            const result = service.simulateFlood(building, 0.5);
            expect(result.recommendations).toContain('切斷電源');
        });
    });

    // ===== getAreaAssessment =====
    describe('getAreaAssessment', () => {
        it('should return area report with risk distribution', async () => {
            await service.assessStructure(building, [
                { type: 'window_damage', location: '1F', severity: 'mild' as const, description: '' },
            ]);
            const bounds = { north: 26, south: 24, east: 122, west: 121 };
            const report = service.getAreaAssessment(bounds);
            expect(report.totalAssessed).toBe(1);
            expect(report.riskDistribution).toBeDefined();
            expect(report.timestamp).toBeDefined();
        });
    });
});
