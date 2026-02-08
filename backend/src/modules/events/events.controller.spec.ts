import { EventsController } from './events.controller';
import { EventsService } from './events.service';
import { createTestModule } from '../../test/helpers/create-test-module';

describe('EventsController', () => {
    let controller: EventsController;
    let service: EventsService;

    const mockService = {
        create: jest.fn(),
        findAll: jest.fn(),
        getStats: jest.fn(),
        findOne: jest.fn(),
        update: jest.fn(),
        remove: jest.fn(),
    };

    beforeEach(async () => {
        const module = await createTestModule({
            controllers: [EventsController],
            providers: [{ provide: EventsService, useValue: mockService }],
        }).compile();

        controller = module.get<EventsController>(EventsController);
        service = module.get<EventsService>(EventsService);
    });

    afterEach(() => jest.clearAllMocks());

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('create', () => {
        it('should create an event', async () => {
            const dto = { title: '地震', type: 'earthquake', severity: 3 };
            const expected = { id: 'e1', ...dto };
            mockService.create.mockResolvedValue(expected);

            const result = await controller.create(dto as any);

            expect(service.create).toHaveBeenCalledWith(dto);
            expect(result).toEqual(expected);
        });
    });

    describe('findAll', () => {
        it('should return events list', async () => {
            const query = { page: 1, limit: 10 };
            const expected = { items: [], total: 0 };
            mockService.findAll.mockResolvedValue(expected);

            const result = await controller.findAll(query as any);

            expect(service.findAll).toHaveBeenCalledWith(query);
            expect(result).toEqual(expected);
        });
    });

    describe('getStats', () => {
        it('should return event statistics', async () => {
            const expected = { totalEvents: 5, byType: { earthquake: 2 } };
            mockService.getStats.mockResolvedValue(expected);

            const result = await controller.getStats();

            expect(service.getStats).toHaveBeenCalled();
            expect(result).toEqual(expected);
        });
    });

    describe('findOne', () => {
        it('should return event by ID', async () => {
            const expected = { id: 'e1', title: '地震' };
            mockService.findOne.mockResolvedValue(expected);

            const result = await controller.findOne('e1');

            expect(service.findOne).toHaveBeenCalledWith('e1');
            expect(result).toEqual(expected);
        });
    });

    describe('update', () => {
        it('should update an event', async () => {
            const dto = { title: '更新後' };
            const expected = { id: 'e1', title: '更新後' };
            mockService.update.mockResolvedValue(expected);

            const result = await controller.update('e1', dto as any);

            expect(service.update).toHaveBeenCalledWith('e1', dto);
            expect(result).toEqual(expected);
        });
    });

    describe('remove', () => {
        it('should delete an event', async () => {
            mockService.remove.mockResolvedValue({ deleted: true });

            const result = await controller.remove('e1');

            expect(service.remove).toHaveBeenCalledWith('e1');
            expect(result).toEqual({ deleted: true });
        });
    });
});
