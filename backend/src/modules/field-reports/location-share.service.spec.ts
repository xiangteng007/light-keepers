import { LocationShareService } from './location-share.service';

describe('LocationShareService', () => {
    let service: LocationShareService;
    let shareRepo: Record<string, jest.Mock>;
    let historyRepo: Record<string, jest.Mock>;
    const mockUser = { uid: 'u1', displayName: 'Alice' };
    const mockShare = {
        id: 'ls1', userId: 'u1', missionSessionId: 'ms1',
        isEnabled: true, mode: 'field', lastGeom: { type: 'Point', coordinates: [121.56, 25.03] },
        lastAt: new Date(), userName: 'Alice', callsign: null,
        lastAccuracyM: 5, lastHeading: 90, lastSpeed: 1.2,
    };

    beforeEach(() => {
        shareRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([mockShare]),
            create: jest.fn().mockImplementation(d => ({ id: 'ls1', ...d })),
            save: jest.fn().mockImplementation(d => Promise.resolve(d)),
            createQueryBuilder: jest.fn().mockReturnValue({
                update: jest.fn().mockReturnThis(),
                set: jest.fn().mockReturnThis(),
                where: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ affected: 1 }),
            }),
        };
        historyRepo = {
            createQueryBuilder: jest.fn().mockReturnValue({
                insert: jest.fn().mockReturnThis(),
                into: jest.fn().mockReturnThis(),
                values: jest.fn().mockReturnThis(),
                execute: jest.fn().mockResolvedValue({ raw: [] }),
            }),
        };
        service = new LocationShareService(shareRepo as any, historyRepo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('start', () => {
        it('should create new location share', async () => {
            const result = await service.start('ms1', { mode: 'field' } as any, mockUser);
            expect(shareRepo.save).toHaveBeenCalled();
            expect(result.isEnabled).toBe(true);
        });

        it('should reuse existing share', async () => {
            shareRepo.findOne.mockResolvedValueOnce({ ...mockShare, isEnabled: false });
            const result = await service.start('ms1', { mode: 'field' } as any, mockUser);
            expect(shareRepo.save).toHaveBeenCalled();
        });

        it('should set TTL for SOS mode', async () => {
            const result = await service.start('ms1', { mode: 'sos' } as any, mockUser);
            expect(result.ttlExpiresAt).toBeDefined();
        });
    });

    describe('stop', () => {
        it('should stop location sharing', async () => {
            shareRepo.findOne.mockResolvedValueOnce({ ...mockShare });
            const result = await service.stop('ms1', mockUser);
            expect(result.isEnabled).toBe(false);
            expect(result.mode).toBe('off');
        });

        it('should throw if no share found', async () => {
            await expect(service.stop('ms1', mockUser)).rejects.toThrow();
        });
    });

    describe('updateLocation', () => {
        it('should update location for active share', async () => {
            shareRepo.findOne.mockResolvedValueOnce({ ...mockShare });
            const result = await service.updateLocation('ms1', {
                latitude: 25.04, longitude: 121.57, accuracyM: 3,
            } as any, mockUser);
            expect(result).toBe(true);
        });

        it('should return false if no active share', async () => {
            const result = await service.updateLocation('ms1', { latitude: 25.04, longitude: 121.57 } as any, mockUser);
            expect(result).toBe(false);
        });
    });

    describe('getLiveLocations', () => {
        it('should return GeoJSON FeatureCollection', async () => {
            const result = await service.getLiveLocations('ms1');
            expect(result.type).toBe('FeatureCollection');
            expect(result.features.length).toBe(1);
            expect(result.features[0].properties.userId).toBe('u1');
        });
    });
});
