import { Test, TestingModule } from '@nestjs/testing';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TriageController', () => {
    let controller: TriageController;

    beforeEach(async () => {
        const service = {
            createVictim: jest.fn().mockResolvedValue({ id: 'v1' }),
            getVictim: jest.fn().mockResolvedValue({ id: 'v1' }),
            getVictimByBracelet: jest.fn().mockResolvedValue({ id: 'v1' }),
            getVictimsByMission: jest.fn().mockResolvedValue([]),
            updateTriage: jest.fn().mockResolvedValue({ id: 'v1' }),
            startTransport: jest.fn().mockResolvedValue({ id: 'v1' }),
            confirmArrival: jest.fn().mockResolvedValue({ id: 'v1' }),
            addMedicalLog: jest.fn().mockResolvedValue({ id: 'l1' }),
            getMedicalLogs: jest.fn().mockResolvedValue([]),
            getStats: jest.fn().mockResolvedValue({}),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TriageController],
            providers: [{ provide: TriageService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<TriageController>(TriageController);
    });

    const req = { user: { userId: 'u1', displayName: 'Medic' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('createVictim', async () => expect(await controller.createVictim({} as any, req)).toBeDefined());
    it('getVictim', async () => expect(await controller.getVictim('v1')).toBeDefined());
    it('getVictimByBracelet', async () => expect(await controller.getVictimByBracelet('br1')).toBeDefined());
    it('getVictimsByMission', async () => expect(await controller.getVictimsByMission('m1')).toEqual([]));
    it('updateTriage', async () => expect(await controller.updateTriage('v1', {} as any, req)).toBeDefined());
    it('startTransport', async () => expect(await controller.startTransport('v1', {} as any)).toBeDefined());
    it('confirmArrival', async () => expect(await controller.confirmArrival('v1')).toBeDefined());
    it('addMedicalLog', async () => expect(await controller.addMedicalLog('v1', {} as any, req)).toBeDefined());
    it('getMedicalLogs', async () => expect(await controller.getMedicalLogs('v1')).toEqual([]));
    it('getStats', async () => expect(await controller.getStats('m1')).toBeDefined());
});
