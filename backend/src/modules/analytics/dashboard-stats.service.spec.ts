import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DashboardStatsService } from './dashboard-stats.service';
import { FieldReport, SosSignal } from '../field-reports/entities';
import { DispatchTask } from '../task-dispatch/entities/dispatch-task.entity';

describe('DashboardStatsService', () => {
    let service: DashboardStatsService;
    let reportsRepo: { find: jest.Mock };
    let sosRepo: { find: jest.Mock };
    let tasksRepo: { find: jest.Mock };

    beforeEach(async () => {
        reportsRepo = { find: jest.fn().mockResolvedValue([]) };
        sosRepo = { find: jest.fn().mockResolvedValue([]) };
        tasksRepo = { find: jest.fn().mockResolvedValue([]) };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                DashboardStatsService,
                { provide: getRepositoryToken(FieldReport), useValue: reportsRepo },
                { provide: getRepositoryToken(SosSignal), useValue: sosRepo },
                { provide: getRepositoryToken(DispatchTask), useValue: tasksRepo },
            ],
        }).compile();

        service = module.get<DashboardStatsService>(DashboardStatsService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== getDashboardStats =====
    describe('getDashboardStats', () => {
        it('should return empty stats when no data', async () => {
            const stats = await service.getDashboardStats();
            expect(stats.fieldReports.total).toBe(0);
            expect(stats.sosSignals.total).toBe(0);
            expect(stats.tasks.total).toBe(0);
            expect(stats.tasks.completionRate).toBe(0);
            expect(stats.recentActivity).toEqual([]);
        });

        it('should calculate report stats by status/type/severity', async () => {
            const now = new Date();
            reportsRepo.find.mockImplementation(({ where }: any) => {
                if (where?.createdAt) {
                    // 24h query
                    return Promise.resolve([
                        { id: 'r1', status: 'open', type: 'fire', severity: 3, createdAt: now, reporterName: 'A' },
                    ]);
                }
                // All reports
                return Promise.resolve([
                    { id: 'r1', status: 'open', type: 'fire', severity: 3, createdAt: now, reporterName: 'A' },
                    { id: 'r2', status: 'confirmed', type: 'flood', severity: 5, createdAt: now, reporterName: 'B' },
                ]);
            });

            const stats = await service.getDashboardStats();
            expect(stats.fieldReports.total).toBe(2);
            expect(stats.fieldReports.last24h).toBe(1);
            expect(stats.fieldReports.byStatus['open']).toBe(1);
            expect(stats.fieldReports.byType['fire']).toBe(1);
            expect(stats.fieldReports.bySeverity[5]).toBe(1);
        });

        it('should calculate SOS statistics', async () => {
            const now = new Date();
            const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
            sosRepo.find.mockImplementation(({ where }: any) => {
                if (where?.status === 'active') {
                    return Promise.resolve([{ id: 's1', status: 'active', createdAt: now, userName: 'A' }]);
                }
                return Promise.resolve([
                    { id: 's1', status: 'active', createdAt: now, userName: 'A' },
                    { id: 's2', status: 'acked', createdAt: fiveMinAgo, ackedAt: now, userName: 'B' },
                    { id: 's3', status: 'resolved', createdAt: fiveMinAgo, userName: 'C' },
                ]);
            });

            const stats = await service.getDashboardStats();
            expect(stats.sosSignals.total).toBe(3);
            expect(stats.sosSignals.active).toBe(1);
            expect(stats.sosSignals.acknowledged).toBe(1);
            expect(stats.sosSignals.resolved).toBe(1);
            expect(stats.sosSignals.avgResponseMinutes).toBe(5);
        });

        it('should calculate task completion rate', async () => {
            tasksRepo.find.mockResolvedValueOnce([
                { status: 'completed', dueAt: null },
                { status: 'completed', dueAt: null },
                { status: 'pending', dueAt: null },
                { status: 'in_progress', dueAt: new Date(Date.now() - 86400000) }, // overdue
            ]);

            const stats = await service.getDashboardStats();
            expect(stats.tasks.total).toBe(4);
            expect(stats.tasks.completed).toBe(2);
            expect(stats.tasks.completionRate).toBe(50);
            expect(stats.tasks.overdue).toBe(1);
        });
    });

    // ===== getTimeSeries =====
    describe('getTimeSeries', () => {
        it('should return time series for reports', async () => {
            const start = new Date('2024-01-01T00:00:00Z');
            const end = new Date('2024-01-02T00:00:00Z');
            reportsRepo.find.mockResolvedValueOnce([
                { createdAt: new Date('2024-01-01T03:00:00Z') },
                { createdAt: new Date('2024-01-01T03:30:00Z') },
            ]);

            const result = await service.getTimeSeries('mission-1', 'reports', start, end);
            expect(result.label).toBe('reports');
            expect(result.data.length).toBe(24); // 24 hourly buckets
            // Both reports in the same hour bucket — total across all buckets should be 2
            const totalValue = result.data.reduce((sum, d) => sum + d.value, 0);
            expect(totalValue).toBe(2);
        });
    });

    // ===== getTopReporters =====
    describe('getTopReporters', () => {
        it('should rank reporters by count', async () => {
            reportsRepo.find.mockResolvedValueOnce([
                { reporterName: 'Alice' },
                { reporterName: 'Alice' },
                { reporterName: 'Bob' },
                { reporterName: null },
            ]);

            const result = await service.getTopReporters('mission-1', 5);
            expect(result[0]).toEqual({ name: 'Alice', count: 2 });
            expect(result[1]).toEqual({ name: 'Bob', count: 1 });
            expect(result[2]).toEqual({ name: 'Unknown', count: 1 });
        });
    });
});
