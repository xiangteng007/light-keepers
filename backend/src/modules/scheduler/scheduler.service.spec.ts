import { Test, TestingModule } from '@nestjs/testing';
import { SchedulerRegistry } from '@nestjs/schedule';
import { SchedulerService, ScheduledTask } from './scheduler.service';
import { CacheService } from '../cache/cache.service';

// Mock CronJob
jest.mock('cron', () => ({
    CronJob: jest.fn().mockImplementation((expr, cb) => ({
        start: jest.fn(),
        stop: jest.fn(),
        nextDate: jest.fn().mockReturnValue({ toJSDate: () => new Date('2026-01-01') }),
    })),
}));

describe('SchedulerService', () => {
    let service: SchedulerService;
    let cache: { get: jest.Mock; set: jest.Mock };
    let registry: { addCronJob: jest.Mock; deleteCronJob: jest.Mock; doesExist: jest.Mock };

    beforeEach(async () => {
        cache = {
            get: jest.fn().mockResolvedValue([]),
            set: jest.fn().mockResolvedValue(undefined),
        };
        registry = {
            addCronJob: jest.fn(),
            deleteCronJob: jest.fn(),
            doesExist: jest.fn().mockReturnValue(false),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SchedulerService,
                { provide: CacheService, useValue: cache },
                { provide: SchedulerRegistry, useValue: registry },
            ],
        }).compile();

        service = module.get<SchedulerService>(SchedulerService);
        // Manually call onModuleInit (registers built-in handlers)
        await service.onModuleInit();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('registerHandler / getAvailableHandlers', () => {
        it('should register built-in handlers on init', () => {
            const handlers = service.getAvailableHandlers();
            expect(handlers).toContain('health-check');
            expect(handlers).toContain('cleanup-old-data');
            expect(handlers).toContain('sync-external-data');
            expect(handlers).toContain('generate-daily-report');
        });

        it('should register custom handler', () => {
            service.registerHandler('my-handler', async () => ({ success: true, duration: 0 }));
            expect(service.getAvailableHandlers()).toContain('my-handler');
        });
    });

    describe('createTask', () => {
        it('should create and save a task', async () => {
            const task = await service.createTask({
                name: 'Test Task',
                cronExpression: '0 * * * *',
                enabled: false,
                handler: 'health-check',
            });
            expect(task.id).toContain('task-');
            expect(task.name).toBe('Test Task');
            expect(task.runCount).toBe(0);
            expect(cache.set).toHaveBeenCalled();
        });

        it('should schedule task when enabled', async () => {
            await service.createTask({
                name: 'Enabled Task',
                cronExpression: '0 * * * *',
                enabled: true,
                handler: 'health-check',
            });
            expect(registry.addCronJob).toHaveBeenCalled();
        });
    });

    describe('getAllTasks / getTask', () => {
        it('should return all tasks', async () => {
            await service.createTask({ name: 'A', cronExpression: '* * * * *', enabled: false, handler: 'health-check' });
            const tasks = await service.getAllTasks();
            expect(tasks.length).toBeGreaterThanOrEqual(1);
        });

        it('should find task by id', async () => {
            const created = await service.createTask({ name: 'Find Me', cronExpression: '* * * * *', enabled: false, handler: 'health-check' });
            const found = await service.getTask(created.id);
            expect(found?.name).toBe('Find Me');
        });

        it('should return null for missing task', async () => {
            const found = await service.getTask('nonexistent');
            expect(found).toBeNull();
        });
    });

    describe('updateTask', () => {
        it('should update task properties', async () => {
            const task = await service.createTask({ name: 'Old', cronExpression: '* * * * *', enabled: false, handler: 'health-check' });
            const updated = await service.updateTask(task.id, { name: 'New' });
            expect(updated?.name).toBe('New');
        });

        it('should return null for missing task', async () => {
            const result = await service.updateTask('no-id', { name: 'X' });
            expect(result).toBeNull();
        });
    });

    describe('deleteTask', () => {
        it('should delete existing task', async () => {
            const task = await service.createTask({ name: 'Del', cronExpression: '* * * * *', enabled: false, handler: 'health-check' });
            const deleted = await service.deleteTask(task.id);
            expect(deleted).toBe(true);
            expect(await service.getTask(task.id)).toBeNull();
        });

        it('should return false for missing task', async () => {
            expect(await service.deleteTask('nope')).toBe(false);
        });
    });

    describe('runTaskNow', () => {
        it('should return error for missing task', async () => {
            const result = await service.runTaskNow('no-id');
            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should execute task with registered handler', async () => {
            service.registerHandler('test-run', async () => ({ success: true, duration: 5 }));
            const task = await service.createTask({ name: 'Run', cronExpression: '* * * * *', enabled: false, handler: 'test-run' });
            const result = await service.runTaskNow(task.id);
            expect(result.success).toBe(true);
        });

        it('should return error for missing handler', async () => {
            const task = await service.createTask({ name: 'No Handler', cronExpression: '* * * * *', enabled: false, handler: 'ghost' });
            const result = await service.runTaskNow(task.id);
            expect(result.success).toBe(false);
            expect(result.error).toContain('Handler not found');
        });
    });

    describe('setTaskEnabled', () => {
        it('should toggle task enabled state', async () => {
            const task = await service.createTask({ name: 'Toggle', cronExpression: '* * * * *', enabled: false, handler: 'health-check' });
            const updated = await service.setTaskEnabled(task.id, true);
            expect(updated?.enabled).toBe(true);
        });
    });
});
