import { Test, TestingModule } from '@nestjs/testing';
import { PdfGeneratorController } from './pdf-generator.controller';
import { PdfGeneratorService } from './pdf-generator.service';
import { Response } from 'express';

describe('PdfGeneratorController', () => {
    let controller: PdfGeneratorController;
    let service: PdfGeneratorService;

    const mockService = {
        generatePdf: jest.fn(),
        getTemplates: jest.fn(),
        createTemplate: jest.fn(),
        updateTemplate: jest.fn(),
        deleteTemplate: jest.fn(),
        generateFromTemplate: jest.fn(),
        mergePdfs: jest.fn(),
        addWatermark: jest.fn(),
    };

    const mockResponse = {
        setHeader: jest.fn(),
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
    } as unknown as Response;

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

    describe('generatePdf', () => {
        it('should generate PDF from HTML content', async () => {
            const dto = { html: '<h1>Test</h1>', options: { format: 'A4' } };
            const pdfBuffer = Buffer.from('PDF content');
            mockService.generatePdf.mockResolvedValue(pdfBuffer);

            const result = await controller.generatePdf(dto);

            expect(service.generatePdf).toHaveBeenCalledWith(dto.html, dto.options);
            expect(result).toEqual(pdfBuffer);
        });
    });

    describe('getTemplates', () => {
        it('should return all PDF templates', async () => {
            const templates = [{ id: 't1', name: 'Report Template' }];
            mockService.getTemplates.mockResolvedValue(templates);

            const result = await controller.getTemplates();

            expect(service.getTemplates).toHaveBeenCalled();
            expect(result).toEqual(templates);
        });
    });

    describe('createTemplate', () => {
        it('should create a new PDF template', async () => {
            const dto = { name: 'New Template', html: '<h1>{{title}}</h1>' };
            const newTemplate = { id: 't2', ...dto };
            mockService.createTemplate.mockResolvedValue(newTemplate);

            const result = await controller.createTemplate(dto);

            expect(service.createTemplate).toHaveBeenCalledWith(dto);
            expect(result).toEqual(newTemplate);
        });
    });

    describe('updateTemplate', () => {
        it('should update existing template', async () => {
            const updates = { name: 'Updated Template' };
            const updatedTemplate = { id: 't1', name: 'Updated Template' };
            mockService.updateTemplate.mockResolvedValue(updatedTemplate);

            const result = await controller.updateTemplate('t1', updates);

            expect(service.updateTemplate).toHaveBeenCalledWith('t1', updates);
            expect(result).toEqual(updatedTemplate);
        });
    });

    describe('deleteTemplate', () => {
        it('should delete template by ID', async () => {
            mockService.deleteTemplate.mockResolvedValue(true);

            const result = await controller.deleteTemplate('t1');

            expect(service.deleteTemplate).toHaveBeenCalledWith('t1');
            expect(result).toEqual({ deleted: true });
        });
    });

    describe('generateFromTemplate', () => {
        it('should generate PDF from template with data', async () => {
            const dto = { templateId: 't1', data: { title: 'Report' } };
            const pdfBuffer = Buffer.from('PDF content');
            mockService.generateFromTemplate.mockResolvedValue(pdfBuffer);

            const result = await controller.generateFromTemplate(dto);

            expect(service.generateFromTemplate).toHaveBeenCalledWith(dto.templateId, dto.data);
            expect(result).toEqual(pdfBuffer);
        });
    });

    describe('mergePdfs', () => {
        it('should merge multiple PDFs', async () => {
            const dto = { pdfIds: ['p1', 'p2', 'p3'] };
            const mergedBuffer = Buffer.from('Merged PDF');
            mockService.mergePdfs.mockResolvedValue(mergedBuffer);

            const result = await controller.mergePdfs(dto);

            expect(service.mergePdfs).toHaveBeenCalledWith(dto.pdfIds);
            expect(result).toEqual(mergedBuffer);
        });
    });

    describe('addWatermark', () => {
        it('should add watermark to PDF', async () => {
            const dto = { pdfId: 'p1', watermark: 'CONFIDENTIAL' };
            const watemarkedBuffer = Buffer.from('Watermarked PDF');
            mockService.addWatermark.mockResolvedValue(watemarkedBuffer);

            const result = await controller.addWatermark(dto);

            expect(service.addWatermark).toHaveBeenCalledWith(dto.pdfId, dto.watermark);
            expect(result).toEqual(watemarkedBuffer);
        });
    });
});
