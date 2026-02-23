import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SeedService } from './seed.service';
import { Role, PagePermission } from './entities';
import { Account } from './entities/account.entity';

describe('SeedService', () => {
    let service: SeedService;
    let roleRepo: {
        findOne: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
        delete: jest.Mock;
    };
    let pagePermRepo: {
        findOne: jest.Mock;
        save: jest.Mock;
        update: jest.Mock;
    };
    let accountRepo: {
        find: jest.Mock;
        update: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let mockQb: any;

    beforeEach(async () => {
        roleRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
            delete: jest.fn().mockResolvedValue(undefined),
        };
        pagePermRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue(undefined),
            update: jest.fn().mockResolvedValue(undefined),
        };
        mockQb = {
            relation: jest.fn().mockReturnThis(),
            of: jest.fn().mockReturnThis(),
            add: jest.fn().mockResolvedValue(undefined),
        };
        accountRepo = {
            find: jest.fn().mockResolvedValue([]),
            update: jest.fn().mockResolvedValue(undefined),
            createQueryBuilder: jest.fn().mockReturnValue(mockQb),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                SeedService,
                { provide: getRepositoryToken(Role), useValue: roleRepo },
                { provide: getRepositoryToken(PagePermission), useValue: pagePermRepo },
                { provide: getRepositoryToken(Account), useValue: accountRepo },
            ],
        }).compile();

        service = module.get<SeedService>(SeedService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('seedRoles', () => {
        it('should create 6 roles when none exist', async () => {
            await service.seedRoles();
            // 6 roles created + legacy role checks (3)
            expect(roleRepo.save).toHaveBeenCalledTimes(6);
        });

        it('should update existing roles instead of creating', async () => {
            roleRepo.findOne.mockImplementation(async ({ where }: any) => {
                const legacyNames = ['eoc', 'leader', 'admin'];
                if (legacyNames.includes(where.name)) return null;
                return { id: 'existing-id', name: where.name };
            });
            await service.seedRoles();
            expect(roleRepo.update).toHaveBeenCalled();
        });

        it('should delete legacy roles', async () => {
            roleRepo.findOne.mockImplementation(async ({ where }: any) => {
                if (where.name === 'eoc') return { id: 'legacy-eoc', name: 'eoc' };
                return null;
            });
            await service.seedRoles();
            expect(roleRepo.delete).toHaveBeenCalledWith('legacy-eoc');
        });
    });

    describe('seedPagePermissions', () => {
        it('should create page permissions when none exist', async () => {
            await service.seedPagePermissions();
            // 17 pages defined
            expect(pagePermRepo.save).toHaveBeenCalledTimes(17);
        });

        it('should skip existing page permissions', async () => {
            pagePermRepo.findOne.mockResolvedValue({ id: 'existing' });
            await service.seedPagePermissions();
            expect(pagePermRepo.save).not.toHaveBeenCalled();
        });
    });

    describe('fixDashboardPermission', () => {
        it('should fix dashboard permission if not PUBLIC', async () => {
            pagePermRepo.findOne.mockResolvedValueOnce({
                id: 'dash-1',
                pageKey: 'dashboard',
                requiredLevel: 10, // Not PUBLIC (0)
            });
            await service.fixDashboardPermission();
            expect(pagePermRepo.update).toHaveBeenCalledWith('dash-1', { requiredLevel: 0 });
        });

        it('should skip if dashboard already PUBLIC', async () => {
            pagePermRepo.findOne.mockResolvedValueOnce({
                id: 'dash-1',
                pageKey: 'dashboard',
                requiredLevel: 0,
            });
            await service.fixDashboardPermission();
            expect(pagePermRepo.update).not.toHaveBeenCalled();
        });

        it('should skip if dashboard not found', async () => {
            await service.fixDashboardPermission();
            expect(pagePermRepo.update).not.toHaveBeenCalled();
        });
    });

    describe('seedOwnerAccount', () => {
        it('should skip if no owner accounts found', async () => {
            await service.seedOwnerAccount();
            expect(accountRepo.update).not.toHaveBeenCalled();
        });

        it('should skip if owner role not found', async () => {
            accountRepo.find.mockResolvedValueOnce([{ id: 'acc-1', roles: [] }]);
            roleRepo.findOne.mockResolvedValueOnce(null);
            await service.seedOwnerAccount();
            expect(accountRepo.update).not.toHaveBeenCalled();
        });

        it('should skip if account already has owner role', async () => {
            accountRepo.find.mockResolvedValueOnce([{
                id: 'acc-1',
                email: 'xiangteng007@gmail.com',
                roles: [{ name: 'owner' }],
            }]);
            roleRepo.findOne.mockResolvedValueOnce({ id: 'role-owner', name: 'owner' });
            await service.seedOwnerAccount();
            expect(accountRepo.update).not.toHaveBeenCalled();
        });

        it('should grant owner role to matching account', async () => {
            accountRepo.find.mockResolvedValueOnce([{
                id: 'acc-1',
                email: 'xiangteng007@gmail.com',
                roles: [{ name: 'volunteer' }],
            }]);
            roleRepo.findOne.mockResolvedValueOnce({ id: 'role-owner', name: 'owner' });
            await service.seedOwnerAccount();
            expect(mockQb.add).toHaveBeenCalledWith('role-owner');
            expect(accountRepo.update).toHaveBeenCalledWith('acc-1', expect.objectContaining({
                approvalStatus: 'approved',
            }));
        });
    });

    describe('onModuleInit', () => {
        it('should execute all seed methods without throwing', async () => {
            await expect(service.onModuleInit()).resolves.not.toThrow();
        });
    });
});
