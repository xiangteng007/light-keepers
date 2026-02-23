import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { MissionSessionsService } from './mission-sessions.service';
import { MissionSession, MissionStatus } from './entities/mission-session.entity';
import { MissionEvent } from './entities/event.entity';
import { Task } from './entities/task.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';

describe('MissionSessionsService', () => {
    let service: MissionSessionsService;
    let sessionRepo: any;
    let eventRepo: any;
    let taskRepo: any;

    const mockSession: Partial<MissionSession> = {
        id: 'session-1',
        title: '桃園水災應變',
        status: MissionStatus.PREPARING,
        startedAt: undefined,
        endedAt: undefined,
        events: [],
        tasks: [],
        createdAt: new Date('2026-01-01'),
    };

    const mockEvent: Partial<MissionEvent> = {
        id: 'event-1',
        sessionId: 'session-1',
        title: '一級警戒',
        createdAt: new Date(),
    };

    const mockTask: Partial<Task> = {
        id: 'task-1',
        sessionId: 'session-1',
        title: '疏散低窪區域',
        status: 'pending' as any,
        createdAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                MissionSessionsService,
                {
                    provide: getRepositoryToken(MissionSession),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'session-1', ...dto })),
                        save: jest.fn().mockImplementation((s) => Promise.resolve(s)),
                        find: jest.fn().mockResolvedValue([mockSession]),
                        findOne: jest.fn().mockResolvedValue(mockSession),
                        update: jest.fn().mockResolvedValue({ affected: 1 }),
                        softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
                    },
                },
                {
                    provide: getRepositoryToken(MissionEvent),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'event-1', ...dto })),
                        save: jest.fn().mockImplementation((e) => Promise.resolve(e)),
                        find: jest.fn().mockResolvedValue([mockEvent]),
                        count: jest.fn().mockResolvedValue(3),
                    },
                },
                {
                    provide: getRepositoryToken(Task),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'task-1', ...dto })),
                        save: jest.fn().mockImplementation((t) => Promise.resolve(t)),
                        find: jest.fn().mockResolvedValue([mockTask]),
                        findOne: jest.fn().mockResolvedValue(mockTask),
                        update: jest.fn().mockResolvedValue({ affected: 1 }),
                        softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
                        count: jest.fn().mockResolvedValue(5),
                    },
                },
                {
                    provide: getRepositoryToken(InventoryTransaction),
                    useValue: {},
                },
            ],
        }).compile();

        service = module.get<MissionSessionsService>(MissionSessionsService);
        sessionRepo = module.get(getRepositoryToken(MissionSession));
        eventRepo = module.get(getRepositoryToken(MissionEvent));
        taskRepo = module.get(getRepositoryToken(Task));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Session CRUD =====
    describe('createSession', () => {
        it('should create a mission session', async () => {
            const dto = { title: '桃園水災應變' };
            const result = await service.createSession(dto as any);
            expect(sessionRepo.create).toHaveBeenCalledWith(dto);
            expect(result).toBeDefined();
        });
    });

    describe('findAllSessions', () => {
        it('should return all sessions with relations', async () => {
            const result = await service.findAllSessions();
            expect(result).toEqual([mockSession]);
            expect(sessionRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({ relations: ['events', 'tasks'] }),
            );
        });
    });

    describe('findSessionById', () => {
        it('should return session by id', async () => {
            const result = await service.findSessionById('session-1');
            expect(result).toEqual(mockSession);
        });

        it('should throw NotFoundException', async () => {
            sessionRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findSessionById('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('updateSession', () => {
        it('should update and return session', async () => {
            const dto = { title: '更新名稱' };
            const result = await service.updateSession('session-1', dto as any);
            expect(sessionRepo.update).toHaveBeenCalledWith('session-1', dto);
            expect(result).toBeDefined();
        });
    });

    // ===== Lifecycle =====
    describe('startSession', () => {
        it('should set status to ACTIVE', async () => {
            const result = await service.startSession('session-1');
            expect(sessionRepo.update).toHaveBeenCalledWith('session-1', expect.objectContaining({
                status: MissionStatus.ACTIVE,
            }));
            expect(result).toBeDefined();
        });
    });

    describe('endSession', () => {
        it('should set status to COMPLETED', async () => {
            const result = await service.endSession('session-1');
            expect(sessionRepo.update).toHaveBeenCalledWith('session-1', expect.objectContaining({
                status: MissionStatus.COMPLETED,
            }));
            expect(result).toBeDefined();
        });
    });

    describe('deleteSession', () => {
        it('should soft-delete session', async () => {
            await service.deleteSession('session-1');
            expect(sessionRepo.softDelete).toHaveBeenCalledWith('session-1');
        });

        it('should throw NotFoundException if not found', async () => {
            sessionRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.deleteSession('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ===== Event CRUD =====
    describe('createEvent', () => {
        it('should create event', async () => {
            const dto = { sessionId: 'session-1', title: '一級警戒' };
            const result = await service.createEvent(dto as any);
            expect(eventRepo.create).toHaveBeenCalledWith(dto);
            expect(result).toBeDefined();
        });
    });

    describe('findEventsBySession', () => {
        it('should return events for session', async () => {
            const result = await service.findEventsBySession('session-1');
            expect(result).toEqual([mockEvent]);
        });
    });

    // ===== Task CRUD =====
    describe('createTask', () => {
        it('should create task', async () => {
            const dto = { sessionId: 'session-1', title: '疏散低窪區域' };
            const result = await service.createTask(dto as any);
            expect(taskRepo.create).toHaveBeenCalledWith(dto);
            expect(result).toBeDefined();
        });
    });

    describe('findTasksBySession', () => {
        it('should return tasks for session', async () => {
            const result = await service.findTasksBySession('session-1');
            expect(result).toEqual([mockTask]);
        });
    });

    describe('updateTask', () => {
        it('should update and return task', async () => {
            const dto = { status: 'completed' };
            const result = await service.updateTask('task-1', dto as any);
            expect(taskRepo.update).toHaveBeenCalledWith('task-1', dto);
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException if task not found', async () => {
            taskRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.updateTask('nonexistent', {} as any)).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteTask', () => {
        it('should soft-delete task', async () => {
            await service.deleteTask('task-1');
            expect(taskRepo.softDelete).toHaveBeenCalledWith('task-1');
        });

        it('should throw NotFoundException if task not found', async () => {
            taskRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.deleteTask('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ===== Stats =====
    describe('getSessionStats', () => {
        it('should return statistics for a session', async () => {
            const activeSession = { ...mockSession, startedAt: new Date('2026-01-01T10:00:00Z') };
            sessionRepo.findOne.mockResolvedValueOnce(activeSession);
            const result = await service.getSessionStats('session-1');
            expect(result.sessionId).toBe('session-1');
            expect(result.eventsCount).toBe(3);
            expect(result.tasksCount).toBe(5);
            expect(typeof result.duration).toBe('number');
        });
    });
});
