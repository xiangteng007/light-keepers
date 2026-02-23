import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EquipmentService } from './equipment.service';
import { Equipment, EquipmentStatus } from './entities/equipment.entity';
import { EquipmentLog } from './entities/equipment-log.entity';

describe('EquipmentService', () => {
    let service: EquipmentService;
    let equipRepo: {
        create: jest.Mock;
        save: jest.Mock;
        find: jest.Mock;
        findOne: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let logRepo: {
        create: jest.Mock;
        save: jest.Mock;
        find: jest.Mock;
    };
    let mockQb: any;

    const makeEquipment = (overrides: Partial<Equipment> = {}): any => ({
        id: 'eq-1',
        name: '無線電',
        status: EquipmentStatus.AVAILABLE,
        batteryLevel: 80,
        maintenanceIntervalDays: 90,
        ...overrides,
    });

    beforeEach(async () => {
        mockQb = {
            where: jest.fn().mockReturnThis(),
            andWhere: jest.fn().mockReturnThis(),
            getMany: jest.fn().mockResolvedValue([]),
        };

        equipRepo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'eq-new', ...d })),
            save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([]),
            findOne: jest.fn().mockResolvedValue(null),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        };
        logRepo = {
            create: jest.fn().mockImplementation((d) => ({ id: 'log-1', ...d })),
            save: jest.fn().mockImplementation((d) => Promise.resolve(d)),
            find: jest.fn().mockResolvedValue([]),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                EquipmentService,
                { provide: getRepositoryToken(Equipment), useValue: equipRepo },
                { provide: getRepositoryToken(EquipmentLog), useValue: logRepo },
            ],
        }).compile();

        service = module.get<EquipmentService>(EquipmentService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create equipment', async () => {
            await service.create({ name: '平板' });
            expect(equipRepo.create).toHaveBeenCalledWith({ name: '平板' });
            expect(equipRepo.save).toHaveBeenCalled();
        });
    });

    describe('findById', () => {
        it('should throw NotFoundException', async () => {
            await expect(service.findById('no')).rejects.toThrow(NotFoundException);
        });

        it('should return equipment with logs', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment());
            const result = await service.findById('eq-1');
            expect(result.name).toBe('無線電');
        });
    });

    describe('findByQrCode', () => {
        it('should throw NotFoundException', async () => {
            await expect(service.findByQrCode('INVALIDQR')).rejects.toThrow(NotFoundException);
        });
    });

    describe('checkout', () => {
        it('should throw if equipment not available', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment({ status: EquipmentStatus.IN_USE }));
            await expect(service.checkout('eq-1', 'u1', 'User'))
                .rejects.toThrow(BadRequestException);
        });

        it('should check out equipment', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment());
            const result = await service.checkout('eq-1', 'u1', 'User');
            expect(result.status).toBe(EquipmentStatus.IN_USE);
            expect(result.currentHolderId).toBe('u1');
            expect(logRepo.save).toHaveBeenCalled();
        });
    });

    describe('returnEquipment', () => {
        it('should throw if equipment not in use', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment());
            await expect(service.returnEquipment('eq-1', 'u1', 'User'))
                .rejects.toThrow(BadRequestException);
        });

        it('should return equipment and clear holder', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment({
                status: EquipmentStatus.IN_USE,
                currentHolderId: 'u1',
                currentHolderName: 'User',
            }));
            const result = await service.returnEquipment('eq-1', 'u1', 'User', 75);
            expect(result.status).toBe(EquipmentStatus.AVAILABLE);
            expect(result.currentHolderId).toBeUndefined();
            expect(result.batteryLevel).toBe(75);
        });
    });

    describe('startMaintenance', () => {
        it('should set status to MAINTENANCE', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment());
            const result = await service.startMaintenance('eq-1', '定期檢查');
            expect(result.status).toBe(EquipmentStatus.MAINTENANCE);
        });
    });

    describe('endMaintenance', () => {
        it('should set status to AVAILABLE and update dates', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment({
                status: EquipmentStatus.MAINTENANCE,
                maintenanceIntervalDays: 30,
            }));
            const result = await service.endMaintenance('eq-1', '完成');
            expect(result.status).toBe(EquipmentStatus.AVAILABLE);
            expect(result.lastMaintenanceDate).toBeInstanceOf(Date);
            expect(result.nextMaintenanceDate).toBeInstanceOf(Date);
        });
    });

    describe('updateBattery', () => {
        it('should update battery and set CHARGING when isCharging', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment());
            const result = await service.updateBattery('eq-1', 50, true);
            expect(result.status).toBe(EquipmentStatus.CHARGING);
            expect(result.batteryLevel).toBe(50);
            expect(result.lastCharged).toBeInstanceOf(Date);
        });

        it('should set AVAILABLE when battery >= 95 and was charging', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment({ status: EquipmentStatus.CHARGING }));
            const result = await service.updateBattery('eq-1', 100);
            expect(result.status).toBe(EquipmentStatus.AVAILABLE);
        });
    });

    describe('getStats', () => {
        it('should return aggregated stats', async () => {
            equipRepo.find.mockResolvedValueOnce([
                makeEquipment({ status: EquipmentStatus.AVAILABLE }),
                makeEquipment({ status: EquipmentStatus.IN_USE, batteryLevel: 10, id: 'eq-2' }),
                makeEquipment({
                    status: EquipmentStatus.MAINTENANCE,
                    nextMaintenanceDate: new Date('2020-01-01'),
                    id: 'eq-3',
                }),
            ]);
            const stats = await service.getStats();
            expect(stats.total).toBe(3);
            expect(stats.available).toBe(1);
            expect(stats.inUse).toBe(1);
            expect(stats.maintenance).toBe(1);
            expect(stats.lowBattery).toBe(1);
            expect(stats.maintenanceDue).toBe(1);
        });
    });

    // ===== A2: Task/Event Cross-Reference =====
    describe('findByTask', () => {
        it('should return equipment assigned to a task', async () => {
            const assigned = makeEquipment({ assignedTaskId: 'task-1' });
            equipRepo.find.mockResolvedValueOnce([assigned]);
            const result = await service.findByTask('task-1');
            expect(result).toEqual([assigned]);
            expect(equipRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { assignedTaskId: 'task-1' },
                }),
            );
        });
    });

    describe('findByEvent', () => {
        it('should return equipment assigned to an event', async () => {
            const assigned = makeEquipment({ assignedEventId: 'event-1' });
            equipRepo.find.mockResolvedValueOnce([assigned]);
            const result = await service.findByEvent('event-1');
            expect(result).toEqual([assigned]);
            expect(equipRepo.find).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { assignedEventId: 'event-1' },
                }),
            );
        });
    });

    describe('assignToTask', () => {
        it('should assign equipment to a task', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment());
            const result = await service.assignToTask('eq-1', 'task-1', 'event-1', 'actor-1', 'Actor');
            expect(result.assignedTaskId).toBe('task-1');
            expect(result.assignedEventId).toBe('event-1');
            expect(logRepo.save).toHaveBeenCalled();
        });
    });

    describe('unassignFromTask', () => {
        it('should clear task and event assignment', async () => {
            equipRepo.findOne.mockResolvedValueOnce(makeEquipment({
                assignedTaskId: 'task-1',
                assignedEventId: 'event-1',
            }));
            const result = await service.unassignFromTask('eq-1');
            expect(result.assignedTaskId).toBeUndefined();
            expect(result.assignedEventId).toBeUndefined();
            expect(logRepo.save).toHaveBeenCalled();
        });
    });
});
