import { Test, TestingModule } from '@nestjs/testing';
import { TaskClaimsController } from './task-claims.controller';
import { TaskClaimsService } from './task-claims.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TaskClaimsController', () => {
    let controller: TaskClaimsController;
    const mockUser = { uid: 'u1', id: 'u1' } as any;

    beforeEach(async () => {
        const service = {
            claim: jest.fn().mockResolvedValue({ claimedBy: 'u1', claimedAt: new Date() }),
            release: jest.fn().mockResolvedValue(undefined),
            addProgress: jest.fn().mockResolvedValue({ id: 'p1', status: 'in_progress', createdAt: new Date() }),
            getProgress: jest.fn().mockResolvedValue([]),
            getCurrentClaim: jest.fn().mockResolvedValue({ claimedBy: 'u1', claimedAt: new Date() }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [TaskClaimsController],
            providers: [{ provide: TaskClaimsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<TaskClaimsController>(TaskClaimsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('claimTask claims a task', async () => {
        const result = await controller.claimTask('t1', { missionSessionId: 'ms1' } as any, mockUser);
        expect(result.taskId).toBe('t1');
        expect(result.claimedBy).toBe('u1');
    });

    it('releaseTask releases a task', async () => {
        const result = await controller.releaseTask('t1', { missionSessionId: 'ms1' } as any, mockUser);
        expect(result.released).toBe(true);
    });

    it('addProgress adds progress update', async () => {
        const result = await controller.addProgress('t1', { missionSessionId: 'ms1', note: 'Working' } as any, mockUser);
        expect(result.progressId).toBe('p1');
    });

    it('getProgress returns progress list', async () => {
        const result = await controller.getProgress('t1');
        expect(result).toBeDefined();
    });

    it('getCurrentClaim returns current claim', async () => {
        const result = await controller.getCurrentClaim('t1');
        expect(result.claimed).toBe(true);
    });
});
