import { Test, TestingModule } from '@nestjs/testing';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TasksController', () => {
    let controller: TasksController;

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue({ id: 't1' }),
            findAll: jest.fn().mockResolvedValue({ data: [], total: 0 }),
            getKanbanBoard: jest.fn().mockResolvedValue({}),
            getStats: jest.fn().mockResolvedValue({}),
            findOne: jest.fn().mockResolvedValue({ id: 't1' }),
            update: jest.fn().mockResolvedValue({ id: 't1' }),
            remove: jest.fn().mockResolvedValue(undefined),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TasksController],
            providers: [{ provide: TasksService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<TasksController>(TasksController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('create', async () => expect((await controller.create({} as any)).success).toBe(true));
    it('findAll', async () => expect((await controller.findAll({} as any)).success).toBe(true));
    it('getKanbanBoard', async () => expect((await controller.getKanbanBoard()).success).toBe(true));
    it('getStats', async () => expect((await controller.getStats()).success).toBe(true));
    it('findOne', async () => expect((await controller.findOne('t1')).success).toBe(true));
    it('update', async () => expect((await controller.update('t1', {} as any)).success).toBe(true));
    it('remove', async () => expect((await controller.remove('t1')).success).toBe(true));
});
