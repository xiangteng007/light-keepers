import { Test, TestingModule } from '@nestjs/testing';
import { ReunificationController } from './reunification.controller';
import { ReunificationService } from './reunification.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('ReunificationController', () => {
    let controller: ReunificationController;

    beforeEach(async () => {
        const service = {
            findByQueryCode: jest.fn().mockResolvedValue({ id: 'p1' }),
            createReport: jest.fn().mockResolvedValue({ id: 'p1' }),
            getByMission: jest.fn().mockResolvedValue([]),
            getStats: jest.fn().mockResolvedValue({ total: 0, found: 0 }),
            markFound: jest.fn().mockResolvedValue({ id: 'p1' }),
            markReunited: jest.fn().mockResolvedValue({ id: 'p1' }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [ReunificationController],
            providers: [{ provide: ReunificationService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<ReunificationController>(ReunificationController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('searchByQueryCode', async () => expect(await controller.searchByQueryCode('ABC')).toBeDefined());
    it('createReport', async () => expect(await controller.createReport({ name: 'John' } as any)).toBeDefined());
    it('getByMission', async () => expect(await controller.getByMission('m1')).toEqual([]));
    it('getStats', async () => expect(await controller.getStats('m1')).toBeDefined());
    it('markFound', async () => expect(await controller.markFound('p1', { status: 'found' as any })).toBeDefined());
    it('markReunited', async () => expect(await controller.markReunited('p1')).toBeDefined());
});
