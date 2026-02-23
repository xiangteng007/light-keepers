import { Test, TestingModule } from '@nestjs/testing';
import { AuditController } from './audit.controller';
import { AuditService } from './audit.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AuditController', () => {
    let controller: AuditController;
    let service: jest.Mocked<Partial<AuditService>>;

    beforeEach(async () => {
        service = {
            query: jest.fn().mockResolvedValue({ logs: [], total: 0 }),
            getFailedActions: jest.fn().mockResolvedValue([]),
            getLoginAttempts: jest.fn().mockResolvedValue({ total: 10, failed: 2 }),
            getUserActivity: jest.fn().mockResolvedValue([]),
            getResourceHistory: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuditController],
            providers: [{ provide: AuditService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AuditController>(AuditController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('getLogs queries audit logs with filters', async () => {
        const result = await controller.getLogs('user1', 'login', undefined, undefined, undefined, undefined, undefined, '10', '0');
        expect(result.success).toBe(true);
        expect(service.query).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user1', action: 'login' }));
    });

    it('getFailedActions returns failed actions', async () => {
        const result = await controller.getFailedActions('48');
        expect(result.success).toBe(true);
        expect(service.getFailedActions).toHaveBeenCalledWith(48);
    });

    it('getLoginStats returns login statistics', async () => {
        const result = await controller.getLoginStats('24');
        expect(result.success).toBe(true);
        expect(service.getLoginAttempts).toHaveBeenCalledWith(24);
    });

    it('getUserActivity returns user activity', async () => {
        const result = await controller.getUserActivity('user1', '20');
        expect(result.success).toBe(true);
        expect(service.getUserActivity).toHaveBeenCalledWith('user1', 20);
    });

    it('getResourceHistory returns resource history', async () => {
        const result = await controller.getResourceHistory('task', 'task-1');
        expect(result.success).toBe(true);
        expect(service.getResourceHistory).toHaveBeenCalledWith('task', 'task-1');
    });
});
