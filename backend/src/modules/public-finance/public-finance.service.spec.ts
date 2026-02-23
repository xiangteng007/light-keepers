import { Test, TestingModule } from '@nestjs/testing';
import { PublicFinanceService } from './public-finance.service';

describe('PublicFinanceService', () => {
    let service: PublicFinanceService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PublicFinanceService],
        }).compile();

        service = module.get<PublicFinanceService>(PublicFinanceService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('getPublicFinanceSummary', () => {
        it('should return finance summary for given year', () => {
            const summary = service.getPublicFinanceSummary(2025);
            expect(summary.year).toBe(2025);
            expect(summary.income.total).toBe(9200000);
            expect(summary.expenses.total).toBe(7900000);
            expect(summary.balance).toBe(1300000);
            expect(summary.programExpenseRatio).toBe(0.57);
        });
    });

    describe('getMajorExpenditures', () => {
        it('should filter by minimum amount', () => {
            const all = service.getMajorExpenditures(2025, 100000);
            expect(all.length).toBeGreaterThan(0);
            all.forEach(e => expect(e.amount).toBeGreaterThanOrEqual(100000));
        });

        it('should filter out smaller items', () => {
            const big = service.getMajorExpenditures(2025, 500000);
            expect(big.length).toBeLessThan(service.getMajorExpenditures(2025, 100000).length);
        });
    });

    describe('getProjectReport', () => {
        it('should return project finance details', () => {
            const report = service.getProjectReport('proj-1');
            expect(report.projectId).toBe('proj-1');
            expect(report.budget).toBe(1500000);
            expect(report.utilizationRate).toBe(85.3);
            expect(report.milestones).toHaveLength(3);
            expect(report.outcomes.length).toBeGreaterThan(0);
        });
    });

    describe('getDonorAcknowledgement', () => {
        it('should return donor stats and testimonials', () => {
            const ack = service.getDonorAcknowledgement({ from: new Date('2025-01-01'), to: new Date('2025-12-31') });
            expect(ack.totalDonors).toBe(1256);
            expect(ack.totalDonations).toBe(5800000);
            expect(ack.impactHighlights.length).toBe(4);
            expect(ack.testimonials.length).toBe(2);
        });
    });

    describe('getAnnualReportInfo', () => {
        it('should return report metadata', () => {
            const info = service.getAnnualReportInfo(2025);
            expect(info.title).toContain('2025');
            expect(info.available).toBe(true);
            expect(info.pageCount).toBe(24);
            expect(info.sections).toContain('財務報告');
        });
    });

    describe('getLiveDashboardData', () => {
        it('should return current financial dashboard', () => {
            const dash = service.getLiveDashboardData();
            expect(dash.cashBalance).toBe(2850000);
            expect(dash.mtdIncome).toBe(485000);
            expect(dash.lastUpdated).toBeInstanceOf(Date);
        });
    });
});
