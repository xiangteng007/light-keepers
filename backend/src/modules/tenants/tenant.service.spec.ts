import { TenantService } from './tenant.service';

describe('TenantService', () => {
    let service: TenantService;
    let tenantRepo: Record<string, jest.Mock>;
    let memberRepo: Record<string, jest.Mock>;

    const mockTenant = {
        id: 'tid-1', code: 'LK', name: 'Light Keepers', status: 'active',
        config: {}, maxUsers: 50, maxReports: 1000, maxVolunteers: 200,
        createdAt: new Date(),
    };

    beforeEach(() => {
        tenantRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([mockTenant]),
            create: jest.fn().mockImplementation((d: any) => ({ ...mockTenant, ...d })),
            save: jest.fn().mockImplementation((d: any) => Promise.resolve(d)),
            count: jest.fn().mockResolvedValue(5),
            createQueryBuilder: jest.fn().mockReturnValue({
                select: jest.fn().mockReturnThis(),
                addSelect: jest.fn().mockReturnThis(),
                groupBy: jest.fn().mockReturnThis(),
                getRawMany: jest.fn().mockResolvedValue([{ plan: 'free', count: '3' }, { plan: 'pro', count: '2' }]),
            }),
        };
        memberRepo = {
            findOne: jest.fn().mockResolvedValue(null),
            find: jest.fn().mockResolvedValue([]),
            create: jest.fn().mockImplementation((d: any) => d),
            save: jest.fn().mockImplementation((d: any) => Promise.resolve(d)),
            count: jest.fn().mockResolvedValue(10),
        };
        service = new TenantService(tenantRepo as any, memberRepo as any);
    });

    it('should be defined', () => expect(service).toBeDefined());

    describe('createTenant', () => {
        it('should create tenant', async () => {
            const result = await service.createTenant({ code: 'NEW', name: 'New Org' });
            expect(tenantRepo.save).toHaveBeenCalled();
            expect(result.code).toBe('NEW');
        });

        it('should throw for duplicate code', async () => {
            tenantRepo.findOne.mockResolvedValue(mockTenant);
            await expect(service.createTenant({ code: 'LK', name: 'dup' })).rejects.toThrow('already exists');
        });
    });

    describe('getTenants', () => {
        it('should return all tenants', async () => {
            const result = await service.getTenants();
            expect(result).toHaveLength(1);
        });
    });

    describe('getTenant', () => {
        it('should return tenant by ID', async () => {
            tenantRepo.findOne.mockResolvedValue(mockTenant);
            const result = await service.getTenant('tid-1');
            expect(result.code).toBe('LK');
        });

        it('should throw NotFoundException for missing tenant', async () => {
            await expect(service.getTenant('bad-id')).rejects.toThrow('Tenant not found');
        });
    });

    describe('suspendTenant / activateTenant', () => {
        it('should suspend tenant', async () => {
            tenantRepo.findOne.mockResolvedValue({ ...mockTenant });
            const result = await service.suspendTenant('tid-1');
            expect(result.status).toBe('suspended');
        });

        it('should activate tenant', async () => {
            tenantRepo.findOne.mockResolvedValue({ ...mockTenant, status: 'suspended' });
            const result = await service.activateTenant('tid-1');
            expect(result.status).toBe('active');
        });
    });

    describe('addMember', () => {
        it('should add new member', async () => {
            const result = await service.addMember('tid-1', 'acc-1', 'admin');
            expect(memberRepo.save).toHaveBeenCalled();
            expect(result.role).toBe('admin');
        });

        it('should update existing member role', async () => {
            memberRepo.findOne.mockResolvedValue({ tenantId: 'tid-1', accountId: 'acc-1', role: 'member', isActive: true });
            const result = await service.addMember('tid-1', 'acc-1', 'owner');
            expect(result.role).toBe('owner');
        });
    });

    describe('checkQuota', () => {
        it('should return quota info', async () => {
            tenantRepo.findOne.mockResolvedValue(mockTenant);
            const result = await service.checkQuota('tid-1', 'users');
            expect(result).toHaveProperty('current');
            expect(result).toHaveProperty('max');
            expect(result).toHaveProperty('available');
        });
    });

    describe('getStats', () => {
        it('should return tenant statistics', async () => {
            const stats = await service.getStats();
            expect(stats.total).toBe(5);
            expect(stats.byPlan).toHaveProperty('free');
        });
    });
});
