import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ManualsService } from './manuals.service';

describe('ManualsService', () => {
    let service: ManualsService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ManualsService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(undefined) } },
            ],
        }).compile();
        service = module.get(ManualsService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('getAllManuals returns manuals array', () => {
        const manuals = service.getAllManuals();
        expect(Array.isArray(manuals)).toBe(true);
        expect(manuals.length).toBeGreaterThan(0);
    });

    it('getManualById returns manual for valid id', () => {
        const manual = service.getManualById('eq-1');
        expect(manual).toBeDefined();
        if (manual) {
            expect(manual.categoryId).toBe('earthquake');
        }
    });

    it('getManualById returns undefined for invalid', () => {
        const manual = service.getManualById('nonexistent');
        expect(manual).toBeUndefined();
    });

    it('searchWithAI falls back without API key', async () => {
        const result = await service.searchWithAI('地震');
        expect(result.query).toBe('地震');
        expect(result.results.length).toBeGreaterThan(0);
    });

    it('fallbackSearch matches keywords', () => {
        const result = (service as any).fallbackSearch('CPR', Date.now());
        expect(result.results.length).toBeGreaterThan(0);
    });
});
