import { Test, TestingModule } from '@nestjs/testing';
import { SphereStandardsService, SphereStandard } from './sphere-standards.service';

describe('SphereStandardsService (international-standards)', () => {
    let service: SphereStandardsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SphereStandardsService],
        }).compile();
        service = module.get(SphereStandardsService);
    });

    it('should be defined', () => expect(service).toBeDefined());
    it('getIndicators returns all indicators', () => expect(service.getIndicators().length).toBeGreaterThan(0));
    it('getIndicatorsByStandard filters', () => {
        const wash = service.getIndicatorsByStandard(SphereStandard.WASH);
        expect(wash.every(i => i.standard === SphereStandard.WASH)).toBe(true);
    });
    it('checkCompliance returns report', () => {
        const report = service.checkCompliance('m1', 'Mission', { 'wash-1': 20, 'food-1': 2500 });
        expect(report.missionId).toBe('m1');
        expect(report.checks.length).toBeGreaterThan(0);
    });
    it('quickCheck passes when all good', () => {
        const result = service.quickCheck({ waterPerPerson: 20, personsPerToilet: 10, caloriesPerPerson: 2500, spacePerPerson: 5 });
        expect(result.passed).toBe(true);
    });
    it('quickCheck fails when water low', () => {
        const result = service.quickCheck({ waterPerPerson: 5 });
        expect(result.passed).toBe(false);
        expect(result.issues.length).toBeGreaterThan(0);
    });
});
