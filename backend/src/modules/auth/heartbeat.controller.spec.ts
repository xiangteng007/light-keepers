import { Test, TestingModule } from '@nestjs/testing';
import { HeartbeatController } from './heartbeat.controller';
import { HeartbeatService } from './heartbeat.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('HeartbeatController', () => {
    let controller: HeartbeatController;
    let service: jest.Mocked<Partial<HeartbeatService>>;

    const mockReq = { user: { userId: 'cmd1', email: 'cmd@test.com', roleLevel: 4 } } as any;

    beforeEach(async () => {
        service = {
            updateHeartbeat: jest.fn().mockResolvedValue({ success: true, nextExpectedAt: new Date() }),
            getCommanderStatus: jest.fn().mockResolvedValue([{ userId: 'cmd1', isOnline: true }]),
            executeBreakGlass: jest.fn().mockResolvedValue({ success: true, message: '接管成功', newRoleLevel: 4 }),
            configureBreakGlass: jest.fn().mockResolvedValue({ success: true }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [HeartbeatController],
            providers: [{ provide: HeartbeatService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<HeartbeatController>(HeartbeatController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('updateHeartbeat updates heartbeat', async () => {
        const result = await controller.updateHeartbeat(mockReq);
        expect(result.success).toBe(true);
        expect(service.updateHeartbeat).toHaveBeenCalledWith('cmd1');
    });

    it('getCommanderStatus returns commander status', async () => {
        const result = await controller.getCommanderStatus(mockReq);
        expect(result).toHaveLength(1);
        expect(result[0].isOnline).toBe(true);
    });

    it('breakGlass executes emergency takeover', async () => {
        const result = await controller.breakGlass(mockReq, { reason: '指揮官失聯' } as any);
        expect(result.success).toBe(true);
        expect(result.message).toContain('接管');
    });

    it('configureBreakGlass configures settings', async () => {
        const result = await controller.configureBreakGlass(mockReq, { timeoutMinutes: 30, enabled: true });
        expect(result.success).toBe(true);
    });
});
