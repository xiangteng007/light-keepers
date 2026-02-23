import { Test, TestingModule } from '@nestjs/testing';
import { AssignmentsController } from './assignments.controller';
import { AssignmentsService } from './assignments.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AssignmentsController', () => {
    let controller: AssignmentsController;

    beforeEach(async () => {
        const service = {
            create: jest.fn().mockResolvedValue({ id: 'a1' }),
            findByVolunteer: jest.fn().mockResolvedValue([]),
            findPending: jest.fn().mockResolvedValue([]),
            findActive: jest.fn().mockResolvedValue([]),
            getStats: jest.fn().mockResolvedValue({}),
            findOne: jest.fn().mockResolvedValue({ id: 'a1' }),
            accept: jest.fn().mockResolvedValue({ id: 'a1' }),
            decline: jest.fn().mockResolvedValue({ id: 'a1' }),
            checkIn: jest.fn().mockResolvedValue({ id: 'a1' }),
            checkOut: jest.fn().mockResolvedValue({ id: 'a1', minutesLogged: 120 }),
            cancel: jest.fn().mockResolvedValue({ id: 'a1' }),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [AssignmentsController],
            providers: [{ provide: AssignmentsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<AssignmentsController>(AssignmentsController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('create', async () => expect((await controller.create({} as any)).success).toBe(true));
    it('findByVolunteer', async () => expect((await controller.findByVolunteer('v1')).success).toBe(true));
    it('findPending', async () => expect((await controller.findPending()).success).toBe(true));
    it('findActive', async () => expect((await controller.findActive()).success).toBe(true));
    it('getStats', async () => expect((await controller.getStats()).success).toBe(true));
    it('findOne', async () => expect((await controller.findOne('a1')).success).toBe(true));
    it('accept', async () => expect((await controller.accept('a1')).success).toBe(true));
    it('decline', async () => expect((await controller.decline('a1', 'busy')).success).toBe(true));
    it('checkIn', async () => expect((await controller.checkIn('a1', {} as any)).success).toBe(true));
    it('checkOut', async () => expect((await controller.checkOut('a1', {} as any)).success).toBe(true));
    it('cancel', async () => expect((await controller.cancel('a1')).success).toBe(true));
});
