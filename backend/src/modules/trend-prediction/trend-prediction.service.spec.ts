import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TrendPredictionService } from './trend-prediction.service';

describe('TrendPredictionService', () => {
    let service: TrendPredictionService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TrendPredictionService,
                { provide: ConfigService, useValue: { get: jest.fn() } },
            ],
        }).compile();

        service = module.get<TrendPredictionService>(TrendPredictionService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== predictDisasterProbability =====
    describe('predictDisasterProbability', () => {
        it('should predict earthquake probability', async () => {
            const result = await service.predictDisasterProbability('花蓮', 'earthquake', 7);
            expect(result.region).toBe('花蓮');
            expect(result.disasterType).toBe('earthquake');
            expect(result.probability).toBeGreaterThanOrEqual(0);
            expect(result.probability).toBeLessThanOrEqual(100);
            expect(result.riskLevel).toBeDefined();
            expect(result.confidence).toBe(0.75);
            expect(result.generatedAt).toBeDefined();
        });

        it('should predict flood probability', async () => {
            const result = await service.predictDisasterProbability('高雄', 'flood', 7);
            expect(result.disasterType).toBe('flood');
            expect(result.probability).toBeGreaterThanOrEqual(0);
        });

        it('should return risk level based on probability', async () => {
            const result = await service.predictDisasterProbability('台北', 'earthquake', 7);
            expect(['low', 'moderate', 'high', 'critical']).toContain(result.riskLevel);
        });
    });

    // ===== getRegionRiskOverview =====
    describe('getRegionRiskOverview', () => {
        it('should return overview with all disaster types', async () => {
            const overview = await service.getRegionRiskOverview('台北');
            expect(overview.region).toBe('台北');
            expect(overview.risks.length).toBe(5); // earthquake, flood, landslide, typhoon, fire
            expect(overview.overallRisk).toBeDefined();
            expect(overview.updatedAt).toBeDefined();
        });

        it('should sort risks by probability descending', async () => {
            const overview = await service.getRegionRiskOverview('花蓮');
            for (let i = 1; i < overview.risks.length; i++) {
                expect(overview.risks[i - 1].probability).toBeGreaterThanOrEqual(overview.risks[i].probability);
            }
        });

        it('should include Chinese type names', async () => {
            const overview = await service.getRegionRiskOverview('台南');
            const typeNames = overview.risks.map(r => r.typeName);
            expect(typeNames).toContain('地震');
            expect(typeNames).toContain('洪水');
            expect(typeNames).toContain('颱風');
        });
    });

    // ===== getSeasonalTrends =====
    describe('getSeasonalTrends', () => {
        it('should return 12 monthly trends', () => {
            const trends = service.getSeasonalTrends('台灣');
            expect(trends).toHaveLength(12);
        });

        it('should show typhoon peak in summer', () => {
            const trends = service.getSeasonalTrends('台灣');
            const july = trends.find(t => t.month === 7);
            const august = trends.find(t => t.month === 8);
            expect(july!.primaryRisk).toBe('typhoon');
            expect(august!.primaryRisk).toBe('typhoon');
            expect(august!.riskScore).toBe(90);
        });

        it('should show flood risk in spring/summer', () => {
            const trends = service.getSeasonalTrends('台灣');
            const may = trends.find(t => t.month === 5);
            expect(may!.primaryRisk).toBe('flood');
        });
    });

    // ===== predictResourceDemand =====
    describe('predictResourceDemand', () => {
        it('should return typhoon medium forecast', async () => {
            const result = await service.predictResourceDemand('台北', 'typhoon_medium');
            expect(result.scenario).toBe('中度颱風');
            expect(result.estimatedAffected).toBe(5000);
            expect(result.volunteers).toBe(200);
        });

        it('should return earthquake 6 forecast', async () => {
            const result = await service.predictResourceDemand('花蓮', 'earthquake_6');
            expect(result.scenario).toBe('規模6地震');
            expect(result.estimatedAffected).toBe(20000);
            expect(result.medicalKits).toBe(500);
        });

        it('should default to typhoon_medium for unknown scenario', async () => {
            const result = await service.predictResourceDemand('台東', 'unknown');
            expect(result.scenario).toBe('中度颱風');
        });
    });
});
