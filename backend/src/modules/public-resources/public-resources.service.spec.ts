import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { PublicResourcesService } from './public-resources.service';

describe('PublicResourcesService', () => {
    let service: PublicResourcesService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PublicResourcesService,
                { provide: HttpService, useValue: {
                    get: jest.fn().mockReturnValue({ pipe: jest.fn() }),
                } },
            ],
        }).compile();
        service = module.get(PublicResourcesService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('getStaticShelters returns fallback data', () => {
        const shelters = (service as any).getStaticShelters();
        expect(shelters.length).toBeGreaterThan(0);
        expect(shelters[0].name).toBeDefined();
    });

    it('getStaticAedLocations returns fallback data', () => {
        const aeds = (service as any).getStaticAedLocations();
        expect(aeds.length).toBeGreaterThan(0);
    });

    it('calculateDistance returns km', () => {
        const dist = (service as any).calculateDistance(25.0330, 121.5654, 25.0480, 121.5175);
        expect(dist).toBeGreaterThan(0);
        expect(dist).toBeLessThan(10); // should be ~5km
    });

    it('toRad converts degrees', () => {
        expect((service as any).toRad(180)).toBeCloseTo(Math.PI, 5);
    });

    it('findNearbyShelters returns nearby', async () => {
        // Mock getShelters
        jest.spyOn(service, 'getShelters').mockResolvedValue([
            { id: '1', name: 'S1', city: 'Taipei', district: 'Daan', address: 'A',
              latitude: 25.033, longitude: 121.565, capacity: 100, type: 'school', status: 'open' as const },
        ]);
        const nearby = await service.findNearbyShelters(25.033, 121.565, 5);
        expect(nearby.length).toBe(1);
    });

    it('findNearbyAed returns nearby', async () => {
        jest.spyOn(service, 'getAedLocations').mockResolvedValue([
            { id: '1', name: 'AED1', address: 'B', city: 'Taipei', district: 'Daan',
              latitude: 25.033, longitude: 121.565, placeName: 'P1' },
        ]);
        const nearby = await service.findNearbyAed(25.033, 121.565, 2);
        expect(nearby.length).toBe(1);
    });
});
