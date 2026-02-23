import { StaffCheckInService, CheckInType } from './staff-checkin.service';

describe('StaffCheckInService', () => {
    let service: StaffCheckInService;
    let repo: Record<string, jest.Mock>;

    beforeEach(() => {
        repo = {
            create: jest.fn().mockImplementation(data => ({ id: 'ci-1', ...data })),
            save: jest.fn().mockImplementation(data => Promise.resolve({ id: 'ci-1', ...data })),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
        };
        service = new StaffCheckInService(repo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('checkIn', () => {
        it('should create check-in record', async () => {
            const result = await service.checkIn({
                staffId: 'staff-1',
                type: CheckInType.ROUTINE,
                location: { latitude: 25.03, longitude: 121.56 },
            });
            expect(repo.create).toHaveBeenCalled();
            expect(repo.save).toHaveBeenCalled();
            expect(result.staffId).toBe('staff-1');
        });

        it('should handle panic type check-in', async () => {
            const result = await service.checkIn({
                staffId: 'staff-2',
                type: CheckInType.PANIC,
                message: 'Help!',
            });
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('getOverdueCheckIns', () => {
        it('should return empty when no overdue', async () => {
            const overdue = await service.getOverdueCheckIns();
            expect(Array.isArray(overdue)).toBe(true);
        });

        it('should filter by missionId', async () => {
            const overdue = await service.getOverdueCheckIns('mission-1');
            expect(repo.find).toHaveBeenCalled();
        });
    });

    describe('getLastKnownLocation', () => {
        it('should return null if no check-ins', async () => {
            const loc = await service.getLastKnownLocation('unknown');
            expect(loc).toBeNull();
        });

        it('should return last location', async () => {
            repo.findOne.mockResolvedValueOnce({
                latitude: 25.03,
                longitude: 121.56,
                checkedInAt: new Date(),
            });
            const loc = await service.getLastKnownLocation('staff-1');
            expect(loc).toBeDefined();
            expect(loc?.latitude).toBe(25.03);
        });
    });

    describe('getCheckInHistory', () => {
        it('should return check-in history', async () => {
            repo.find.mockResolvedValueOnce([{ id: '1' }, { id: '2' }]);
            const history = await service.getCheckInHistory('staff-1');
            expect(history.length).toBe(2);
        });

        it('should respect limit', async () => {
            await service.getCheckInHistory('staff-1', 10);
            expect(repo.find).toHaveBeenCalledWith(
                expect.objectContaining({ take: 10 }),
            );
        });
    });
});
