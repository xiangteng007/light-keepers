import { Test, TestingModule } from '@nestjs/testing';
import { ExcelExportController } from './excel-export.controller';
import { ExcelExportService } from './excel-export.service';

describe('ExcelExportController', () => {
    let controller: ExcelExportController;
    let service: ExcelExportService;

    const mockService = {
        exportToExcel: jest.fn(),
        getTemplates: jest.fn(),
        createTemplate: jest.fn(),
        exportFromTemplate: jest.fn(),
        exportMultiSheet: jest.fn(),
        generateCsv: jest.fn(),
        parseExcel: jest.fn(),
        applyStyle: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ExcelExportController],
            providers: [
                { provide: ExcelExportService, useValue: mockService },
            ],
        }).compile();

        controller = module.get<ExcelExportController>(ExcelExportController);
        service = module.get<ExcelExportService>(ExcelExportService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('exportToExcel', () => {
        it('should export data to Excel format', async () => {
            const dto = {
                data: [{ name: 'Test', value: 100 }],
                columns: [{ field: 'name', header: 'Name' }],
            };
            const excelBuffer = Buffer.from('Excel content');
            mockService.exportToExcel.mockResolvedValue(excelBuffer);

            const result = await controller.exportToExcel(dto);

            expect(service.exportToExcel).toHaveBeenCalledWith(dto.data, dto.columns);
            expect(result).toEqual(excelBuffer);
        });
    });

    describe('getTemplates', () => {
        it('should return all Excel templates', async () => {
            const templates = [{ id: 't1', name: 'Monthly Report' }];
            mockService.getTemplates.mockResolvedValue(templates);

            const result = await controller.getTemplates();

            expect(service.getTemplates).toHaveBeenCalled();
            expect(result).toEqual(templates);
        });
    });

    describe('createTemplate', () => {
        it('should create a new Excel template', async () => {
            const dto = { name: 'New Template', columns: [] };
            const newTemplate = { id: 't2', ...dto };
            mockService.createTemplate.mockResolvedValue(newTemplate);

            const result = await controller.createTemplate(dto);

            expect(service.createTemplate).toHaveBeenCalledWith(dto);
            expect(result).toEqual(newTemplate);
        });
    });

    describe('exportFromTemplate', () => {
        it('should export Excel from template with data', async () => {
            const dto = { templateId: 't1', data: [{ row: 1 }] };
            const excelBuffer = Buffer.from('Excel content');
            mockService.exportFromTemplate.mockResolvedValue(excelBuffer);

            const result = await controller.exportFromTemplate(dto);

            expect(service.exportFromTemplate).toHaveBeenCalledWith(dto.templateId, dto.data);
            expect(result).toEqual(excelBuffer);
        });
    });

    describe('exportMultiSheet', () => {
        it('should export Excel with multiple sheets', async () => {
            const dto = {
                sheets: [
                    { name: 'Sheet1', data: [] },
                    { name: 'Sheet2', data: [] },
                ],
            };
            const excelBuffer = Buffer.from('Multi-sheet Excel');
            mockService.exportMultiSheet.mockResolvedValue(excelBuffer);

            const result = await controller.exportMultiSheet(dto);

            expect(service.exportMultiSheet).toHaveBeenCalledWith(dto.sheets);
            expect(result).toEqual(excelBuffer);
        });
    });

    describe('generateCsv', () => {
        it('should generate CSV from data', async () => {
            const dto = { data: [{ col: 'value' }] };
            const csvContent = 'col\nvalue';
            mockService.generateCsv.mockResolvedValue(csvContent);

            const result = await controller.generateCsv(dto);

            expect(service.generateCsv).toHaveBeenCalledWith(dto.data);
            expect(result).toEqual(csvContent);
        });
    });

    describe('parseExcel', () => {
        it('should parse uploaded Excel file', async () => {
            const mockFile = { buffer: Buffer.from('Excel file'), originalname: 'test.xlsx' };
            const parsedData = [{ row: 1, col: 'value' }];
            mockService.parseExcel.mockResolvedValue(parsedData);

            const result = await controller.parseExcel(mockFile as any);

            expect(service.parseExcel).toHaveBeenCalledWith(mockFile.buffer);
            expect(result).toEqual(parsedData);
        });
    });

    describe('applyStyle', () => {
        it('should apply styling to Excel export', async () => {
            const dto = {
                data: [{ name: 'Test' }],
                styles: { header: { bold: true, fontSize: 14 } },
            };
            const styledBuffer = Buffer.from('Styled Excel');
            mockService.applyStyle.mockResolvedValue(styledBuffer);

            const result = await controller.applyStyle(dto);

            expect(service.applyStyle).toHaveBeenCalledWith(dto.data, dto.styles);
            expect(result).toEqual(styledBuffer);
        });
    });
});
