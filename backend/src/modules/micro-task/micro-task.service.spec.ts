import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MicroTaskService } from './micro-task.service';

describe('MicroTaskService', () => {
    let service: MicroTaskService;
    let eventEmitter: { emit: jest.Mock };

    // Taipei 101 area
    const TPE_LOC = { lat: 25.0330, lng: 121.5654 };
    // ~500m away
    const NEARBY = { lat: 25.0335, lng: 121.5660 };
    // ~50km away (Taoyuan)
    const FAR_AWAY = { lat: 24.9930, lng: 121.3010 };

    const baseConfig = {
        title: '拍照回報路面狀況',
        description: '請拍照記錄',
        type: 'photo' as const,
        location: TPE_LOC,
    };

    beforeEach(async () => {
        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MicroTaskService,
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<MicroTaskService>(MicroTaskService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== createTask =====
    describe('createTask', () => {
        it('should create a task with defaults', async () => {
            const task = await service.createTask(baseConfig);
            expect(task.id).toContain('mtask-');
            expect(task.status).toBe('open');
            expect(task.radius).toBe(1000);
            expect(task.points).toBe(10);
            expect(task.maxParticipants).toBe(5);
        });

        it('should override defaults', async () => {
            const task = await service.createTask({ ...baseConfig, radius: 500, points: 50 });
            expect(task.radius).toBe(500);
            expect(task.points).toBe(50);
        });

        it('should emit microtask.created event', async () => {
            await service.createTask(baseConfig);
            expect(eventEmitter.emit).toHaveBeenCalledWith('microtask.created', expect.any(Object));
        });
    });

    // ===== getAvailableTasks =====
    describe('getAvailableTasks', () => {
        it('should return tasks within radius', async () => {
            await service.createTask(baseConfig);
            const tasks = service.getAvailableTasks('u-1', NEARBY);
            expect(tasks.length).toBe(1);
        });

        it('should not return tasks out of radius', async () => {
            await service.createTask(baseConfig);
            const tasks = service.getAvailableTasks('u-1', FAR_AWAY);
            expect(tasks.length).toBe(0);
        });

        it('should not return full tasks', async () => {
            const task = await service.createTask({ ...baseConfig, maxParticipants: 1 });
            await service.acceptTask(task.id, 'u-1');
            const tasks = service.getAvailableTasks('u-2', NEARBY);
            expect(tasks.length).toBe(0);
        });
    });

    // ===== acceptTask =====
    describe('acceptTask', () => {
        it('should create an assignment', async () => {
            const task = await service.createTask(baseConfig);
            const assignment = await service.acceptTask(task.id, 'u-1');
            expect(assignment.id).toContain('assign-');
            expect(assignment.status).toBe('in_progress');
            expect(assignment.taskId).toBe(task.id);
        });

        it('should set task to full when max reached', async () => {
            const task = await service.createTask({ ...baseConfig, maxParticipants: 1 });
            await service.acceptTask(task.id, 'u-1');
            // Task should now be full, can't accept
            await expect(service.acceptTask(task.id, 'u-2')).rejects.toThrow('Task not available');
        });

        it('should throw for nonexistent task', async () => {
            await expect(service.acceptTask('fake-id', 'u-1')).rejects.toThrow('Task not found');
        });

        it('should emit microtask.accepted event', async () => {
            const task = await service.createTask(baseConfig);
            eventEmitter.emit.mockClear();
            await service.acceptTask(task.id, 'u-1');
            expect(eventEmitter.emit).toHaveBeenCalledWith('microtask.accepted', expect.any(Object));
        });
    });

    // ===== completeTask =====
    describe('completeTask', () => {
        it('should mark assignment as pending_review', async () => {
            const task = await service.createTask(baseConfig);
            const assignment = await service.acceptTask(task.id, 'u-1');
            const evidence = { type: 'photo' as const, url: 'https://img.url', timestamp: new Date() };
            const completed = await service.completeTask(assignment.id, 'u-1', evidence);
            expect(completed.status).toBe('pending_review');
            expect(completed.evidence).toHaveLength(1);
        });

        it('should throw for unknown assignment', async () => {
            const evidence = { type: 'text' as const, text: 'done', timestamp: new Date() };
            await expect(service.completeTask('fake', 'u-1', evidence)).rejects.toThrow('Assignment not found');
        });

        it('should emit microtask.submitted event', async () => {
            const task = await service.createTask(baseConfig);
            const assignment = await service.acceptTask(task.id, 'u-1');
            eventEmitter.emit.mockClear();
            await service.completeTask(assignment.id, 'u-1', { type: 'photo' as const, timestamp: new Date() });
            expect(eventEmitter.emit).toHaveBeenCalledWith('microtask.submitted', expect.any(Object));
        });
    });

    // ===== verifyCompletion =====
    describe('verifyCompletion', () => {
        it('should approve assignment', async () => {
            const task = await service.createTask(baseConfig);
            const assignment = await service.acceptTask(task.id, 'u-1');
            await service.completeTask(assignment.id, 'u-1', { type: 'text' as const, text: 'ok', timestamp: new Date() });
            const verified = await service.verifyCompletion(assignment.id, 'admin', true);
            expect(verified.status).toBe('completed');
        });

        it('should reject assignment', async () => {
            const task = await service.createTask(baseConfig);
            const assignment = await service.acceptTask(task.id, 'u-1');
            const rejected = await service.verifyCompletion(assignment.id, 'admin', false);
            expect(rejected.status).toBe('rejected');
        });

        it('should emit microtask.completed on approval', async () => {
            const task = await service.createTask(baseConfig);
            const assignment = await service.acceptTask(task.id, 'u-1');
            eventEmitter.emit.mockClear();
            await service.verifyCompletion(assignment.id, 'admin', true);
            expect(eventEmitter.emit).toHaveBeenCalledWith('microtask.completed', expect.objectContaining({
                userId: 'u-1',
                points: task.points,
            }));
        });

        it('should throw for nonexistent assignment', async () => {
            await expect(service.verifyCompletion('fake', 'admin', true)).rejects.toThrow('Assignment not found');
        });
    });
});
