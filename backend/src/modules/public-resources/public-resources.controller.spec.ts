import { Test, TestingModule } from '@nestjs/testing';
import { PublicResourcesController } from './public-resources.controller';
import { PublicResourcesService } from './public-resources.service';

describe('PublicResourcesController', () => {
    let controller: PublicResourcesController;

    beforeEach(async () => {
        const service = {
            getShelters: jest.fn().mockResolvedValue([]),
            findNearbyShelters: jest.fn().mockResolvedValue([]),
            getAedLocations: jest.fn().mockResolvedValue([]),
            findNearbyAed: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PublicResourcesController],
            providers: [{ provide: PublicResourcesService, useValue: service }],
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
});
