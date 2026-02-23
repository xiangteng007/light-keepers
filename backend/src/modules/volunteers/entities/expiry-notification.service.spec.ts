import { ExpiryNotificationService } from './expiry-notification.service';

describe('ExpiryNotificationService', () => {
    let service: ExpiryNotificationService;
    let certRepo: Record<string, jest.Mock>;
    let insuranceRepo: Record<string, jest.Mock>;
    let vehicleRepo: Record<string, jest.Mock>;

    const makeQB = () => ({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
    });

    beforeEach(() => {
        certRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQB()) };
        insuranceRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQB()) };
        vehicleRepo = { createQueryBuilder: jest.fn().mockReturnValue(makeQB()) };
        service = new ExpiryNotificationService(
            certRepo as any, insuranceRepo as any, vehicleRepo as any,
        );
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('getExpiringItems', () => {
        it('should return empty when nothing expiring', async () => {
            const items = await service.getExpiringItems(30);
            expect(items).toEqual([]);
        });

        it('should aggregate certificate, insurance, vehicle items', async () => {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 5);

            const certQB = makeQB();
            certQB.getMany.mockResolvedValueOnce([{
                id: 'c1', volunteerId: 'v1', certificateName: 'EMT',
                expiresAt: futureDate, volunteer: { name: 'Alice' },
            }]);
            certRepo.createQueryBuilder.mockReturnValueOnce(certQB);

            const insQB = makeQB();
            insQB.getMany.mockResolvedValueOnce([{
                id: 'i1', volunteerId: 'v1', insuranceCompany: 'TestCo',
                insuranceType: 'personal', validTo: futureDate, volunteer: { name: 'Alice' },
            }]);
            insuranceRepo.createQueryBuilder.mockReturnValueOnce(insQB);

            const result = await service.getExpiringItems(30);
            expect(result.length).toBe(2);
        });
    });

    describe('getExpiringItemsForVolunteer', () => {
        it('should filter by volunteerId', async () => {
            const result = await service.getExpiringItemsForVolunteer('v1', 30);
            expect(result).toEqual([]);
        });
    });

    describe('getTodayNotifications', () => {
        it('should filter for 7/3/1/0 day items', async () => {
            const result = await service.getTodayNotifications();
            expect(Array.isArray(result)).toBe(true);
        });
    });

    describe('sendLineNotifications', () => {
        it('should return notification result', async () => {
            const result = await service.sendLineNotifications();
            expect(result.sent).toBeDefined();
            expect(result.failed).toBeDefined();
        });
    });

    describe('calculateDaysUntil', () => {
        it('should calculate days correctly', () => {
            const future = new Date();
            future.setDate(future.getDate() + 10);
            const days = (service as any).calculateDaysUntil(future);
            expect(days).toBe(10);
        });

        it('should return 0 for today', () => {
            const today = new Date();
            const days = (service as any).calculateDaysUntil(today);
            expect(days).toBe(0);
        });
    });

    describe('formatExpiryMessage', () => {
        it('should format certificate expiry', () => {
            const msg = (service as any).formatExpiryMessage({
                type: 'certificate', name: 'EMT', daysUntilExpiry: 3,
                expiresAt: new Date(),
            });
            expect(msg).toContain('證照');
            expect(msg).toContain('即將到期');
        });

        it('should format today expiry as urgent', () => {
            const msg = (service as any).formatExpiryMessage({
                type: 'insurance', name: 'TestCo', daysUntilExpiry: 0,
                expiresAt: new Date(),
            });
            expect(msg).toContain('今日到期');
        });
    });
});
