import { Test, TestingModule } from '@nestjs/testing';
import { MobilizationController } from './mobilization.controller';
import { MobilizationService } from './mobilization.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('MobilizationController', () => {
    let controller: MobilizationController;

    const baseMob = { id: 'm1', title: 'Test', priority: 'high' as any, status: 'draft' as any, requiredCount: 10, confirmedCount: 5, checkedInCount: 3 };

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue(baseMob),
            findAll: jest.fn().mockResolvedValue([baseMob]),
            getStats: jest.fn().mockResolvedValue({}),
            findById: jest.fn().mockResolvedValue(baseMob),
            activate: jest.fn().mockResolvedValue(baseMob),
            complete: jest.fn().mockResolvedValue(baseMob),
            cancel: jest.fn().mockResolvedValue(baseMob),
            respond: jest.fn().mockResolvedValue({ id: 'r1' }),
            checkin: jest.fn().mockResolvedValue({ id: 'r1' }),
            getResponses: jest.fn().mockResolvedValue([]),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [MobilizationController],
            providers: [{ provide: MobilizationService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<MobilizationController>(MobilizationController);
    });

    const user = { id: 'u1' };

    it('should be defined', () => expect(controller).toBeDefined());
    it('create', async () => expect((await controller.create({} as any, user)).data).toBeDefined());
    it('findAll', async () => expect((await controller.findAll()).total).toBe(1));
    it('getStats', async () => expect((await controller.getStats()).data).toBeDefined());
    it('findById', async () => expect((await controller.findById('m1')).data).toBeDefined());
    it('activate', async () => expect((await controller.activate('m1')).message).toBe('動員令已發布'));
    it('complete', async () => expect((await controller.complete('m1')).data).toBeDefined());
    it('cancel', async () => expect((await controller.cancel('m1')).data).toBeDefined());
    it('respond', async () => expect((await controller.respond('m1', {} as any, user)).data).toBeDefined());
    it('checkin', async () => expect((await controller.checkin('m1', {} as any, user)).data).toBeDefined());
    it('getResponses', async () => expect((await controller.getResponses('m1')).total).toBe(0));
});
