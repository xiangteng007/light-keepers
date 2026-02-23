import { CheckInService } from './checkin.service';

describe('CheckInService (Volunteers)', () => {
    let service: CheckInService;
    let pointsRepo: Record<string, jest.Mock>;
    let volunteerRepo: Record<string, jest.Mock>;

    beforeEach(() => {
        pointsRepo = {
            create: jest.fn().mockImplementation(d => d),
            save: jest.fn().mockResolvedValue({}),
            find: jest.fn().mockResolvedValue([]),
        };
        volunteerRepo = {
            findOne: jest.fn().mockResolvedValue({ id: 'v1', name: '志工A', serviceHours: 0, totalPoints: 0 }),
            increment: jest.fn().mockResolvedValue({}),
        };
        service = new CheckInService(pointsRepo as any, volunteerRepo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('checkIn', () => {
        it('should create check-in record', async () => {
            const record = await service.checkIn({ volunteerId: 'v1', location: '台北' });
            expect(record.id).toBeDefined();
            expect(record.volunteerId).toBe('v1');
            expect(record.checkInTime).toBeDefined();
        });

        it('should throw on duplicate check-in', async () => {
            await service.checkIn({ volunteerId: 'v1' });
            await expect(service.checkIn({ volunteerId: 'v1' }))
                .rejects.toThrow('您已簽到');
        });

        it('should throw if volunteer not found', async () => {
            volunteerRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.checkIn({ volunteerId: 'bad' }))
                .rejects.toThrow('志工不存在');
        });
    });

    describe('checkOut', () => {
        it('should record check-out and calculate points', async () => {
            await service.checkIn({ volunteerId: 'v1' });
            const result = await service.checkOut({ volunteerId: 'v1' });
            expect(result.record.checkOutTime).toBeDefined();
            expect(typeof result.hours).toBe('number');
            expect(typeof result.pointsEarned).toBe('number');
            expect(pointsRepo.save).toHaveBeenCalled();
        });

        it('should throw if not checked in', async () => {
            await expect(service.checkOut({ volunteerId: 'v-none' }))
                .rejects.toThrow('您尚未簽到');
        });
    });

    describe('getCheckInStatus', () => {
        it('should return null if not checked in', async () => {
            const status = await service.getCheckInStatus('v99');
            expect(status).toBeNull();
        });

        it('should return record if checked in', async () => {
            await service.checkIn({ volunteerId: 'v1' });
            const status = await service.getCheckInStatus('v1');
            expect(status).toBeDefined();
            expect(status!.volunteerId).toBe('v1');
        });
    });

    describe('getActiveCheckIns', () => {
        it('should return all active check-ins', async () => {
            await service.checkIn({ volunteerId: 'v1' });
            const active = await service.getActiveCheckIns();
            expect(active.length).toBe(1);
        });
    });

    describe('cancelCheckIn', () => {
        it('should cancel check-in', async () => {
            await service.checkIn({ volunteerId: 'v1' });
            await service.cancelCheckIn('v1');
            const status = await service.getCheckInStatus('v1');
            expect(status).toBeNull();
        });
    });

    describe('calculateHours', () => {
        it('should calculate hours correctly', () => {
            const now = new Date();
            const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
            const hours = (service as any).calculateHours(twoHoursAgo, now);
            expect(hours).toBe(2);
        });
    });

    describe('isNightShift', () => {
        it('should detect night shift (after 22:00)', () => {
            const late = new Date('2026-02-10T23:00:00');
            const lateEnd = new Date('2026-02-11T03:00:00');
            expect((service as any).isNightShift(late, lateEnd)).toBe(true);
        });

        it('should detect day shift', () => {
            const day = new Date('2026-02-10T09:00:00');
            const dayEnd = new Date('2026-02-10T17:00:00');
            expect((service as any).isNightShift(day, dayEnd)).toBe(false);
        });
    });
});
