import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerController } from './scheduler.controller';
import { SchedulerService } from './scheduler.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('SchedulerController', () => {
    let controller: SchedulerController;

    beforeEach(async () => {
        const service = {
            getAllTasks: jest.fn().mockResolvedValue([]),
            getAvailableHandlers: jest.fn().mockReturnValue(['handler1']),
            createTask: jest.fn().mockResolvedValue({ id: 't1' }),
            getTask: jest.fn().mockResolvedValue({ id: 't1' }),
            updateTask: jest.fn().mockResolvedValue({ id: 't1' }),
            deleteTask: jest.fn().mockResolvedValue(true),
            setTaskEnabled: jest.fn().mockResolvedValue({ id: 't1', enabled: true }),
            runTaskNow: jest.fn().mockResolvedValue({ success: true }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [SchedulerController],
            providers: [{ provide: SchedulerService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<SchedulerController>(SchedulerController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getAllTasks', async () => expect((await controller.getAllTasks()).success).toBe(true));
    it('getHandlers', async () => expect((await controller.getHandlers()).success).toBe(true));
    it('createTask', async () => expect((await controller.createTask({ name: 'T', cronExpression: '* * *', handler: 'h1' })).success).toBe(true));
    it('getTask found', async () => expect((await controller.getTask('t1')).success).toBe(true));
    it('deleteTask', async () => expect((await controller.deleteTask('t1')).success).toBe(true));
    it('toggleTask', async () => expect((await controller.toggleTask('t1', { enabled: true })).success).toBe(true));
    it('runTask', async () => expect((await controller.runTask('t1')).success).toBe(true));
});
