import { Test, TestingModule } from '@nestjs/testing';
import { SphereStandardsService, SphereStandardCategory } from './sphere-standards.service';

describe('SphereStandardsService', () => {
    let service: SphereStandardsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SphereStandardsService],
        }).compile();
        service = module.get(SphereStandardsService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('assessCompliance returns assessments', async () => {
        const data = { population: 100, waterSupplyLiters: 2000, toiletCount: 5 };
        const result = await service.assessCompliance(data, SphereStandardCategory.WASH);
        expect(Array.isArray(result)).toBe(true);
    });

    it('generateReport produces a report', async () => {
        const data = { population: 200, waterSupplyLiters: 4000, toiletCount: 10, coveredAreaM2: 700, dailyKcal: 2100, drugAvailabilityPercent: 85 };
        const report = await service.generateReport(data, 'Assessor');
        expect(report.assessor).toBe('Assessor');
        expect(report.assessments.length).toBeGreaterThan(0);
    });

    it('getStandardsReference returns standards', () => {
        const ref = service.getStandardsReference();
        expect(ref).toBeDefined();
    });
});
