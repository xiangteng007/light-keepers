import { Test, TestingModule } from '@nestjs/testing';
import { DrillController } from './drill.controller';
import { DrillSimulationService } from './drill.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('DrillController', () => {
    let controller: DrillController;

    beforeEach(async () => {
        const service = {
            getGlobalState: jest.fn().mockReturnValue({ isDrillMode: false, currentScenario: null }),
            getAllScenarios: jest.fn().mockResolvedValue([{ id: 's1', title: '地震演練' }]),
            getScenario: jest.fn().mockResolvedValue({ id: 's1', title: '地震演練' }),
            createScenario: jest.fn().mockResolvedValue({ id: 's2' }),
            updateScenario: jest.fn().mockResolvedValue({ id: 's1', title: '更新演練' }),
            startDrill: jest.fn().mockResolvedValue({ success: true, message: '演練已啟動' }),
            stopDrill: jest.fn().mockResolvedValue({ success: true, result: { score: 85 } }),
            recordEventResponse: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DrillController],
            providers: [{ provide: DrillSimulationService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<DrillController>(DrillController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getStatus returns drill status', async () => {
        const result = await controller.getStatus();
        expect(result.success).toBe(true);
        expect(result.data.message).toContain('正常模式');
    });

    it('getAllScenarios returns scenarios', async () => {
        const result = await controller.getAllScenarios();
        expect(result.data).toHaveLength(1);
    });

    it('getScenario returns single scenario', async () => {
        const result = await controller.getScenario('s1');
        expect(result.data).toBeDefined();
    });

    it('createScenario creates scenario', async () => {
        const result = await controller.createScenario({ title: '新演練', events: [] });
        expect(result.message).toContain('建立');
    });

    it('startDrill starts a drill', async () => {
        const result = await controller.startDrill('s1');
        expect(result.success).toBe(true);
    });

    it('stopDrill stops a drill', async () => {
        const result = await controller.stopDrill();
        expect(result.message).toContain('結束');
    });

    it('recordResponse records event response', async () => {
        const result = await controller.recordResponse('0', { responseTimeMs: 1500 });
        expect(result.success).toBe(true);
    });

    it('getTemplates returns drill templates', async () => {
        const result = await controller.getTemplates();
        expect(result.data.length).toBeGreaterThan(0);
    });
});
