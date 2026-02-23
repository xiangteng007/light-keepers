import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { VolunteersService } from './volunteers.service';
import { Volunteer } from './volunteers.entity';
import { AccountsService } from '../accounts/accounts.service';

describe('VolunteersService', () => {
    let service: VolunteersService;
    let volunteerRepo: any;
    let accountsService: any;

    const mockVolunteer: Partial<Volunteer> = {
        id: 'vol-1',
        name: '王大明',
        email: 'wang@example.com',
        phone: '0912345678',
        region: '台北市',
        skills: ['急救', '搜救'],
        status: 'available' as any,
        serviceHours: 120,
        taskCount: 15,
        approvalStatus: 'approved' as any,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VolunteersService,
                {
                    provide: getRepositoryToken(Volunteer),
                    useValue: {
                        create: jest.fn().mockReturnValue(mockVolunteer),
                        save: jest.fn().mockResolvedValue(mockVolunteer),
                        find: jest.fn().mockResolvedValue([mockVolunteer]),
                        findOne: jest.fn().mockResolvedValue(mockVolunteer),
                        softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
                        count: jest.fn().mockResolvedValue(3),
                        createQueryBuilder: jest.fn().mockReturnValue({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            andWhere: jest.fn().mockReturnThis(),
                            orderBy: jest.fn().mockReturnThis(),
                            addOrderBy: jest.fn().mockReturnThis(),
                            take: jest.fn().mockReturnThis(),
                            skip: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([mockVolunteer]),
                            getOne: jest.fn().mockResolvedValue(mockVolunteer),
                            getCount: jest.fn().mockResolvedValue(5),
                            select: jest.fn().mockReturnThis(),
                            getRawOne: jest.fn().mockResolvedValue({
                                total: '10', available: '5', busy: '3', offline: '2', hours: '1200',
                            }),
                        }),
                    },
                },
                {
                    provide: AccountsService,
                    useValue: {
                        upgradeToVolunteer: jest.fn().mockResolvedValue(undefined),
                        downgradeToPublic: jest.fn().mockResolvedValue(undefined),
                        assignRoleInternal: jest.fn().mockResolvedValue(undefined),
                    },
                },
            ],
        }).compile();

        service = module.get<VolunteersService>(VolunteersService);
        volunteerRepo = module.get(getRepositoryToken(Volunteer));
        accountsService = module.get(AccountsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== create =====
    describe('create', () => {
        it('should create a volunteer with pending approval', async () => {
            const dto = {
                name: '王大明',
                phone: '0912345678',
                region: '台北市',
                skills: ['急救'],
            };
            const result = await service.create(dto as any);
            expect(volunteerRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ approvalStatus: 'pending' }),
            );
            expect(result).toEqual(mockVolunteer);
        });
    });

    // ===== findAll =====
    describe('findAll', () => {
        it('should return all volunteers', async () => {
            const result = await service.findAll();
            expect(result).toEqual([mockVolunteer]);
        });

        it('should filter by status', async () => {
            await service.findAll({ status: 'available' as any });
            // findAll uses QueryBuilder internally when filters are applied
            expect(volunteerRepo.createQueryBuilder).toHaveBeenCalled();
        });
    });

    // ===== findOne =====
    describe('findOne', () => {
        it('should return a volunteer by id', async () => {
            const result = await service.findOne('vol-1');
            expect(result).toEqual(mockVolunteer);
        });

        it('should throw NotFoundException if volunteer not found', async () => {
            volunteerRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
        });
    });

    // ===== update =====
    describe('update', () => {
        it('should update volunteer data', async () => {
            const result = await service.update('vol-1', { name: '王小明' } as any);
            expect(volunteerRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });
    });

    // ===== updateStatus =====
    describe('updateStatus', () => {
        it('should update volunteer status', async () => {
            const result = await service.updateStatus('vol-1', 'busy' as any);
            expect(volunteerRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'busy' }),
            );
            expect(result).toBeDefined();
        });
    });

    // ===== findAvailable =====
    describe('findAvailable', () => {
        it('should return available volunteers', async () => {
            const result = await service.findAvailable();
            expect(result).toBeDefined();
        });
    });

    // ===== findByLineUserId =====
    describe('findByLineUserId', () => {
        it('should find volunteer by LINE user ID', async () => {
            volunteerRepo.findOne.mockResolvedValueOnce(mockVolunteer);
            const result = await service.findByLineUserId('line-123');
            expect(volunteerRepo.findOne).toHaveBeenCalledWith(
                expect.objectContaining({
                    where: { lineUserId: 'line-123' },
                }),
            );
            expect(result).toEqual(mockVolunteer);
        });

        it('should return null if not found', async () => {
            volunteerRepo.findOne.mockResolvedValueOnce(null);
            const result = await service.findByLineUserId('nonexistent');
            expect(result).toBeNull();
        });
    });

    // ===== bindLineUserId =====
    describe('bindLineUserId', () => {
        it('should bind LINE user ID to volunteer', async () => {
            const result = await service.bindLineUserId('vol-1', 'line-123');
            expect(volunteerRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ lineUserId: 'line-123' }),
            );
            expect(result).toBeDefined();
        });
    });

    // ===== addServiceRecord =====
    describe('addServiceRecord', () => {
        it('should add service hours', async () => {
            const vol = { ...mockVolunteer, serviceHours: 100, taskCount: 10 };
            volunteerRepo.findOne.mockResolvedValueOnce(vol);
            await service.addServiceRecord('vol-1', 8);
            expect(volunteerRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({
                    serviceHours: 108,
                    taskCount: 11,
                }),
            );
        });
    });

    // ===== delete =====
    describe('delete', () => {
        it('should soft-delete a volunteer', async () => {
            await service.delete('vol-1');
            expect(volunteerRepo.softDelete).toHaveBeenCalledWith('vol-1');
        });
    });

    // ===== Approval Flow =====
    describe('findPending', () => {
        it('should return pending volunteers', async () => {
            const result = await service.findPending();
            expect(result).toBeDefined();
        });
    });

    describe('approve', () => {
        it('should approve a volunteer and upgrade account', async () => {
            const pendingVol = { ...mockVolunteer, approvalStatus: 'pending', accountId: 'acc-1' };
            volunteerRepo.findOne.mockResolvedValueOnce(pendingVol);
            const result = await service.approve('vol-1', 'admin-1', '通過');
            expect(volunteerRepo.save).toHaveBeenCalledWith(
                expect.objectContaining({ approvalStatus: 'approved' }),
            );
            expect(accountsService.assignRoleInternal).toHaveBeenCalledWith('acc-1', 'volunteer');
            expect(result).toBeDefined();
        });
    });

    // ===== getPendingCount =====
    describe('getPendingCount', () => {
        it('should return count of pending volunteers', async () => {
            const result = await service.getPendingCount();
            expect(result).toBe(3);
        });
    });
});
