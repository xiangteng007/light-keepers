import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorController } from './pdf-generator.controller';
import { PdfGeneratorService } from './pdf-generator.service';

describe('PdfGeneratorController', () => {
    let controller: PdfGeneratorController;
    let service: PdfGeneratorService;

    const mockService = {
        generateEventReport: jest.fn(),
        generateAttendanceReport: jest.fn(),
        generateSitrep: jest.fn(),
        generateStatisticsReport: jest.fn(),
        generateCertificate: jest.fn(),
        batchGenerate: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PdfGeneratorController],
            providers: [
                { provide: PdfGeneratorService, useValue: mockService },
            ],
        }).compile();

        controller = module.get<PdfGeneratorController>(PdfGeneratorController);
        service = module.get<PdfGeneratorService>(PdfGeneratorService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('generateEventReport', () => {
        it('should generate event report PDF', async () => {
            const event = { id: 'e1', title: 'Test Event' };
            const result = { success: true, base64: 'abc123' };
            mockService.generateEventReport.mockResolvedValue(result);

            const response = await controller.generateEventReport(event);

            expect(service.generateEventReport).toHaveBeenCalledWith(event);
            expect(response).toEqual(result);
        });
    });

    describe('generateAttendanceReport', () => {
        it('should generate attendance report PDF', async () => {
            const data = { records: [] };
            const result = { success: true };
            mockService.generateAttendanceReport.mockResolvedValue(result);

            const response = await controller.generateAttendanceReport(data);

            expect(service.generateAttendanceReport).toHaveBeenCalledWith(data);
            expect(response).toEqual(result);
        });
    });

    describe('generateSitrep', () => {
        it('should generate SITREP PDF', async () => {
            const sitrep = { sessionId: 's1', summary: 'Test' };
            const result = { success: true };
            mockService.generateSitrep.mockResolvedValue(result);

            const response = await controller.generateSitrep(sitrep);

            expect(service.generateSitrep).toHaveBeenCalledWith(sitrep);
            expect(response).toEqual(result);
        });
    });

    describe('generateStatisticsReport', () => {
        it('should generate statistics report PDF', async () => {
            const stats = { data: [] };
            const result = { success: true };
            mockService.generateStatisticsReport.mockResolvedValue(result);

            const response = await controller.generateStatisticsReport(stats);

            expect(service.generateStatisticsReport).toHaveBeenCalledWith(stats);
            expect(response).toEqual(result);
        });
    });

    describe('generateCertificate', () => {
        it('should generate volunteer certificate PDF', async () => {
            const volunteer = { name: 'Test Volunteer' };
            const result = { success: true };
            mockService.generateCertificate.mockResolvedValue(result);

            const response = await controller.generateCertificate('v1', volunteer);

            expect(service.generateCertificate).toHaveBeenCalledWith({ id: 'v1', ...volunteer });
            expect(response).toEqual(result);
        });
    });

    describe('batchGenerate', () => {
        it('should batch generate multiple PDFs', async () => {
            const items = [{ type: 'event', data: {} }];
            const result = { generated: 1, success: true };
            mockService.batchGenerate.mockResolvedValue(result);

            const response = await controller.batchGenerate(items);

            expect(service.batchGenerate).toHaveBeenCalledWith(items);
            expect(response).toEqual(result);
        });
    });
});
