import { Test, TestingModule } from '@nestjs/testing';
import { OverlaysController } from './overlays.controller';
import { OverlaysService } from './overlays.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('OverlaysController', () => {
    let controller: OverlaysController;

    beforeEach(async () => {
        const service = {
            findAll: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue({ id: 'o1' }),
            create: jest.fn().mockResolvedValue({ id: 'o1' }),
            update: jest.fn().mockResolvedValue({ id: 'o1' }),
            publish: jest.fn().mockResolvedValue({ id: 'o1' }),
            remove: jest.fn().mockResolvedValue(undefined),
            acquireLock: jest.fn().mockResolvedValue({ success: true, expiresAt: new Date() }),
            releaseLock: jest.fn().mockResolvedValue({ success: true }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [OverlaysController],
            providers: [{ provide: OverlaysService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<OverlaysController>(OverlaysController);
    });

    const user = { uid: 'u1' };

    it('should be defined', () => expect(controller).toBeDefined());
    it('findAll returns overlays', async () => expect(await controller.findAll('s1', {} as any)).toEqual([]));
    it('findOne returns overlay', async () => expect(await controller.findOne('o1')).toBeDefined());
    it('create creates overlay', async () => expect(await controller.create('s1', {} as any, user)).toBeDefined());
    it('update updates overlay', async () => expect(await controller.update('o1', {} as any, '1', user)).toBeDefined());
    it('publish publishes', async () => expect(await controller.publish('o1', user)).toBeDefined());
    it('remove deletes', async () => await controller.remove('o1', user));
    it('acquireLock acquires', async () => {
        const result = await controller.acquireLock('o1', user);
        expect(result.success).toBe(true);
    });
    it('releaseLock releases', async () => {
        const result = await controller.releaseLock('o1', user);
        expect(result.success).toBe(true);
    });
});
