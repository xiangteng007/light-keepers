import { Test, TestingModule } from '@nestjs/testing';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('TenantController', () => {
    let controller: TenantController;

    beforeEach(async () => {
        const service = {
            getTenants: jest.fn().mockResolvedValue([]),
            getTenant: jest.fn().mockResolvedValue({ id: 't1' }),
            createTenant: jest.fn().mockResolvedValue({ id: 't1' }),
            updateTenant: jest.fn().mockResolvedValue({ id: 't1' }),
            updateTenantConfig: jest.fn().mockResolvedValue({ id: 't1' }),
            suspendTenant: jest.fn().mockResolvedValue({ id: 't1' }),
            activateTenant: jest.fn().mockResolvedValue({ id: 't1' }),
            getMembers: jest.fn().mockResolvedValue([]),
            addMember: jest.fn().mockResolvedValue({ id: 'm1' }),
            removeMember: jest.fn().mockResolvedValue(undefined),
            checkQuota: jest.fn().mockResolvedValue({ allowed: true }),
            getStats: jest.fn().mockResolvedValue({}),
        };
        const module: TestingModule = await Test.createTestingModule({
            controllers: [TenantController],
            providers: [{ provide: TenantService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();
        controller = module.get<TenantController>(TenantController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getTenants', async () => expect((await controller.getTenants()).success).toBe(true));
    it('getTenant', async () => expect((await controller.getTenant('t1')).success).toBe(true));
    it('createTenant', async () => expect((await controller.createTenant({} as any)).success).toBe(true));
    it('updateTenant', async () => expect((await controller.updateTenant('t1', {})).success).toBe(true));
    it('updateConfig', async () => expect((await controller.updateConfig('t1', {})).success).toBe(true));
    it('suspendTenant', async () => expect((await controller.suspendTenant('t1')).success).toBe(true));
    it('activateTenant', async () => expect((await controller.activateTenant('t1')).success).toBe(true));
    it('getMembers', async () => expect((await controller.getMembers('t1')).success).toBe(true));
    it('addMember', async () => expect((await controller.addMember('t1', { accountId: 'a1' })).success).toBe(true));
    it('removeMember', async () => expect((await controller.removeMember('t1', 'a1')).success).toBe(true));
    it('checkQuota', async () => expect((await controller.checkQuota('t1', 'users')).success).toBe(true));
    it('getStats', async () => expect((await controller.getStats()).success).toBe(true));
});
