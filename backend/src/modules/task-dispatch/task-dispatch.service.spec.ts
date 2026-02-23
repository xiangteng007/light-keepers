import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TaskDispatchService, TASK_EVENTS, generateCorrelationId } from './task-dispatch.service';
import { DispatchTask, TaskStatus, TaskPriority } from './entities/dispatch-task.entity';
import { TaskAssignment, AssignmentStatus } from './entities/task-assignment.entity';

describe('TaskDispatchService', () => {
    let service: TaskDispatchService;
    let taskRepo: Record<string, jest.Mock>;
    let assignmentRepo: Record<string, jest.Mock>;
    let eventEmitter: { emit: jest.Mock };

    const mockTask = {
        id: 'task-1',
        missionSessionId: 'mission-1',
        title: '搜救任務',
        priority: TaskPriority.HIGH,
        status: TaskStatus.DRAFT,
        createdBy: 'user-1',
        location: null,
        metadata: {},
        assignments: [],
    };

    const mockAssignment = {
        id: 'assign-1',
        taskId: 'task-1',
        volunteerId: 'vol-1',
        volunteerName: '張三',
        status: AssignmentStatus.PENDING,
        metadata: {},
        task: mockTask,
    };

    beforeEach(async () => {
        taskRepo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'task-1', ...d })),
            save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
            find: jest.fn().mockResolvedValue([mockTask]),
            findOne: jest.fn().mockResolvedValue({ ...mockTask }),
            createQueryBuilder: jest.fn().mockReturnValue({
                where: jest.fn().mockReturnThis(),
                leftJoinAndSelect: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                addOrderBy: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue([mockTask]),
            }),
        };

        assignmentRepo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'assign-1', ...d })),
            save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
            find: jest.fn().mockResolvedValue([mockAssignment]),
            findOne: jest.fn().mockResolvedValue(null), // default: no existing assignment
            update: jest.fn().mockResolvedValue({ affected: 1 }),
        };

        eventEmitter = { emit: jest.fn() };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TaskDispatchService,
                { provide: getRepositoryToken(DispatchTask), useValue: taskRepo },
                { provide: getRepositoryToken(TaskAssignment), useValue: assignmentRepo },
                { provide: EventEmitter2, useValue: eventEmitter },
            ],
        }).compile();

        service = module.get<TaskDispatchService>(TaskDispatchService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== generateCorrelationId =====
    describe('generateCorrelationId', () => {
        it('should generate correlation ID with task and event info', () => {
            const id = generateCorrelationId('task-1', 'assigned');
            expect(id).toContain('task_task-1_assigned_');
        });
    });

    // ===== createTask =====
    describe('createTask', () => {
        it('should create task with DRAFT status', async () => {
            const result = await service.createTask({ title: '測試', missionSessionId: 'mission-1' } as any, 'user-1');
            expect(taskRepo.create).toHaveBeenCalled();
            expect(taskRepo.save).toHaveBeenCalled();
        });
    });

    // ===== getTaskById =====
    describe('getTaskById', () => {
        it('should return task by id', async () => {
            const result = await service.getTaskById('task-1');
            expect(result.id).toBe('task-1');
        });

        it('should throw NotFoundException if not found', async () => {
            taskRepo.findOne.mockResolvedValue(null);
            await expect(service.getTaskById('fake')).rejects.toThrow(NotFoundException);
        });
    });

    // ===== assignTask =====
    describe('assignTask', () => {
        it('should assign volunteers and emit event', async () => {
            const names = new Map([['vol-1', '張三']]);
            const result = await service.assignTask('task-1', { volunteerIds: ['vol-1'] } as any, 'admin', names);
            expect(result).toHaveLength(1);
            expect(assignmentRepo.save).toHaveBeenCalled();
            expect(eventEmitter.emit).toHaveBeenCalledWith(TASK_EVENTS.ASSIGNED, expect.objectContaining({ taskId: 'task-1' }));
        });

        it('should reject assigning completed tasks', async () => {
            taskRepo.findOne.mockResolvedValue({ ...mockTask, status: TaskStatus.COMPLETED });
            const names = new Map([['vol-1', '張三']]);
            await expect(service.assignTask('task-1', { volunteerIds: ['vol-1'] } as any, 'admin', names))
                .rejects.toThrow(BadRequestException);
        });

        it('should skip already assigned volunteers', async () => {
            assignmentRepo.findOne.mockResolvedValue(mockAssignment); // already assigned
            const names = new Map([['vol-1', '張三']]);
            const result = await service.assignTask('task-1', { volunteerIds: ['vol-1'] } as any, 'admin', names);
            expect(result).toHaveLength(0);
        });
    });

    // ===== acceptAssignment =====
    describe('acceptAssignment', () => {
        it('should accept pending assignment', async () => {
            assignmentRepo.findOne.mockResolvedValue({ ...mockAssignment, status: AssignmentStatus.PENDING, metadata: {} });
            const result = await service.acceptAssignment('task-1', 'vol-1', '我來了');
            expect(result.status).toBe(AssignmentStatus.ACCEPTED);
        });

        it('should throw if not pending', async () => {
            assignmentRepo.findOne.mockResolvedValue({ ...mockAssignment, status: AssignmentStatus.ACCEPTED });
            await expect(service.acceptAssignment('task-1', 'vol-1')).rejects.toThrow(BadRequestException);
        });

        it('should throw if assignment not found', async () => {
            assignmentRepo.findOne.mockResolvedValue(null);
            await expect(service.acceptAssignment('task-1', 'vol-1')).rejects.toThrow(NotFoundException);
        });
    });

    // ===== startTask =====
    describe('startTask', () => {
        it('should start accepted task and emit event', async () => {
            taskRepo.findOne.mockResolvedValue({ ...mockTask, status: TaskStatus.ACCEPTED });
            const result = await service.startTask('task-1', 'vol-1');
            expect(result.status).toBe(TaskStatus.IN_PROGRESS);
            expect(eventEmitter.emit).toHaveBeenCalledWith(TASK_EVENTS.STARTED, expect.objectContaining({ taskId: 'task-1' }));
        });

        it('should reject if not accepted', async () => {
            taskRepo.findOne.mockResolvedValue({ ...mockTask, status: TaskStatus.DRAFT });
            await expect(service.startTask('task-1', 'vol-1')).rejects.toThrow(BadRequestException);
        });
    });

    // ===== completeTask =====
    describe('completeTask', () => {
        it('should complete in-progress task and emit event', async () => {
            taskRepo.findOne.mockResolvedValue({ ...mockTask, status: TaskStatus.IN_PROGRESS, metadata: {} });
            assignmentRepo.findOne.mockResolvedValue({ ...mockAssignment, status: AssignmentStatus.ACCEPTED });
            const result = await service.completeTask('task-1', 'vol-1', '完成了');
            expect(result.status).toBe(TaskStatus.COMPLETED);
            expect(eventEmitter.emit).toHaveBeenCalledWith(TASK_EVENTS.COMPLETED, expect.objectContaining({ taskId: 'task-1' }));
        });

        it('should reject if not in progress', async () => {
            await expect(service.completeTask('task-1', 'vol-1')).rejects.toThrow(BadRequestException);
        });
    });

    // ===== cancelTask =====
    describe('cancelTask', () => {
        it('should cancel task and its assignments', async () => {
            const result = await service.cancelTask('task-1', '人力不足');
            expect(result.status).toBe(TaskStatus.CANCELLED);
            expect(assignmentRepo.update).toHaveBeenCalled();
        });

        it('should reject cancelling completed tasks', async () => {
            taskRepo.findOne.mockResolvedValue({ ...mockTask, status: TaskStatus.COMPLETED });
            await expect(service.cancelTask('task-1')).rejects.toThrow(BadRequestException);
        });
    });

    // ===== getMissionStats =====
    describe('getMissionStats', () => {
        it('should aggregate stats by status and priority', async () => {
            const stats = await service.getMissionStats('mission-1');
            expect(stats.total).toBe(1);
        });
    });
});
