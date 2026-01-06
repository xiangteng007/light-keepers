import { Test, TestingModule } from '@nestjs/testing';
import { AttendanceController } from './attendance.controller';
import { AttendanceService } from './attendance.service';

describe('AttendanceController', () => {
    let controller: AttendanceController;
    let service: AttendanceService;

    const mockAttendanceService = {
        checkInGps: jest.fn(),
        checkInQr: jest.fn(),
        checkOut: jest.fn(),
        getRecords: jest.fn(),
        getDailySummary: jest.fn(),
        getMonthlyReport: jest.fn(),
        generateQrCode: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AttendanceController],
            providers: [
                { provide: AttendanceService, useValue: mockAttendanceService },
            ],
        }).compile();

        controller = module.get<AttendanceController>(AttendanceController);
        service = module.get<AttendanceService>(AttendanceService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('checkInGps', () => {
        it('should call service.checkInGps with correct parameters', async () => {
            const dto = {
                volunteerId: 'v1',
                location: { lat: 25.0330, lng: 121.5654, accuracy: 10 },
            };
            const expected = { id: 'rec-1', volunteerId: 'v1', checkInTime: new Date() };
            mockAttendanceService.checkInGps.mockResolvedValue(expected);

            const result = await controller.checkInGps(dto);

            expect(service.checkInGps).toHaveBeenCalledWith(dto.volunteerId, dto.location);
            expect(result).toEqual(expected);
        });
    });

    describe('checkInQr', () => {
        it('should call service.checkInQr with correct parameters', async () => {
            const dto = { volunteerId: 'v1', qrCode: 'abc123' };
            const expected = { id: 'rec-2', volunteerId: 'v1' };
            mockAttendanceService.checkInQr.mockResolvedValue(expected);

            const result = await controller.checkInQr(dto);

            expect(service.checkInQr).toHaveBeenCalledWith(dto.volunteerId, dto.qrCode);
            expect(result).toEqual(expected);
        });
    });

    describe('checkOut', () => {
        it('should call service.checkOut with record ID', async () => {
            const expected = { id: 'rec-1', checkOutTime: new Date() };
            mockAttendanceService.checkOut.mockResolvedValue(expected);

            const result = await controller.checkOut('rec-1', {});

            expect(service.checkOut).toHaveBeenCalledWith('rec-1', undefined);
            expect(result).toEqual(expected);
        });
    });

    describe('getRecords', () => {
        it('should return volunteer attendance records', async () => {
            const records = [{ id: 'rec-1' }, { id: 'rec-2' }];
            mockAttendanceService.getRecords.mockResolvedValue(records);

            const result = await controller.getRecords('v1', '2026-01-01', '2026-01-31');

            expect(service.getRecords).toHaveBeenCalledWith('v1', '2026-01-01', '2026-01-31');
            expect(result).toEqual(records);
        });
    });

    describe('getDailySummary', () => {
        it('should return daily summary', async () => {
            const summary = { date: '2026-01-07', totalCheckIns: 10 };
            mockAttendanceService.getDailySummary.mockResolvedValue(summary);

            const result = await controller.getDailySummary('2026-01-07');

            expect(service.getDailySummary).toHaveBeenCalledWith('2026-01-07');
            expect(result).toEqual(summary);
        });
    });

    describe('getMonthlyReport', () => {
        it('should return monthly report for volunteer', async () => {
            const report = { volunteerId: 'v1', totalHours: 45 };
            mockAttendanceService.getMonthlyReport.mockResolvedValue(report);

            const result = await controller.getMonthlyReport('v1', 1, 2026);

            expect(service.getMonthlyReport).toHaveBeenCalledWith('v1', 1, 2026);
            expect(result).toEqual(report);
        });
    });

    describe('generateQrCode', () => {
        it('should generate QR code for location', async () => {
            const qrData = { qrCode: 'base64...', locationId: 'loc-1' };
            mockAttendanceService.generateQrCode.mockResolvedValue(qrData);

            const result = await controller.generateQrCode({ locationId: 'loc-1', locationName: '總部' });

            expect(service.generateQrCode).toHaveBeenCalledWith('loc-1', '總部');
            expect(result).toEqual(qrData);
        });
    });
});
