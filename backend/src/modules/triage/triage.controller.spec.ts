import { Test, TestingModule } from '@nestjs/testing';
import { TriageController } from './triage.controller';
import { TriageService } from './triage.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TriageController', () => {
    let controller: TriageController;
    let service: Record<string, jest.Mock>;

    beforeEach(async () => {
        service = {
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

    // 複製 CoreJwtGuard `attachUser()` 實際掛的欄位（id/sub），舊 mock 用的 `userId` 並不存在。
    const req = { user: { id: 'u1', sub: 'u1', displayName: 'Medic' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('createVictim', async () => expect(await controller.createVictim({} as any, req)).toBeDefined());

    // 迴歸測試：留痕欄位必須真的填到操作者，不能是 undefined。
    // MCI 傷票的評估者/處置者是法律證據鏈的一部分（見 docs/architecture/MCI_DESIGN.md）。
    it('createVictim 會把評估者填成當前使用者', async () => {
        await controller.createVictim({} as any, req);
        expect(service.createVictim).toHaveBeenCalledWith(
            expect.objectContaining({ assessorId: 'u1', assessorName: 'Medic' }),
        );
    });

    it('updateTriage 會把改判者傳給 service', async () => {
        await controller.updateTriage('v1', {} as any, req);
        expect(service.updateTriage).toHaveBeenCalledWith('v1', expect.anything(), 'u1', 'Medic');
    });

    it('addMedicalLog 會把處置執行者填成當前使用者', async () => {
        await controller.addMedicalLog('v1', {} as any, req);
        expect(service.addMedicalLog).toHaveBeenCalledWith(
            'v1',
            expect.objectContaining({ performerId: 'u1', performerName: 'Medic' }),
        );
    });
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
