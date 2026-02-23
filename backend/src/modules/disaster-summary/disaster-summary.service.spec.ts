import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DisasterSummaryService } from './disaster-summary.service';

describe('DisasterSummaryService', () => {
    let service: DisasterSummaryService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DisasterSummaryService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(null) } },
            ],
        }).compile();

        service = module.get<DisasterSummaryService>(DisasterSummaryService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateSummary', () => {
        it('should generate basic summary without AI key', async () => {
            const result = await service.generateSummary('mission-1', []);
            expect(result.generatedAt).toBeDefined();
            expect(result.confidence).toBe(0.5);
            expect(result.overview).toContain('0 則回報');
        });

        it('should aggregate reports source', async () => {
            const sources = [
                { type: 'reports' as const, data: [{ id: 'r1', content: '災情', timestamp: new Date() }] },
            ];
            const result = await service.generateSummary('mission-2', sources);
            expect(result.overview).toContain('1 則回報');
        });

        it('should handle personnel source', async () => {
            const sources = [
                { type: 'personnel' as const, data: { total: 100, deployed: 80, available: 20 } },
            ];
            const result = await service.generateSummary('mission-3', sources);
            expect(result).toBeDefined();
            expect(result.casualties).toBeDefined();
        });

        it('should include default needs and priorities', async () => {
            const result = await service.generateSummary('mission-4', []);
            expect(result.needs).toContain('待評估');
            expect(result.priorities).toContain('持續監控');
        });
    });

    describe('generateProgressReport', () => {
        it('should generate progress report', async () => {
            const from = new Date(Date.now() - 86400000);
            const to = new Date();
            const report = await service.generateProgressReport('mission-1', from, to);
            expect(report.missionId).toBe('mission-1');
            expect(report.period.from).toBe(from);
            expect(report.period.to).toBe(to);
            expect(report.improvements.length).toBeGreaterThan(0);
            expect(report.concerns.length).toBeGreaterThan(0);
            expect(report.nextSteps.length).toBeGreaterThan(0);
        });
    });

    describe('generateSitrep', () => {
        it('should generate SITREP document', async () => {
            const sitrep = await service.generateSitrep('mission-1');
            expect(sitrep.documentId).toContain('SITREP-');
            expect(sitrep.missionId).toBe('mission-1');
            expect(sitrep.preparedBy).toBe('AI Auto-generated');
            expect(sitrep.casualties).toBeDefined();
            expect(sitrep.plannedActions).toBeDefined();
        });
    });
});
