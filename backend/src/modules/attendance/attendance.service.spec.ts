import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AttendanceService } from './attendance.service';
import { AttendanceRecord } from './entities/attendance-record.entity';

describe('AttendanceService', () => {
    let service: AttendanceService;
    let recordRepo: any;

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    const mockGpsLocation = { lat: 25.0330, lng: 121.5654, accuracy: 10 };

    const mockRecord: Partial<AttendanceRecord> = {
        id: 'rec-1',
        volunteerId: 'vol-1',
        volunteerName: '王志工',
        method: 'gps',
        checkInTime: twoHoursAgo,
        checkOutTime: undefined,
        checkInLocation: { lat: 25.0330, lng: 121.5654, accuracy: 10 },
        hoursWorked: undefined,
        taskId: 'task-1',
        missionSessionId: 'ms-1',
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AttendanceService,
                {
                    provide: getRepositoryToken(AttendanceRecord),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({
                            id: 'rec-1',
                            checkInTime: new Date(),
                            ...dto,
                        })),
                        save: jest.fn().mockImplementation((r) => Promise.resolve(r)),
                        findOne: jest.fn().mockResolvedValue(mockRecord),
                        find: jest.fn().mockResolvedValue([mockRecord]),
                    },
                },
            ],
        }).compile();

        service = module.get<AttendanceService>(AttendanceService);
        recordRepo = module.get(getRepositoryToken(AttendanceRecord));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Check-in =====
    describe('checkInWithGps', () => {
        it('should create GPS check-in record', async () => {
            const result = await service.checkInWithGps('vol-1', mockGpsLocation, { taskId: 'task-1' });
            expect(result.success).toBe(true);
            expect(result.recordId).toBeDefined();
            expect(recordRepo.create).toHaveBeenCalled();
        });
    });

    describe('checkInWithQr', () => {
        it('should return error for invalid QR code', async () => {
            const result = await service.checkInWithQr('vol-1', 'invalid-code');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid');
        });
    });

    describe('checkInForTask', () => {
        it('should create task-linked check-in', async () => {
            // First findOne: check for existing open record → null (no existing)
            recordRepo.findOne.mockResolvedValueOnce(null);
            const result = await service.checkInForTask('vol-1', 'task-1', 'ms-1', mockGpsLocation, '王志工');
            expect(result.success).toBe(true);
            expect(recordRepo.create).toHaveBeenCalled();
        });

        it('should return existing open record', async () => {
            recordRepo.findOne.mockResolvedValueOnce({ ...mockRecord, checkOutTime: undefined });
            const result = await service.checkInForTask('vol-1', 'task-1', 'ms-1');
            expect(result.success).toBe(true);
            expect(result.recordId).toBe('rec-1');
        });
    });

    // ===== Check-out =====
    describe('checkOut', () => {
        it('should check out and calculate hours', async () => {
            recordRepo.findOne.mockResolvedValueOnce({ ...mockRecord, checkInTime: twoHoursAgo, checkOutTime: undefined });
            const result = await service.checkOut('rec-1', mockGpsLocation);
            expect(result.success).toBe(true);
            expect(result.hoursWorked).toBeDefined();
            expect(recordRepo.save).toHaveBeenCalled();
        });

        it('should return error if record not found', async () => {
            recordRepo.findOne.mockResolvedValueOnce(null);
            const result = await service.checkOut('nonexistent');
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should return error if already checked out', async () => {
            recordRepo.findOne.mockResolvedValueOnce({ ...mockRecord, checkOutTime: now });
            const result = await service.checkOut('rec-1');
            expect(result.success).toBe(false);
            expect(result.error).toContain('Already');
        });
    });

    describe('checkOutForTask', () => {
        it('should check out active task record', async () => {
            recordRepo.findOne.mockResolvedValueOnce({ ...mockRecord, checkOutTime: undefined });
            const result = await service.checkOutForTask('vol-1', 'task-1');
            expect(result.success).toBe(true);
        });

        it('should return error if no active record', async () => {
            recordRepo.findOne.mockResolvedValueOnce(null);
            const result = await service.checkOutForTask('vol-1', 'task-1');
            expect(result.success).toBe(false);
        });
    });

    // ===== Queries =====
    describe('getVolunteerRecords', () => {
        it('should return records for volunteer', async () => {
            const result = await service.getVolunteerRecords('vol-1');
            expect(result).toEqual([mockRecord]);
        });
    });

    describe('getTaskRecords', () => {
        it('should return records for task', async () => {
            const result = await service.getTaskRecords('task-1');
            expect(result).toEqual([mockRecord]);
        });
    });

    describe('getMissionSessionRecords', () => {
        it('should return records for mission session', async () => {
            const result = await service.getMissionSessionRecords('ms-1');
            expect(result).toEqual([mockRecord]);
        });
    });

    describe('getActiveVolunteers', () => {
        it('should return active volunteers', async () => {
            const result = await service.getActiveVolunteers();
            expect(result).toBeDefined();
        });
    });

    // ===== Stats =====
    describe('getDailySummary', () => {
        it('should return daily stats', async () => {
            recordRepo.find.mockResolvedValueOnce([
                { ...mockRecord, volunteerId: 'v1', method: 'gps', hoursWorked: 4 },
                { ...mockRecord, volunteerId: 'v2', method: 'qr', hoursWorked: 3 },
            ]);
            const result = await service.getDailySummary(new Date());
            expect(result.totalCheckIns).toBe(2);
            expect(result.uniqueVolunteers).toBe(2);
            expect(result.totalHours).toBe(7);
            expect(result.byCheckInMethod.gps).toBe(1);
            expect(result.byCheckInMethod.qr).toBe(1);
        });
    });

    describe('getMonthlyReport', () => {
        it('should return monthly report', async () => {
            recordRepo.find.mockResolvedValueOnce([
                { ...mockRecord, checkInTime: new Date(2026, 1, 1), hoursWorked: 4 },
                { ...mockRecord, checkInTime: new Date(2026, 1, 2), hoursWorked: 5 },
            ]);
            const result = await service.getMonthlyReport('vol-1', 2, 2026);
            expect(result.totalRecords).toBe(2);
            expect(result.totalHours).toBe(9);
        });
    });

    // ===== Utilities =====

    describe('generateQrCode', () => {
        it('should generate QR code info', () => {
            const result = service.generateQrCode('loc-1', '台北指揮中心', 30);
            expect(result.locationId).toBe('loc-1');
            expect(result.locationName).toBe('台北指揮中心');
            expect(result.expiresAt).toBeDefined();
            expect(result.code).toBeDefined();
        });
    });
});
