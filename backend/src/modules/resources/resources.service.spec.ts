import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { Resource } from './resources.entity';
import { ResourceTransaction } from './resource-transaction.entity';
import { DonationSource } from './donation-source.entity';
import { ResourceBatch } from './resource-batch.entity';

describe('ResourcesService', () => {
    let service: ResourcesService;
    let resourceRepo: any;
    let transactionRepo: any;
    let donationSourceRepo: any;
    let batchRepo: any;

    const mockResource: Partial<Resource> = {
        id: 'res-1',
        name: '飲用水',
        category: 'water',
        quantity: 100,
        unit: '箱',
        minQuantity: 20,
        status: 'available',
        location: '倉庫 A',
    };

    const mockTransaction: Partial<ResourceTransaction> = {
        id: 'txn-1',
        type: 'in',
        quantity: 50,
        operatorName: '管理員',
    };

    const mockDonationSource: Partial<DonationSource> = {
        id: 'donor-1',
        name: '慈濟基金會',
        type: 'organization',
    };

    const mockBatch: Partial<ResourceBatch> = {
        id: 'batch-1',
        batchNo: 'B-001',
        quantity: 50,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ResourcesService,
                {
                    provide: getRepositoryToken(Resource),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockResource),
                        save: jest.fn().mockResolvedValue(mockResource),
                        find: jest.fn().mockResolvedValue([mockResource]),
                        findOne: jest.fn().mockResolvedValue(mockResource),
                        update: jest.fn().mockResolvedValue({ affected: 1 }),
                        delete: jest.fn().mockResolvedValue({ affected: 1 }),
                        createQueryBuilder: jest.fn().mockReturnValue({
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([mockResource]),
                        }),
                    },
                },
                {
                    provide: getRepositoryToken(ResourceTransaction),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockTransaction),
                        save: jest.fn().mockResolvedValue(mockTransaction),
                        find: jest.fn().mockResolvedValue([mockTransaction]),
                        findOne: jest.fn().mockResolvedValue(mockTransaction),
                        delete: jest.fn().mockResolvedValue({ affected: 1 }),
                    },
                },
                {
                    provide: getRepositoryToken(DonationSource),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockDonationSource),
                        save: jest.fn().mockResolvedValue(mockDonationSource),
                        find: jest.fn().mockResolvedValue([mockDonationSource]),
                        findOne: jest.fn().mockResolvedValue(mockDonationSource),
                    },
                },
                {
                    provide: getRepositoryToken(ResourceBatch),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockBatch),
                        save: jest.fn().mockResolvedValue(mockBatch),
                        find: jest.fn().mockResolvedValue([mockBatch]),
                    },
                },
            ],
        }).compile();

        service = module.get<ResourcesService>(ResourcesService);
        resourceRepo = module.get(getRepositoryToken(Resource));
        transactionRepo = module.get(getRepositoryToken(ResourceTransaction));
        donationSourceRepo = module.get(getRepositoryToken(DonationSource));
        batchRepo = module.get(getRepositoryToken(ResourceBatch));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== CRUD =====
    describe('create', () => {
        it('should create a resource', async () => {
            const dto = { name: '飲用水', category: 'water', quantity: 100 };
            const result = await service.create(dto as any);
            expect(resourceRepo.create).toHaveBeenCalled();
            expect(resourceRepo.save).toHaveBeenCalled();
            expect(result).toEqual(mockResource);
        });
    });

    describe('findAll', () => {
        it('should return all resources', async () => {
            const result = await service.findAll();
            expect(result).toEqual([mockResource]);
        });

        it('should filter by category', async () => {
            await service.findAll('water' as any);
            expect(resourceRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ category: 'water' }),
                }),
            );
        });
    });

    describe('findOne', () => {
        it('should return a resource by id', async () => {
            const result = await service.findOne('res-1');
            expect(result).toEqual(mockResource);
        });

        it('should throw NotFoundException if resource not found', async () => {
            resourceRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    describe('update', () => {
        it('should update a resource', async () => {
            const result = await service.update('res-1', { name: '純水' });
            expect(resourceRepo.update).toHaveBeenCalledWith('res-1', { name: '純水' });
            expect(result).toBeDefined();
        });
    });

    describe('delete', () => {
        it('should delete a resource', async () => {
            await service.delete('res-1');
            expect(resourceRepo.delete).toHaveBeenCalledWith('res-1');
        });
    });

    // ===== Stock Management =====
    describe('addStock', () => {
        it('should add stock to a resource', async () => {
            const result = await service.addStock('res-1', 50, '管理員', '補貨');
            expect(result).toBeDefined();
        });
    });

    describe('deductStock', () => {
        it('should deduct stock from a resource', async () => {
            const result = await service.deductStock('res-1', 10, '管理員', '出貨');
            expect(result).toBeDefined();
        });
    });

    // ===== Transactions =====
    describe('getTransactions', () => {
        it('should return all transactions', async () => {
            const result = await service.getTransactions();
            expect(result).toEqual([mockTransaction]);
        });

        it('should filter by resourceId', async () => {
            await service.getTransactions('res-1');
            expect(transactionRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: expect.objectContaining({ resourceId: 'res-1' }),
                }),
            );
        });
    });

    describe('deleteTransaction', () => {
        it('should delete a transaction', async () => {
            await service.deleteTransaction('txn-1');
            expect(transactionRepo.findOne).toHaveBeenCalled();
        });
    });

    // ===== Donations =====
    describe('createDonationSource', () => {
        it('should create a donation source', async () => {
            const dto = { name: '慈濟基金會', type: 'organization' };
            const result = await service.createDonationSource(dto as any);
            expect(result).toEqual(mockDonationSource);
        });
    });

    describe('getAllDonationSources', () => {
        it('should return all donation sources', async () => {
            const result = await service.getAllDonationSources();
            expect(result).toEqual([mockDonationSource]);
        });
    });

    // ===== Batches =====
    describe('getBatches', () => {
        it('should return batches for a resource', async () => {
            const result = await service.getBatches('res-1');
            expect(result).toEqual([mockBatch]);
        });
    });

    // ===== A4: Task/Event Cross-Reference =====
    describe('findByTask', () => {
        it('should return transactions for a given taskId', async () => {
            const taskTxn = { ...mockTransaction, taskId: 'task-1' };
            transactionRepo.find.mockResolvedValueOnce([taskTxn]);
            const result = await service.findByTask('task-1');
            expect(result).toEqual([taskTxn]);
            expect(transactionRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { taskId: 'task-1' },
                }),
            );
        });

        it('should return empty array if no transactions for task', async () => {
            transactionRepo.find.mockResolvedValueOnce([]);
            const result = await service.findByTask('no-task');
            expect(result).toEqual([]);
        });
    });

    describe('getUsageByEvent', () => {
        it('should return aggregated usage for an eventId', async () => {
            const txns = [
                { ...mockTransaction, eventId: 'event-1', type: 'in', quantity: 100, resource: { ...mockResource, category: 'water' } },
                { ...mockTransaction, id: 'txn-2', eventId: 'event-1', type: 'out', quantity: 30, resource: { ...mockResource, category: 'water' } },
            ];
            transactionRepo.find.mockResolvedValueOnce(txns);
            const result = await service.getUsageByEvent('event-1');
            expect(result.totalIn).toBe(100);
            expect(result.totalOut).toBe(30);
            expect(result.netChange).toBe(70);
            expect(result.transactions).toEqual(txns);
            expect(result.byCategory).toBeDefined();
            expect(result.byCategory['water']).toBeDefined();
        });

        it('should return zeros when no transactions exist', async () => {
            transactionRepo.find.mockResolvedValueOnce([]);
            const result = await service.getUsageByEvent('no-event');
            expect(result.totalIn).toBe(0);
            expect(result.totalOut).toBe(0);
            expect(result.netChange).toBe(0);
            expect(result.transactions).toEqual([]);
        });
    });
});
