import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DispatchService } from './dispatch.service';
import { DispatchOrder } from './dispatch-order.entity';
import { Resource } from './resources.entity';
import { ResourcesService } from './resources.service';

describe('DispatchService', () => {
    let service: DispatchService;
    const mockOrder = {
        id: 'o1', orderNo: 'DSP-001', status: 'pending', items: '[]',
        destination: 'HQ', requesterName: 'John',
    };

    beforeEach(async () => {
        const repo = {
            create: jest.fn().mockReturnValue(mockOrder),
            save: jest.fn().mockImplementation(o => Promise.resolve({ ...mockOrder, ...o })),
            find: jest.fn().mockResolvedValue([mockOrder]),
            findOne: jest.fn().mockResolvedValue(mockOrder),
        };
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DispatchService,
                { provide: getRepositoryToken(DispatchOrder), useValue: repo },
                { provide: getRepositoryToken(Resource), useValue: {} },
                { provide: ResourcesService, useValue: { deductStock: jest.fn().mockResolvedValue(true) } },
            ],
        }).compile();
        service = module.get(DispatchService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('create returns dispatch order', async () => {
        const order = await service.create({
            destination: 'HQ', items: [], requesterName: 'John',
        });
        expect(order.orderNo).toBeDefined();
    });

    it('findAll returns orders', async () => {
        const orders = await service.findAll();
        expect(orders.length).toBe(1);
    });

    it('findById returns order', async () => {
        const order = await service.findById('o1');
        expect(order.id).toBe('o1');
    });

    it('parseItems handles invalid JSON', () => {
        expect(service.parseItems({ items: 'invalid' } as any)).toEqual([]);
    });

    it('parseItems handles empty', () => {
        expect(service.parseItems({ items: '' } as any)).toEqual([]);
    });

    it('getStats returns counts', async () => {
        const stats = await service.getStats();
        expect(stats).toHaveProperty('pending');
        expect(stats).toHaveProperty('inProgress');
        expect(stats).toHaveProperty('completed');
    });
});
