import { Test, TestingModule } from '@nestjs/testing';
import { MapPackagesController } from './map-packages.controller';
import { MapPackagesService } from './map-packages.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('MapPackagesController', () => {
    let controller: MapPackagesController;

    beforeEach(async () => {
        const service = {
            list: jest.fn().mockResolvedValue([]),
            getRecommendations: jest.fn().mockResolvedValue([]),
            getManifest: jest.fn().mockResolvedValue({ id: 'pkg1' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MapPackagesController],
            providers: [{ provide: MapPackagesService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<MapPackagesController>(MapPackagesController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('list returns packages', async () => expect(await controller.list()).toEqual([]));
    it('getRecommendations returns recommendations', async () => {
        expect(await controller.getRecommendations('s1')).toEqual([]);
    });
    it('getManifest returns manifest', async () => {
        const result = await controller.getManifest('pkg1');
        expect(result).toBeDefined();
    });
});
