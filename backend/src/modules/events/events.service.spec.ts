import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { EventsService } from './events.service';
import { Event } from './entities';

describe('EventsService', () => {
    let service: EventsService;
    let eventRepo: {
        create: jest.Mock;
        save: jest.Mock;
        findOne: jest.Mock;
        remove: jest.Mock;
        count: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let mockQb: any;

    beforeEach(async () => {
        mockQb = {
            andWhere: jest.fn().mockReturnThis(),
            orderBy: jest.fn().mockReturnThis(),
            take: jest.fn().mockReturnThis(),
            skip: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            addSelect: jest.fn().mockReturnThis(),
            groupBy: jest.fn().mockReturnThis(),
            getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
            getRawMany: jest.fn().mockResolvedValue([]),
        };

        eventRepo = {
            create: jest.fn().mockImplementation((data) => ({ id: 'evt-1', ...data })),
            save: jest.fn().mockImplementation((data) => Promise.resolve({ id: 'evt-1', ...data })),
            findOne: jest.fn().mockResolvedValue(null),
            remove: jest.fn().mockResolvedValue(undefined),
            count: jest.fn().mockResolvedValue(0),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EventsService,
                { provide: getRepositoryToken(Event), useValue: eventRepo },
            ],
        }).compile();

        service = module.get<EventsService>(EventsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create an event with startedAt timestamp', async () => {
            const dto = { title: '颱風來襲', category: 'typhoon', severity: 4 } as any;
            const result = await service.create(dto);
            expect(eventRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ title: '颱風來襲', startedAt: expect.any(Date) }),
            );
            expect(eventRepo.save).toHaveBeenCalled();
        });
    });

    describe('findAll', () => {
        it('should return data and total', async () => {
            mockQb.getManyAndCount.mockResolvedValueOnce([[{ id: 'e1' }], 1]);
            const result = await service.findAll({} as any);
            expect(result.total).toBe(1);
            expect(result.data).toHaveLength(1);
        });

        it('should apply status filter', async () => {
            await service.findAll({ status: 'active' } as any);
            expect(mockQb.andWhere).toHaveBeenCalledWith('event.status = :status', { status: 'active' });
        });

        it('should apply category filter', async () => {
            await service.findAll({ category: 'earthquake' } as any);
            expect(mockQb.andWhere).toHaveBeenCalledWith('event.category = :category', { category: 'earthquake' });
        });

        it('should apply severity filter', async () => {
            await service.findAll({ severity: 5 } as any);
            expect(mockQb.andWhere).toHaveBeenCalledWith('event.severity = :severity', { severity: 5 });
        });
    });

    describe('findOne', () => {
        it('should throw NotFoundException when not found', async () => {
            await expect(service.findOne('no-id')).rejects.toThrow(NotFoundException);
        });

        it('should return event when found', async () => {
            eventRepo.findOne.mockResolvedValueOnce({ id: 'evt-1', title: 'Test' });
            const result = await service.findOne('evt-1');
            expect(result.title).toBe('Test');
        });
    });

    describe('update', () => {
        it('should update event fields', async () => {
            eventRepo.findOne.mockResolvedValueOnce({ id: 'evt-1', status: 'active' });
            const result = await service.update('evt-1', { severity: 5 } as any);
            expect(eventRepo.save).toHaveBeenCalled();
        });

        it('should set resolvedAt when status changes to resolved', async () => {
            const event = { id: 'evt-1', status: 'active', resolvedAt: undefined } as any;
            eventRepo.findOne.mockResolvedValueOnce(event);
            await service.update('evt-1', { status: 'resolved' } as any);
            expect(event.resolvedAt).toBeInstanceOf(Date);
        });
    });

    describe('remove', () => {
        it('should remove event', async () => {
            eventRepo.findOne.mockResolvedValueOnce({ id: 'evt-1' });
            await service.remove('evt-1');
            expect(eventRepo.remove).toHaveBeenCalled();
        });
    });

    describe('getStats', () => {
        it('should return stats with severity and category', async () => {
            eventRepo.count.mockResolvedValueOnce(5).mockResolvedValueOnce(3);
            mockQb.getRawMany
                .mockResolvedValueOnce([{ severity: 4, count: 5 }])
                .mockResolvedValueOnce([{ category: 'typhoon', count: 3 }]);

            const stats = await service.getStats();
            expect(stats.active).toBe(5);
            expect(stats.resolved).toBe(3);
            expect(stats.bySeverity).toHaveLength(1);
            expect(stats.byCategory).toHaveLength(1);
        });
    });
});
