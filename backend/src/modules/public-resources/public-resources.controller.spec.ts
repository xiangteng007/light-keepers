import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { PublicResourcesController } from './public-resources.controller';
import { PublicResourcesService } from './public-resources.service';
import { AirRaidSheltersService } from './air-raid-shelters.service';
import { IS_PUBLIC_KEY } from '../shared/guards';

// @nestjs/throttler doesn't export these metadata key constants from its
// public API (they're internal to throttler.constants.ts), so we mirror
// their known values here to assert @Throttle() metadata on our handlers.
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_TTL = 'THROTTLER:TTL';

describe('PublicResourcesController', () => {
    let controller: PublicResourcesController;
    let airRaidSheltersService: { findAll: jest.Mock; findNearby: jest.Mock };

    beforeEach(async () => {
        const service = {
            getShelters: jest.fn().mockResolvedValue([]),
            findNearbyShelters: jest.fn().mockResolvedValue([]),
            getAedLocations: jest.fn().mockResolvedValue([]),
            findNearbyAed: jest.fn().mockResolvedValue([]),
        };

        airRaidSheltersService = {
            findAll: jest.fn().mockResolvedValue([]),
            findNearby: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PublicResourcesController],
            providers: [
                { provide: PublicResourcesService, useValue: service },
                { provide: AirRaidSheltersService, useValue: airRaidSheltersService },
            ],
        }).compile();

        controller = module.get<PublicResourcesController>(PublicResourcesController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getShelters returns shelters', async () => {
        const result = await controller.getShelters();
        expect(result).toHaveProperty('data');
    });
    it('getNearbyShelters returns nearby', async () => {
        const result = await controller.getNearbyShelters('25.03', '121.56');
        expect(result).toHaveProperty('data');
    });
    it('getAedLocations returns AEDs', async () => {
        const result = await controller.getAedLocations();
        expect(result).toHaveProperty('data');
    });
    it('getMapData returns map data', async () => {
        const result = await controller.getMapData('shelters,aed');
        expect(result).toBeDefined();
    });

    describe('air-raid shelters', () => {
        it('getAirRaidShelters returns data from AirRaidSheltersService', async () => {
            const fake = [{ id: 'a1', name: '測試防空避難處所' }];
            airRaidSheltersService.findAll.mockResolvedValueOnce(fake);

            const result = await controller.getAirRaidShelters();

            expect(airRaidSheltersService.findAll).toHaveBeenCalled();
            expect(result).toEqual({ data: fake, total: 1 });
        });

        it('getNearbyAirRaidShelters returns nearby data with parsed query params', async () => {
            const fake = [{ id: 'a2', name: '附近防空避難處所' }];
            airRaidSheltersService.findNearby.mockResolvedValueOnce(fake);

            const result = await controller.getNearbyAirRaidShelters('25.05', '121.55', '3');

            expect(airRaidSheltersService.findNearby).toHaveBeenCalledWith(25.05, 121.55, 3);
            expect(result).toEqual({ data: fake, total: 1 });
        });

        it('getNearbyAirRaidShelters returns empty result for invalid coordinates', async () => {
            const result = await controller.getNearbyAirRaidShelters('not-a-number', '121.55');
            expect(result).toEqual({ data: [], total: 0 });
            expect(airRaidSheltersService.findNearby).not.toHaveBeenCalled();
        });

        it('getAirRaidShelters is marked @Public()', () => {
            const reflector = new Reflector();
            const isPublic = reflector.get<boolean>(
                IS_PUBLIC_KEY,
                PublicResourcesController.prototype.getAirRaidShelters,
            );
            expect(isPublic).toBe(true);
        });

        it('getNearbyAirRaidShelters is marked @Public()', () => {
            const reflector = new Reflector();
            const isPublic = reflector.get<boolean>(
                IS_PUBLIC_KEY,
                PublicResourcesController.prototype.getNearbyAirRaidShelters,
            );
            expect(isPublic).toBe(true);
        });

        it('getAirRaidShelters is throttled to 30 requests / 60s', () => {
            const limit = Reflect.getMetadata(
                THROTTLER_LIMIT + 'default',
                PublicResourcesController.prototype.getAirRaidShelters,
            );
            const ttl = Reflect.getMetadata(
                THROTTLER_TTL + 'default',
                PublicResourcesController.prototype.getAirRaidShelters,
            );
            expect(limit).toBe(30);
            expect(ttl).toBe(60000);
        });

        it('getNearbyAirRaidShelters is throttled to 30 requests / 60s', () => {
            const limit = Reflect.getMetadata(
                THROTTLER_LIMIT + 'default',
                PublicResourcesController.prototype.getNearbyAirRaidShelters,
            );
            const ttl = Reflect.getMetadata(
                THROTTLER_TTL + 'default',
                PublicResourcesController.prototype.getNearbyAirRaidShelters,
            );
            expect(limit).toBe(30);
            expect(ttl).toBe(60000);
        });
    });
});
