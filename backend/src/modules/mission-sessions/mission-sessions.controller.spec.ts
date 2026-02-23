import { Test, TestingModule } from '@nestjs/testing';
import { MissionSessionsController } from './mission-sessions.controller';
import { MissionSessionsService } from './mission-sessions.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('MissionSessionsController', () => {
    let controller: MissionSessionsController;

    beforeEach(async () => {
        const service = {
            createSession: jest.fn().mockResolvedValue({ id: 's1' }),
            findAllSessions: jest.fn().mockResolvedValue([]),
            findSessionById: jest.fn().mockResolvedValue({ id: 's1' }),
            updateSession: jest.fn().mockResolvedValue({ id: 's1' }),
            startSession: jest.fn().mockResolvedValue({ id: 's1' }),
            endSession: jest.fn().mockResolvedValue({ id: 's1' }),
            deleteSession: jest.fn().mockResolvedValue(true),
            createEvent: jest.fn().mockResolvedValue({ id: 'e1' }),
            findEventsBySession: jest.fn().mockResolvedValue([]),
            createTask: jest.fn().mockResolvedValue({ id: 't1' }),
            findTasksBySession: jest.fn().mockResolvedValue([]),
            updateTask: jest.fn().mockResolvedValue({ id: 't1' }),
            deleteTask: jest.fn().mockResolvedValue(true),
            getSessionStats: jest.fn().mockResolvedValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [MissionSessionsController],
            providers: [{ provide: MissionSessionsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<MissionSessionsController>(MissionSessionsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('createSession creates', async () => expect(await controller.createSession({} as any)).toBeDefined());
    it('findAllSessions returns list', async () => expect(await controller.findAllSessions()).toBeDefined());
    it('findSession returns session', async () => expect(await controller.findSession('s1')).toBeDefined());
    it('updateSession updates', async () => expect(await controller.updateSession('s1', {} as any)).toBeDefined());
    it('startSession starts', async () => expect(await controller.startSession('s1')).toBeDefined());
    it('endSession ends', async () => expect(await controller.endSession('s1')).toBeDefined());
    it('deleteSession deletes', async () => expect(await controller.deleteSession('s1')).toBeDefined());
    it('createEvent creates event', async () => expect(await controller.createEvent({} as any)).toBeDefined());
    it('findEvents returns events', async () => expect(await controller.findEvents('s1')).toBeDefined());
    it('createTask creates task', async () => expect(await controller.createTask({} as any)).toBeDefined());
    it('findTasks returns tasks', async () => expect(await controller.findTasks('s1')).toBeDefined());
    it('updateTask updates task', async () => expect(await controller.updateTask('t1', {} as any)).toBeDefined());
    it('deleteTask deletes task', async () => expect(await controller.deleteTask('t1')).toBeDefined());
    it('getStats returns stats', async () => expect(await controller.getStats('s1')).toBeDefined());
});
