import { Test, TestingModule } from '@nestjs/testing';
import { MenuConfigController } from './menu-config.controller';
import { MenuConfigService } from './menu-config.service';
import { CoreJwtGuard } from '../shared/guards';

describe('MenuConfigController', () => {
    let controller: MenuConfigController;

    beforeEach(async () => {
        const service = {
            getAll: jest.fn().mockResolvedValue([]),
            updateAll: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MenuConfigController],
            providers: [{ provide: MenuConfigService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<MenuConfigController>(MenuConfigController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getAll returns configs', async () => {
        const result = await controller.getAll();
        expect(result).toHaveProperty('data');
    });

    it('updateAll updates configs for owner', async () => {
        const user = { roleLevel: 5 } as any;
        const result = await controller.updateAll({ items: [] }, user);
        expect(result).toHaveProperty('message');
    });

    it('updateAll throws for non-owner', async () => {
        const user = { roleLevel: 2 } as any;
        await expect(controller.updateAll({ items: [] }, user)).rejects.toThrow();
    });
});
