import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { AccountsService } from './accounts.service';
import { Account, Role, PagePermission } from './entities';
import { FirebaseAdminService } from '../auth/services/firebase-admin.service';

describe('AccountsService', () => {
    let service: AccountsService;
    let accountRepo: any;
    let roleRepo: any;
    let pagePermissionRepo: any;
    let firebaseAdmin: any;

    const mockRole: Partial<Role> = { id: 'role-1', name: 'volunteer', level: 1, displayName: '志工' };
    const mockAdminRole: Partial<Role> = { id: 'role-2', name: 'admin', level: 5, displayName: '管理員' };

    const mockAccount: Partial<Account> = {
        id: 'acc-1',
        email: 'test@test.com',
        displayName: '測試用戶',
        roles: [mockRole as Role],
        isActive: true,
        approvalStatus: 'pending',
        firebaseUid: 'fb-uid-1',
    };

    const mockPagePermission: Partial<PagePermission> = {
        id: 'pp-1',
        pageKey: 'dashboard',
        requiredLevel: 1,
        isVisible: true,
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AccountsService,
                {
                    provide: getRepositoryToken(Account),
                    useValue: {
                        find: jest.fn().mockResolvedValue([mockAccount]),
                        findOne: jest.fn().mockResolvedValue(mockAccount),
                        findAndCount: jest.fn().mockResolvedValue([[mockAccount], 1]),
                        save: jest.fn().mockImplementation((a) => Promise.resolve(a)),
                        remove: jest.fn().mockResolvedValue(mockAccount),
                        createQueryBuilder: jest.fn().mockReturnValue({
                            leftJoinAndSelect: jest.fn().mockReturnThis(),
                            where: jest.fn().mockReturnThis(),
                            getMany: jest.fn().mockResolvedValue([mockAccount]),
                        }),
                    },
                },
                {
                    provide: getRepositoryToken(Role),
                    useValue: {
                        find: jest.fn().mockResolvedValue([mockRole]),
                        findOne: jest.fn().mockResolvedValue(mockRole),
                    },
                },
                {
                    provide: getRepositoryToken(PagePermission),
                    useValue: {
                        find: jest.fn().mockResolvedValue([mockPagePermission]),
                        findOne: jest.fn().mockResolvedValue(mockPagePermission),
                        save: jest.fn().mockImplementation((p) => Promise.resolve(p)),
                    },
                },
                {
                    provide: FirebaseAdminService,
                    useValue: {
                        deleteFirebaseUserByUid: jest.fn().mockResolvedValue(undefined),
                        deleteFirebaseUser: jest.fn().mockResolvedValue(undefined),
                    },
                },
            ],
        }).compile();

        service = module.get<AccountsService>(AccountsService);
        accountRepo = module.get(getRepositoryToken(Account));
        roleRepo = module.get(getRepositoryToken(Role));
        pagePermissionRepo = module.get(getRepositoryToken(PagePermission));
        firebaseAdmin = module.get(FirebaseAdminService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Queries =====
    describe('findAll', () => {
        it('should return all accounts', async () => {
            const result = await service.findAll();
            expect(result).toEqual([mockAccount]);
        });
    });

    describe('findById', () => {
        it('should return account by id', async () => {
            const result = await service.findById('acc-1');
            expect(result).toBeDefined();
        });
    });

    describe('findByEmail', () => {
        it('should return account by email', async () => {
            const result = await service.findByEmail('test@test.com');
            expect(result).toBeDefined();
        });
    });

    describe('getAllRoles', () => {
        it('should return all roles', async () => {
            const result = await service.getAllRoles();
            expect(result).toEqual([mockRole]);
        });
    });

    describe('getAllPagePermissions', () => {
        it('should return all page permissions', async () => {
            const result = await service.getAllPagePermissions();
            expect(result).toEqual([mockPagePermission]);
        });
    });

    // ===== Role Assignment =====
    describe('assignRole', () => {
        it('should assign role to account', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, roles: [] });
            roleRepo.findOne.mockResolvedValueOnce(mockRole);
            const result = await service.assignRole('acc-1', 'volunteer', 5);
            expect(accountRepo.save).toHaveBeenCalled();
            expect(result.roles).toContainEqual(mockRole);
        });

        it('should throw NotFoundException for missing account', async () => {
            accountRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.assignRole('nonexistent', 'volunteer', 5))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw NotFoundException for missing role', async () => {
            roleRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.assignRole('acc-1', 'nonexistent', 5))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException when assigning equal/higher level role', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, roles: [] });
            roleRepo.findOne.mockResolvedValueOnce(mockAdminRole); // level 5
            await expect(service.assignRole('acc-1', 'admin', 3)) // operator level 3
                .rejects.toThrow(ForbiddenException);
        });
    });

    describe('removeRole', () => {
        it('should throw NotFoundException for missing account', async () => {
            accountRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.removeRole('nonexistent', 'volunteer', 5))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ===== Account Lifecycle =====
    describe('approveAccount', () => {
        it('should approve pending account', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, approvalStatus: 'pending' });
            const result = await service.approveAccount('acc-1', 'admin-1');
            expect(result.success).toBe(true);
            expect(accountRepo.save).toHaveBeenCalled();
        });

        it('should throw NotFoundException', async () => {
            accountRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.approveAccount('nonexistent', 'admin'))
                .rejects.toThrow(NotFoundException);
        });

        it('should throw ForbiddenException if not pending', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, approvalStatus: 'approved' });
            await expect(service.approveAccount('acc-1', 'admin'))
                .rejects.toThrow(ForbiddenException);
        });
    });

    describe('rejectAccount', () => {
        it('should reject pending account', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, approvalStatus: 'pending' });
            const result = await service.rejectAccount('acc-1', 'admin-1', '不符資格');
            expect(result.success).toBe(true);
        });
    });

    describe('deleteAccount', () => {
        it('should delete level 0 account with Firebase cleanup', async () => {
            accountRepo.findOne.mockResolvedValueOnce({
                ...mockAccount, roles: [], firebaseUid: 'fb-uid-1',
            });
            const result = await service.deleteAccount('acc-1', 5);
            expect(result.success).toBe(true);
            expect(firebaseAdmin.deleteFirebaseUserByUid).toHaveBeenCalledWith('fb-uid-1');
            expect(accountRepo.remove).toHaveBeenCalled();
        });

        it('should throw ForbiddenException for level > 0', async () => {
            accountRepo.findOne.mockResolvedValueOnce({
                ...mockAccount, roles: [{ ...mockRole, level: 1 }],
            });
            await expect(service.deleteAccount('acc-1', 5))
                .rejects.toThrow(ForbiddenException);
        });

        it('should throw NotFoundException', async () => {
            accountRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.deleteAccount('nonexistent', 5))
                .rejects.toThrow(NotFoundException);
        });
    });

    describe('blacklistAccount', () => {
        it('should blacklist account', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, roles: [] });
            const result = await service.blacklistAccount('acc-1', 5, '違規');
            expect(result.success).toBe(true);
        });
    });

    // ===== Page Permissions =====
    describe('updatePagePermission', () => {
        it('should update page permission', async () => {
            const result = await service.updatePagePermission('dashboard', { requiredLevel: 2 }, 5);
            expect(pagePermissionRepo.save).toHaveBeenCalled();
            expect(result).toBeDefined();
        });

        it('should throw NotFoundException', async () => {
            pagePermissionRepo.findOne.mockResolvedValueOnce(null);
            await expect(service.updatePagePermission('nonexistent', { requiredLevel: 2 }, 5))
                .rejects.toThrow(NotFoundException);
        });
    });

    // ===== Internal methods =====
    describe('assignRoleInternal', () => {
        it('should assign role without permission checks', async () => {
            accountRepo.findOne.mockResolvedValueOnce({ ...mockAccount, roles: [] });
            roleRepo.findOne.mockResolvedValueOnce(mockRole);
            await service.assignRoleInternal('acc-1', 'volunteer');
            expect(accountRepo.save).toHaveBeenCalled();
        });
    });
});
