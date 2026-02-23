import { Test, TestingModule } from '@nestjs/testing';
import { TaskDispatchController } from './task-dispatch.controller';
import { TaskDispatchService } from './task-dispatch.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TaskDispatchController', () => {
    let controller: TaskDispatchController;

    beforeEach(async () => {
        const service = {
            createTask: jest.fn().mockResolvedValue({ id: 't1' }),
            getTasksByMission: jest.fn().mockResolvedValue([]),
            getVolunteerTasks: jest.fn().mockResolvedValue([]),
            getTaskById: jest.fn().mockResolvedValue({ id: 't1' }),
            updateTask: jest.fn().mockResolvedValue({ id: 't1' }),
            assignTask: jest.fn().mockResolvedValue({ id: 't1' }),
            acceptAssignment: jest.fn().mockResolvedValue({ id: 't1' }),
            declineAssignment: jest.fn().mockResolvedValue({ id: 't1' }),
            startTask: jest.fn().mockResolvedValue({ id: 't1' }),
            completeTask: jest.fn().mockResolvedValue({ id: 't1' }),
            cancelTask: jest.fn().mockResolvedValue({ id: 't1' }),
            getMissionStats: jest.fn().mockResolvedValue({}),
            checkIn: jest.fn().mockResolvedValue({ id: 't1' }),
            checkOut: jest.fn().mockResolvedValue({ id: 't1' }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TaskDispatchController],
            providers: [{ provide: TaskDispatchService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<TaskDispatchController>(TaskDispatchController);
    });

    const req = { user: { id: 'u1' } } as any;

    it('should be defined', () => expect(controller).toBeDefined());
    it('createTask', async () => expect(await controller.createTask({} as any, req)).toBeDefined());
    it('getTasks', async () => expect(await controller.getTasks('m1')).toEqual([]));
    it('getMyTasks', async () => expect(await controller.getMyTasks(req)).toEqual([]));
    it('getTask', async () => expect(await controller.getTask('t1')).toBeDefined());
    it('updateTask', async () => expect(await controller.updateTask('t1', {} as any)).toBeDefined());
    it('assignTask', async () => expect(await controller.assignTask('t1', { volunteerIds: ['v1'] } as any, req)).toBeDefined());
    it('acceptTask', async () => expect(await controller.acceptTask('t1', {} as any, req)).toBeDefined());
    it('declineTask', async () => expect(await controller.declineTask('t1', { reason: 'busy' } as any, req)).toBeDefined());
    it('startTask', async () => expect(await controller.startTask('t1', req)).toBeDefined());
    it('completeTask', async () => expect(await controller.completeTask('t1', {} as any, req)).toBeDefined());
    it('cancelTask', async () => expect(await controller.cancelTask('t1')).toBeDefined());
    it('getStats', async () => expect(await controller.getStats('m1')).toBeDefined());
    it('checkIn', async () => expect(await controller.checkIn('t1', { latitude: 25, longitude: 121 }, req)).toBeDefined());
    it('checkOut', async () => expect(await controller.checkOut('t1', {}, req)).toBeDefined());
});
