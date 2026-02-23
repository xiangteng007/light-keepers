import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';

describe('ExportService', () => {
    let service: ExportService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [ExportService],
        }).compile();
        service = module.get(ExportService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('exportReport dispatches to PDF', async () => {
        const result = await service.exportReport({ name: 'test' }, { format: 'pdf' });
        expect(result.format).toBe('pdf');
        expect(result.mimeType).toBe('application/pdf');
    });

    it('exportReport dispatches to Excel', async () => {
        const result = await service.exportReport([{ a: 1 }], { format: 'excel' });
        expect(result.format).toBe('excel');
    });

    it('exportReport dispatches to CSV', async () => {
        const result = await service.exportReport([{ a: 1, b: 2 }], { format: 'csv' });
        expect(result.format).toBe('csv');
        expect(result.mimeType).toBe('text/csv');
    });

    it('exportReport dispatches to JSON', async () => {
        const result = await service.exportReport({ test: true }, { format: 'json' });
        expect(result.format).toBe('json');
        expect(result.mimeType).toBe('application/json');
    });

    it('exportReport throws for unsupported format', async () => {
        await expect(service.exportReport({}, { format: 'xml' as any }))
            .rejects.toThrow('Unsupported format');
    });

    it('exported buffer contains data', async () => {
        const result = await service.exportReport({ key: 'value' }, { format: 'json' });
        const content = result.buffer.toString();
        expect(content).toContain('key');
    });
});
