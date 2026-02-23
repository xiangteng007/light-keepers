import { Test, TestingModule } from '@nestjs/testing';
import { ThreeWMatrixService } from './three-w-matrix.service';

describe('ThreeWMatrixService', () => {
    let service: ThreeWMatrixService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ThreeWMatrixService],
        }).compile();
        service = module.get(ThreeWMatrixService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('generateMatrix returns valid matrix', async () => {
        const missions = [{ name: 'Rescue Op', status: 'active', createdAt: '2024-01-01', location: { county: 'Taipei' } }];
        const period = { start: new Date('2024-01-01'), end: new Date('2024-12-31') };
        const matrix = await service.generateMatrix(missions, period);
        expect(matrix.entries.length).toBe(1);
        expect(matrix.summary.totalActivities).toBe(1);
    });

    it('exportToCsv returns CSV string', async () => {
        const missions = [{ name: 'Test', status: 'completed', createdAt: '2024-06-01', location: { county: 'Kaohsiung' } }];
        const matrix = await service.generateMatrix(missions, { start: new Date(), end: new Date() });
        const csv = service.exportToCsv(matrix);
        expect(csv).toContain('Organization');
        expect(csv).toContain('Light Keepers');
    });
});
