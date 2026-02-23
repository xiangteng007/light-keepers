import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DocumentOcrService } from './document-ocr.service';

describe('DocumentOcrService', () => {
    let service: DocumentOcrService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DocumentOcrService,
                { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(null) } },
            ],
        }).compile();

        service = module.get<DocumentOcrService>(DocumentOcrService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('processImage', () => {
        it('should return mock OCR result without API key', async () => {
            const result = await service.processImage('base64data');
            expect(result.success).toBe(true);
            expect(result.rawText).toContain('地點');
            expect(result.fields!['地點']).toBe('台北市中正區');
            expect(result.confidence).toBe(0.9);
        });
    });

    describe('processDisasterForm', () => {
        it('should extract disaster form fields', async () => {
            const form = await service.processDisasterForm('base64data');
            expect(form.formType).toBe('disaster_report');
            expect(form.location).toBe('台北市中正區');
            expect(form.reporterName).toBe('王大明');
            expect(form.phone).toBe('0912345678');
            expect(form.disasterType).toBe('淹水');
            expect(form.description).toContain('淹水');
            expect(form.casualties).toBe(0);
            expect(form.rawOcr.success).toBe(true);
        });
    });

    describe('processCheckInSheet', () => {
        it('should return volunteer check-in data', async () => {
            const checkIns = await service.processCheckInSheet('base64data');
            expect(checkIns).toHaveLength(2);
            expect(checkIns[0].name).toBe('王大明');
            expect(checkIns[0].signature).toBe(true);
            expect(checkIns[1].checkInTime).toBe('08:05');
        });
    });

    describe('batchProcess', () => {
        it('should process multiple images', async () => {
            const batch = await service.batchProcess([
                { id: 'img1', base64: 'data1' },
                { id: 'img2', base64: 'data2' },
            ]);
            expect(batch.total).toBe(2);
            expect(batch.successful).toBe(2);
            expect(batch.results['img1']).toBeDefined();
            expect(batch.results['img2']).toBeDefined();
        });

        it('should handle empty batch', async () => {
            const batch = await service.batchProcess([]);
            expect(batch.total).toBe(0);
            expect(batch.successful).toBe(0);
        });
    });

    describe('extractTable', () => {
        it('should return table with headers and rows', async () => {
            const table = await service.extractTable('base64data');
            expect(table.headers).toContain('姓名');
            expect(table.headers).toContain('單位');
            expect(table.rows).toHaveLength(2);
            expect(table.rows[0][0]).toBe('王大明');
        });
    });
});
