import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TacticalMapsService } from './tactical-maps.service';
import { TacticalMarker } from './entities';

describe('TacticalMapsService', () => {
    let service: TacticalMapsService;
    let repo: Record<string, jest.Mock>;

    const mockMarker = { id: 'mk-1', name: 'CP1', type: 'command_post', missionSessionId: 'ms-1', isVisible: true, createdAt: new Date() };

    beforeEach(async () => {
        repo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'mk-1', ...d })),
            save: jest.fn().mockImplementation((e) => Promise.resolve(Array.isArray(e) ? e : e)),
            find: jest.fn().mockResolvedValue([mockMarker]),
            findOne: jest.fn().mockResolvedValue(mockMarker),
            delete: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TacticalMapsService,
                { provide: getRepositoryToken(TacticalMarker), useValue: repo },
            ],
        }).compile();
        service = module.get<TacticalMapsService>(TacticalMapsService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createMarker', () => {
        it('should create and save marker', async () => {
            const result = await service.createMarker({ name: 'CP', type: 'command_post' as any });
            expect(repo.create).toHaveBeenCalled();
            expect(repo.save).toHaveBeenCalled();
        });
    });

    describe('getMarker', () => {
        it('should return marker', async () => {
            expect((await service.getMarker('mk-1')).id).toBe('mk-1');
        });

        it('should throw NotFoundException', async () => {
            repo.findOne.mockResolvedValue(null);
            await expect(service.getMarker('fake')).rejects.toThrow(NotFoundException);
        });
    });

    describe('getMarkersByMission', () => {
        it('should filter by mission and visibility', async () => {
            await service.getMarkersByMission('ms-1');
            expect(repo.find).toHaveBeenCalledWith(expect.objectContaining({
                where: { missionSessionId: 'ms-1', isVisible: true },
            }));
        });
    });

    describe('deleteByMission', () => {
        it('should delete and return affected count', async () => {
            const count = await service.deleteByMission('ms-1');
            expect(count).toBe(1);
        });
    });

    describe('calculateViewshed', () => {
        it('should return viewshed with 100% coverage when no obstacles', async () => {
            const result = await service.calculateViewshed(
                { lat: 25.03, lng: 121.56, height: 10 },
                { maxDistance: 1000 },
            );
            expect(result.coverage).toBe(100);
            expect(result.blindSpots).toHaveLength(0);
            expect(result.visibleArea.length).toBeGreaterThan(2);
        });

        it('should reduce coverage with obstacles', async () => {
            const obstacles = [
                { id: 'b1', name: 'Building A', coordinates: [121.561, 25.031] as [number, number], height: 30, footprint: [] },
            ];
            const result = await service.calculateViewshed(
                { lat: 25.03, lng: 121.56, height: 10 },
                { maxDistance: 1000 },
                obstacles,
            );
            expect(result.coverage).toBeLessThan(100);
            expect(result.blindSpots.length).toBeGreaterThan(0);
        });
    });

    describe('generateSIDC', () => {
        it('should generate friend ground SIDC', () => {
            const sidc = service.generateSIDC('friend', 'ground');
            // Format: 10 + 0 + 3 + 10 + ------ + 0000 = "100310------0000"
            expect(sidc).toBe('100310------0000');
        });

        it('should generate hostile air SIDC', () => {
            const sidc = service.generateSIDC('hostile', 'air');
            // hostile=6, air=01: 10 + 0 + 6 + 01 + ------ + 0000
            expect(sidc).toBe('100601------0000');
        });

        it('should default unknown to 1', () => {
            const sidc = service.generateSIDC('unknown', 'sea');
            // unknown=1, sea=30: 10 + 0 + 1 + 30 + ------ + 0000
            expect(sidc).toBe('100130------0000');
        });
    });
});
