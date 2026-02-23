import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { Task } from './entities';
import { Account } from '../accounts/entities';
import { LineBotService } from '../line-bot/line-bot.service';

describe('TasksService', () => {
    let service: TasksService;
    let taskRepo: any;
    let accountRepo: any;
    let lineBotService: any;

    const mockTask: Partial<Task> = {
        id: 'task-1',
        title: '搜救任務',
        description: '前往災區搜救',
        status: 'pending',
        priority: 3,
        createdAt: new Date('2026-01-01'),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                TasksService,
                {
                    provide: getRepositoryToken(Task),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockTask),
                        save: jest.fn().mockResolvedValue(mockTask),
                        findOne: jest.fn().mockResolvedValue(mockTask),
                        find: jest.fn().mockResolvedValue([mockTask]),
                        remove: jest.fn().mockResolvedValue(undefined),
                        count: jest.fn().mockResolvedValue(5),
                        createQueryBuilder: jest.fn().mockReturnValue({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            addOrderBy: jest.fn().mockReturnThis(),
                            take: jest.fn().mockReturnThis(),
                            skip: jest.fn().mockReturnThis(),
                            getManyAndCount: jest.fn().mockResolvedValue([[mockTask], 1]),
                            where: jest.fn().mockReturnThis(),
                            getCount: jest.fn().mockResolvedValue(2),
                        }),
                    },
                },
                {
                    provide: getRepositoryToken(Account),
                    useValue: {
                        findOne: jest.fn().mockResolvedValue({
                            id: 'acc-1',
                            lineUserId: 'line-123',
                            displayName: 'John',
                        }),
                    },
                },
                {
                    provide: LineBotService,
                    useValue: {
                        sendTaskAssignment: jest.fn().mockResolvedValue(undefined),
                    },
                },
            ],
        }).compile();

        service = module.get<TasksService>(TasksService);
        taskRepo = module.get(getRepositoryToken(Task));
        accountRepo = module.get(getRepositoryToken(Account));
        lineBotService = module.get(LineBotService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== create =====
    describe('create', () => {
        it('should create a task', async () => {
            const dto = { title: '搜救任務', description: '前往災區搜救', priority: 3 };
            const result = await service.create(dto as any);
            expect(taskRepo.create).toHaveBeenCalled();
            expect(taskRepo.save).toHaveBeenCalled();
            expect(result).toEqual(mockTask);
        });

        it('should send LINE notification when assignedTo is set', async () => {
            const dto = { title: '搜救任務', assignedTo: 'acc-1' };
            await service.create(dto as any);
            expect(accountRepo.findOne).toHaveBeenCalledWith({ where: { id: 'acc-1' } });
            expect(lineBotService.sendTaskAssignment).toHaveBeenCalled();
        });

        it('should not fail if LINE notification fails', async () => {
            lineBotService.sendTaskAssignment.mockRejectedValueOnce(new Error('LINE error'));
            const dto = { title: '搜救任務', assignedTo: 'acc-1' };
            await expect(service.create(dto as any)).resolves.toBeDefined();
        });

        it('should handle dueAt conversion', async () => {
            const dto = { title: '搜救任務', dueAt: '2026-02-01T00:00:00Z' };
            await service.create(dto as any);
            expect(taskRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                dueAt: expect.any(Date),
            }));
        });
    });

    // ===== findAll =====
    describe('findAll', () => {
        it('should return tasks with pagination', async () => {
            const result = await service.findAll({ limit: 20, offset: 0 });
            expect(result).toEqual({ data: [mockTask], total: 1 });
        });

        it('should filter by status', async () => {
            const qb = taskRepo.createQueryBuilder();
            await service.findAll({ status: 'pending' } as any);
            expect(qb.andWhere).toHaveBeenCalled();
        });

        it('should filter by eventId', async () => {
            const qb = taskRepo.createQueryBuilder();
            await service.findAll({ eventId: 'evt-1' } as any);
            expect(qb.andWhere).toHaveBeenCalled();
        });
    });

    // ===== findOne =====
    describe('findOne', () => {
        it('should return a task', async () => {
            const result = await service.findOne('task-1');
            expect(result).toEqual(mockTask);
        });

        it('should throw NotFoundException if task not found', async () => {
            taskRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ===== update =====
    describe('update', () => {
        it('should update a task', async () => {
            const result = await service.update('task-1', { title: '更新任務' } as any);
            expect(taskRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should set completedAt when status changes to completed', async () => {
            taskRepo.findOne.mockResolvedValueOnce({ ...mockTask, status: 'pending' });
            await service.update('task-1', { status: 'completed' } as any);
            expect(taskRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ completedAt: expect.any(Date) }),
            );
        });
    });

    // ===== remove =====
    describe('remove', () => {
        it('should remove a task', async () => {
            await service.remove('task-1');
            expect(taskRepo.remove).toHaveBeenCalledWith(mockTask);
        });

        it('should throw if task not found', async () => {
            taskRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.remove('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ===== getKanbanBoard =====
    describe('getKanbanBoard', () => {
        it('should return board with pending/inProgress/completed', async () => {
            const result = await service.getKanbanBoard();
            expect(result).toHaveProperty('pending');
            expect(result).toHaveProperty('inProgress');
            expect(result).toHaveProperty('completed');
        });

        it('should return empty arrays on error', async () => {
            taskRepo.find.mockRejectedValueOnce(new Error('DB error'));
            const result = await service.getKanbanBoard();
            expect(result).toEqual({ pending: [], inProgress: [], completed: [] });
        });
    });

    // ===== getStats =====
    describe('getStats', () => {
        it('should return task statistics', async () => {
            const result = await service.getStats();
            expect(result).toHaveProperty('pending');
            expect(result).toHaveProperty('inProgress');
            expect(result).toHaveProperty('completed');
            expect(result).toHaveProperty('overdue');
        });
    });
});
