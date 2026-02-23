import { Test, TestingModule } from '@nestjs/testing';
import { LocationsController } from './locations.controller';
import { LocationsService } from './locations.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('LocationsController', () => {
    let controller: LocationsController;

    beforeEach(async () => {
        const service = {
            search: jest.fn().mockResolvedValue([]),
            getChanges: jest.fn().mockResolvedValue([]),
            import: jest.fn().mockResolvedValue({ count: 10 }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [LocationsController],
            providers: [{ provide: LocationsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<LocationsController>(LocationsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('search returns locations', async () => expect(await controller.search({} as any)).toEqual([]));
    it('getChanges returns changes', async () => expect(await controller.getChanges({} as any)).toEqual([]));
    it('import imports locations', async () => {
        const result = await controller.import({} as any);
        expect(result.count).toBe(10);
    });
});
