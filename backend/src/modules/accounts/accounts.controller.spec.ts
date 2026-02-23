import { Test, TestingModule } from '@nestjs/testing';
import { AccountsController } from './accounts.controller';
import { AccountsService } from './accounts.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('AccountsController', () => {
    let controller: AccountsController;
    let service: jest.Mocked<Partial<AccountsService>>;

    beforeEach(async () => {
        service = {
            findAll: jest.fn().mockResolvedValue([{ id: '1', email: 'a@b.com', roles: [] }]),
            getAllRoles: jest.fn().mockResolvedValue([{ name: 'owner', level: 5 }]),
            getAllPagePermissions: jest.fn().mockResolvedValue([{ pageKey: 'dashboard', requiredLevel: 0 }]),
            getAccountsForAdmin: jest.fn().mockResolvedValue([]),
            findById: jest.fn().mockResolvedValue({ id: '1', email: 'a@b.com' }),
            setRoles: jest.fn().mockResolvedValue({ id: '1', email: 'a@b.com', roles: [{ name: 'volunteer', level: 1, displayName: '志工' }] }),
            updatePagePermission: jest.fn().mockResolvedValue({ pageKey: 'dashboard', requiredLevel: 2 }),
            getPendingAccounts: jest.fn().mockResolvedValue([]),
            approveAccount: jest.fn().mockResolvedValue({ success: true, message: '帳號已審批通過' }),
            rejectAccount: jest.fn().mockResolvedValue({ success: true, message: '帳號已被拒絕' }),
            deleteAccount: jest.fn().mockResolvedValue({ success: true, message: '帳號已刪除' }),
            blacklistAccount: jest.fn().mockResolvedValue({ success: true, message: '帳號已加入黑名單' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AccountsController],
            providers: [{ provide: AccountsService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<AccountsController>(AccountsController);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('findAll returns accounts', async () => {
        const result = await controller.findAll();
        expect(result).toHaveLength(1);
        expect(service.findAll).toHaveBeenCalled();
    });

    it('getRoles returns roles', async () => {
        const result = await controller.getRoles();
        expect(result).toHaveLength(1);
    });

    it('getPagePermissions returns permissions', async () => {
        const result = await controller.getPagePermissions();
        expect(result).toHaveLength(1);
    });

    it('getAccountsForAdmin calls service', async () => {
        await controller.getAccountsForAdmin();
        expect(service.getAccountsForAdmin).toHaveBeenCalled();
    });

    it('findOne returns account by id', async () => {
        const result = await controller.findOne('1');
        expect(result).toEqual({ id: '1', email: 'a@b.com' });
    });

    it('setRoles sets roles for account', async () => {
        const req = { user: { roleLevel: 5 } };
        const result = await controller.setRoles('1', { roleNames: ['volunteer'] } as any, req);
        expect(result).toHaveProperty('roleLevel', 1);
        expect(result).toHaveProperty('roleDisplayName', '志工');
    });

    it('updatePagePermission delegates to service', async () => {
        const req = { user: { roleLevel: 5 } };
        const result = await controller.updatePagePermission('dashboard', { requiredLevel: 2 }, req);
        expect(result).toEqual({ pageKey: 'dashboard', requiredLevel: 2 });
    });

    it('getPendingAccounts returns empty array', async () => {
        const result = await controller.getPendingAccounts();
        expect(result).toEqual([]);
    });

    it('approveAccount approves account', async () => {
        const req = { user: { id: 'admin1' } };
        const result = await controller.approveAccount('1', req);
        expect(result.success).toBe(true);
        expect(service.approveAccount).toHaveBeenCalledWith('1', 'admin1');
    });

    it('rejectAccount rejects with reason', async () => {
        const req = { user: { id: 'admin1' } };
        const result = await controller.rejectAccount('1', { reason: '不符資格' }, req);
        expect(result.success).toBe(true);
    });

    it('deleteAccount deletes account', async () => {
        const req = { user: { roleLevel: 4 } };
        const result = await controller.deleteAccount('1', req);
        expect(result.success).toBe(true);
    });

    it('blacklistAccount blacklists account', async () => {
        const req = { user: { roleLevel: 4 } };
        const result = await controller.blacklistAccount('1', { reason: '違規' }, req);
        expect(result.success).toBe(true);
    });
});
