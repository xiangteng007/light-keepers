import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogService } from '../modules/audit-log/audit-log.service';

describe('AuditLogService', () => {
    let service: AuditLogService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [AuditLogService],
        }).compile();

        service = module.get<AuditLogService>(AuditLogService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('log', () => {
        it('should create audit log entry', () => {
            service.log({
                userId: 'user-1',
                action: 'test_action',
                category: 'api_request',
                riskLevel: 'low',
            });

            const logs = service.query({ userId: 'user-1' });
            expect(logs.length).toBe(1);
            expect(logs[0].action).toBe('test_action');
        });
    });

    describe('logDataChange', () => {
        it('should log data changes', () => {
            service.logDataChange({
                userId: 'user-1',
                action: 'create',
                entityType: 'incident',
                entityId: 'inc-1',
            });

            const logs = service.query({ category: 'data_change' });
            expect(logs.length).toBeGreaterThan(0);
        });
    });

    describe('query', () => {
        beforeEach(() => {
            service.log({ userId: 'user-1', action: 'action1', category: 'auth', riskLevel: 'low' });
            service.log({ userId: 'user-2', action: 'action2', category: 'api_request', riskLevel: 'high' });
        });

        it('should filter by userId', () => {
            const logs = service.query({ userId: 'user-1' });
            expect(logs.every((l) => l.userId === 'user-1')).toBe(true);
        });

        it('should filter by riskLevel', () => {
            const logs = service.query({ riskLevel: 'high' });
            expect(logs.every((l) => l.riskLevel === 'high')).toBe(true);
        });

        it('should limit results', () => {
            const logs = service.query({ limit: 1 });
            expect(logs.length).toBe(1);
        });
    });

    describe('getStats', () => {
        it('should return statistics', () => {
            service.log({ userId: 'user-1', action: 'test', category: 'auth', riskLevel: 'high' });
            const stats = service.getStats(24);
            expect(stats.totalLogs).toBeGreaterThan(0);
            expect(stats.byCategory).toBeDefined();
        });
    });
});
