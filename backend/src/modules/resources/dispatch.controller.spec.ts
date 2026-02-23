import { Test, TestingModule } from '@nestjs/testing';
import { DispatchController } from './dispatch.controller';
import { DispatchService } from './dispatch.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('DispatchController', () => {
    let controller: DispatchController;

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue({ id: 'd1' }),
            findAll: jest.fn().mockResolvedValue([]),
            getStats: jest.fn().mockResolvedValue({ pending: 1, inProgress: 2, completed: 3 }),
            findById: jest.fn().mockResolvedValue({ id: 'd1' }),
            approve: jest.fn().mockResolvedValue({ id: 'd1' }),
            reject: jest.fn().mockResolvedValue({ id: 'd1' }),
            startPicking: jest.fn().mockResolvedValue({ id: 'd1' }),
            completePicking: jest.fn().mockResolvedValue({ id: 'd1' }),
            complete: jest.fn().mockResolvedValue({ id: 'd1' }),
            cancel: jest.fn().mockResolvedValue({ id: 'd1' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DispatchController],
            providers: [{ provide: DispatchService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<DispatchController>(DispatchController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('create creates dispatch', async () => expect((await controller.create({} as any)).data).toBeDefined());
    it('findAll returns list', async () => expect((await controller.findAll()).total).toBeDefined());
    it('getStats returns stats', async () => expect((await controller.getStats()).data.pending).toBe(1));
    it('approve approves', async () => expect((await controller.approve('d1', { approverName: 'A' })).data).toBeDefined());
    it('complete completes', async () => expect((await controller.complete('d1')).data).toBeDefined());
    it('cancel cancels', async () => expect((await controller.cancel('d1', { reason: 'R' })).data).toBeDefined());
});
