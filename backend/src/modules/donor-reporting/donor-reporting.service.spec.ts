import { Test, TestingModule } from '@nestjs/testing';
import { DonorReportingService, GrantStatus, FundingType } from './donor-reporting.service';

describe('DonorReportingService', () => {
    let service: DonorReportingService;

    const baseGrant = {
        donorName: 'USAID',
        donorType: FundingType.BILATERAL,
        grantCode: 'USAID-2026-001',
        title: '災後重建計畫',
        description: '援助計畫',
        amount: 1000000,
        currency: 'USD',
        status: GrantStatus.APPROVED,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        reportingFrequency: 'quarterly' as const,
        contactPerson: '聯絡人',
        projectIds: ['proj-1'],
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [DonorReportingService],
        }).compile();

        service = module.get<DonorReportingService>(DonorReportingService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    // ===== Grant CRUD =====
    describe('createGrant', () => {
        it('should create a grant with id', async () => {
            const grant = await service.createGrant(baseGrant);
            expect(grant.id).toContain('grant-');
            expect(grant.donorName).toBe('USAID');
            expect(grant.amount).toBe(1000000);
        });
    });

    describe('getGrant', () => {
        it('should return grant by id', async () => {
            const created = await service.createGrant(baseGrant);
            const found = await service.getGrant(created.id);
            expect(found).toBeDefined();
            expect(found?.title).toBe('災後重建計畫');
        });

        it('should return null for missing grant', async () => {
            const result = await service.getGrant('no-id');
            expect(result).toBeNull();
        });
    });

    describe('getActiveGrants', () => {
        it('should return only ACTIVE and REPORTING grants', async () => {
            await service.createGrant({ ...baseGrant, status: GrantStatus.ACTIVE });
            await new Promise(r => setTimeout(r, 2));
            await service.createGrant({ ...baseGrant, status: GrantStatus.CLOSED });
            const active = await service.getActiveGrants();
            expect(active.length).toBe(1);
        });
    });

    // ===== Expenditures =====
    describe('recordExpenditure', () => {
        it('should record an expenditure against a grant', async () => {
            const grant = await service.createGrant(baseGrant);
            const exp = await service.recordExpenditure(grant.id, '人事費', '顧問費', 5000, 'USD');
            expect(exp.id).toBeDefined();
            expect(exp.amount).toBe(5000);
            expect(exp.grantId).toBe(grant.id);
        });

        it('should record even for unknown grantId (no validation)', async () => {
            const exp = await service.recordExpenditure('fake', '人事費', '描述', 100, 'USD');
            expect(exp.grantId).toBe('fake');
        });
    });

    describe('getGrantExpenditures', () => {
        it('should return expenditures for specific grant', async () => {
            const grant = await service.createGrant(baseGrant);
            await service.recordExpenditure(grant.id, '設備', '發電機', 2000, 'USD');
            const exps = await service.getGrantExpenditures(grant.id);
            expect(exps.length).toBe(1);
        });
    });

    describe('getBudgetUtilization', () => {
        it('should calculate utilization percentage', async () => {
            const grant = await service.createGrant(baseGrant);
            await service.recordExpenditure(grant.id, '人事費', '顧問', 100000, 'USD');
            await service.recordExpenditure(grant.id, '設備', '工具', 50000, 'USD');
            const util = await service.getBudgetUtilization(grant.id);
            expect(util.totalBudget).toBe(1000000);
            expect(util.totalSpent).toBe(150000);
            expect(util.utilizationPercent).toBe(15);
            expect(util.byCategory.length).toBe(2);
        });
    });

    // ===== Impact Metrics =====
    describe('recordImpactMetric', () => {
        it('should record an impact metric', async () => {
            const grant = await service.createGrant(baseGrant);
            const metric = await service.recordImpactMetric(
                grant.id, '受災戶重建', 100, 45, '戶',
                new Date('2026-01-01'), new Date('2026-03-31'),
            );
            expect(metric.metricName).toBe('受災戶重建');
            expect(metric.targetValue).toBe(100);
            expect(metric.actualValue).toBe(45);
        });
    });

    describe('getGrantMetrics', () => {
        it('should return metrics for grant', async () => {
            const grant = await service.createGrant(baseGrant);
            await service.recordImpactMetric(grant.id, '人數', 200, 150, '人',
                new Date('2026-01-01'), new Date('2026-06-30'));
            const metrics = await service.getGrantMetrics(grant.id);
            expect(metrics.length).toBe(1);
        });
    });

    // ===== Report Generation =====
    describe('generateReport', () => {
        it('should generate a combined report', async () => {
            const grant = await service.createGrant(baseGrant);
            await service.recordExpenditure(grant.id, '人事費', '薪資', 30000, 'USD');
            await service.recordImpactMetric(grant.id, '培訓人數', 50, 30, '人',
                new Date('2026-01-01'), new Date('2026-03-31'));
            const report = await service.generateReport(
                grant.id, 'combined',
                new Date('2026-01-01'), new Date('2026-03-31'),
                '第一季成果報告',
            );
            expect(report.id).toBeDefined();
            expect(report.reportType).toBe('combined');
            expect(report.status).toBe('draft');
        });

        it('should generate report even for unknown grant (returns null grant data)', async () => {
            const report = await service.generateReport('fake', 'financial',
                new Date(), new Date());
            expect(report.grantId).toBe('fake');
            expect(report.status).toBe('draft');
        });
    });

    // ===== Dashboard =====
    describe('getFundingOverview', () => {
        it('should return funding overview stats', async () => {
            await service.createGrant(baseGrant);
            await new Promise(r => setTimeout(r, 2));
            await service.createGrant({ ...baseGrant, amount: 500000, donorType: FundingType.FOUNDATION });
            const overview = await service.getFundingOverview();
            expect(overview.totalGrants).toBe(2);
            expect(overview.totalFunding).toBe(1500000);
        });
    });

    describe('getUpcomingReportDeadlines', () => {
        it('should return grants with upcoming deadlines', async () => {
            const grant = { ...baseGrant, nextReportDue: new Date(Date.now() + 10 * 86400000) };
            await service.createGrant(grant);
            const deadlines = await service.getUpcomingReportDeadlines(30);
            expect(deadlines.length).toBeGreaterThanOrEqual(1);
        });
    });
});
