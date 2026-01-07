import { Test, TestingModule } from '@nestjs/testing';
import { ExcelExportController } from './excel-export.controller';
import { ExcelExportService } from './excel-export.service';

describe('ExcelExportController', () => {
    let controller: ExcelExportController;
    let service: ExcelExportService;

    const mockService = {
        exportEvents: jest.fn(),
        exportVolunteers: jest.fn(),
        exportAttendance: jest.fn(),
        exportPayroll: jest.fn(),
        exportStatistics: jest.fn(),
        exportCustomQuery: jest.fn(),
        generateCsv: jest.fn(),
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

    describe('exportEvents', () => {
        it('should export events to Excel format', async () => {
            const events = [{ id: '1', title: 'Test Event' }];
            const result = { success: true, base64: 'abc123', filename: 'events.xlsx' };
            mockService.exportEvents.mockResolvedValue(result);

            const response = await controller.exportEvents(events);

            expect(service.exportEvents).toHaveBeenCalledWith(events);
            expect(response).toEqual(result);
        });
    });

    describe('exportVolunteers', () => {
        it('should export volunteers to Excel format', async () => {
            const volunteers = [{ id: '1', name: 'Test Volunteer' }];
            const result = { success: true, base64: 'abc123' };
            mockService.exportVolunteers.mockResolvedValue(result);

            const response = await controller.exportVolunteers(volunteers);

            expect(service.exportVolunteers).toHaveBeenCalledWith(volunteers);
            expect(response).toEqual(result);
        });
    });

    describe('exportAttendance', () => {
        it('should export attendance records to Excel', async () => {
            const records = [{ date: '2026-01-01', volunteerName: 'Test' }];
            const result = { success: true };
            mockService.exportAttendance.mockResolvedValue(result);

            const response = await controller.exportAttendance(records);

            expect(service.exportAttendance).toHaveBeenCalledWith(records);
            expect(response).toEqual(result);
        });
    });

    describe('exportPayroll', () => {
        it('should export payroll to Excel', async () => {
            const payrolls = [{ month: 1, year: 2026, volunteerName: 'Test' }];
            const result = { success: true };
            mockService.exportPayroll.mockResolvedValue(result);

            const response = await controller.exportPayroll(payrolls);

            expect(service.exportPayroll).toHaveBeenCalledWith(payrolls);
            expect(response).toEqual(result);
        });
    });

    describe('exportStatistics', () => {
        it('should export statistics with multiple sheets', async () => {
            const stats = [{ sheetName: 'Summary', headers: [], rows: [] }];
            const result = { success: true, sheetCount: 1 };
            mockService.exportStatistics.mockResolvedValue(result);

            const response = await controller.exportStatistics(stats);

            expect(service.exportStatistics).toHaveBeenCalledWith(stats);
            expect(response).toEqual(result);
        });
    });

    describe('exportCustomQuery', () => {
        it('should export custom query to Excel', async () => {
            const query = { filename: 'custom', headers: ['Col1'], rows: [['data']] };
            const result = { success: true };
            mockService.exportCustomQuery.mockResolvedValue(result);

            const response = await controller.exportCustomQuery(query);

            expect(service.exportCustomQuery).toHaveBeenCalledWith(query);
            expect(response).toEqual(result);
        });
    });

    describe('generateCsv', () => {
        it('should generate CSV from data', () => {
            const body = { headers: ['Name', 'Value'], rows: [['Test', 100]] };
            const csvContent = '"Name","Value"\n"Test","100"';
            mockService.generateCsv.mockReturnValue(csvContent);

            const response = controller.generateCsv(body);

            expect(service.generateCsv).toHaveBeenCalledWith(body.headers, body.rows);
            expect(response).toEqual({ csv: csvContent });
        });
    });
});
