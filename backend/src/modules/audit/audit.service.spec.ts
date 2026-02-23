import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuditService } from './audit.service';
import { AuditLog } from './audit-log.entity';

describe('AuditService', () => {
    let service: AuditService;
    let auditRepo: any;

    const mockLog: Partial<AuditLog> = {
        id: 'log-1',
        userId: 'user-1',
        userName: '管理員',
        action: 'login' as any,
        resourceType: 'auth',
        description: '用戶登入',
        success: true,
        ipAddress: '192.168.1.1',
        createdAt: new Date(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuditService,
                {
                    provide: getRepositoryToken(AuditLog),
                    useValue: {
                        create: jest.fn().mockImplementation((dto) => ({ id: 'log-1', ...dto })),
                        save: jest.fn().mockImplementation((l) => Promise.resolve(l)),
                        find: jest.fn().mockResolvedValue([mockLog]),
                        findAndCount: jest.fn().mockResolvedValue([[mockLog], 1]),
                        delete: jest.fn().mockResolvedValue({ affected: 5 }),
                    },
                },
            ],
        }).compile();

        service = module.get<AuditService>(AuditService);
        auditRepo = module.get(getRepositoryToken(AuditLog));
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Logging =====
    describe('log', () => {
        it('should create audit log', async () => {
            const result = await service.log({
                action: 'login' as any,
                userId: 'user-1',
                description: '用戶登入',
            });
            expect(auditRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                action: 'login',
                success: true,
            }));
            expect(result).toBeDefined();
        });

        it('should default success to true', async () => {
            await service.log({ action: 'update' as any });
            expect(auditRepo.create).toHaveBeenCalledWith(expect.objectContaining({
                success: true,
            }));
        });

        it('should not throw on save failure', async () => {
            auditRepo.save.mockRejectedValueOnce(new Error('DB error'));
            const result = await service.log({ action: 'login' as any });
            // Should return null instead of throwing
            expect(result).toBeNull();
        });
    });

    describe('logAsync', () => {
        it('should fire and forget', () => {
            // Just verify it doesn't throw
            expect(() => service.logAsync({ action: 'login' as any })).not.toThrow();
        });
    });

    // ===== Queries =====
    describe('query', () => {
        it('should return paginated audit logs', async () => {
            const result = await service.query({ userId: 'user-1', limit: 10 });
            expect(result.logs).toEqual([mockLog]);
            expect(result.total).toBe(1);
        });

        it('should filter by date range', async () => {
            const startDate = new Date('2026-01-01');
            const endDate = new Date('2026-01-31');
            await service.query({ startDate, endDate });
            expect(auditRepo.findAndCount).toHaveBeenCalled();
        });
    });

    describe('getUserActivity', () => {
        it('should return user activity logs', async () => {
            const result = await service.getUserActivity('user-1', 10);
            expect(result).toEqual([mockLog]);
        });
    });

    describe('getResourceHistory', () => {
        it('should return resource history', async () => {
            const result = await service.getResourceHistory('account', 'acc-1');
            expect(result).toEqual([mockLog]);
        });
    });

    // ===== Security Monitoring =====
    describe('getFailedActions', () => {
        it('should return failed actions within time window', async () => {
            auditRepo.find.mockResolvedValueOnce([{ ...mockLog, success: false }]);
            const result = await service.getFailedActions(24);
            expect(result).toHaveLength(1);
        });
    });

    describe('getLoginAttempts', () => {
        it('should return login attempt statistics', async () => {
            auditRepo.find
                .mockResolvedValueOnce([{ ...mockLog, success: true, ipAddress: '1.1.1.1' }])    // login
                .mockResolvedValueOnce([{ ...mockLog, success: false, ipAddress: '2.2.2.2' }]);   // login_failed
            const result = await service.getLoginAttempts(24);
            expect(result.successful).toBe(1);
            expect(result.failed).toBe(1);
            expect(result.byIp['1.1.1.1']).toBe(1);
            expect(result.byIp['2.2.2.2']).toBe(1);
        });
    });

    // ===== Maintenance =====
    describe('cleanup', () => {
        it('should delete old logs and return count', async () => {
            const result = await service.cleanup(90);
            expect(result).toBe(5);
            expect(auditRepo.delete).toHaveBeenCalled();
        });
    });
});
