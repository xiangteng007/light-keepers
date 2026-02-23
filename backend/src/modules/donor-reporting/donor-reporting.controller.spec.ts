import { Test, TestingModule } from '@nestjs/testing';
import { DonorReportingController } from './donor-reporting.controller';
import { DonorReportingService } from './donor-reporting.service';
import { CoreJwtGuard, UnifiedRolesGuard } from '../shared/guards';

describe('DonorReportingController', () => {
    let controller: DonorReportingController;

    beforeEach(async () => {
        const service = {
            getFundingOverview: jest.fn().mockResolvedValue({ totalFunding: 1000000 }),
            getUpcomingReportDeadlines: jest.fn().mockResolvedValue([]),
            getActiveGrants: jest.fn().mockResolvedValue([]),
            getGrant: jest.fn().mockResolvedValue({ id: 'g1', title: 'Grant A' }),
            createGrant: jest.fn().mockResolvedValue({ id: 'g2' }),
            getGrantExpenditures: jest.fn().mockResolvedValue([]),
            getBudgetUtilization: jest.fn().mockResolvedValue({ utilized: 60 }),
            recordExpenditure: jest.fn().mockResolvedValue({ id: 'exp1' }),
            getGrantMetrics: jest.fn().mockResolvedValue([]),
            recordImpactMetric: jest.fn().mockResolvedValue({ id: 'met1' }),
            generateReport: jest.fn().mockResolvedValue({ id: 'rpt1', status: 'generated' }),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [DonorReportingController],
            providers: [{ provide: DonorReportingService, useValue: service }],
        })
            .overrideGuard(CoreJwtGuard).useValue({ canActivate: () => true })
            .overrideGuard(UnifiedRolesGuard).useValue({ canActivate: () => true })
            .compile();

        controller = module.get<DonorReportingController>(DonorReportingController);
    });

    it('should be defined', () => expect(controller).toBeDefined());

    it('getFundingOverview returns overview', async () => {
        const result = await controller.getFundingOverview();
        expect(result).toBeDefined();
    });

    it('getUpcomingDeadlines returns deadlines', async () => {
        const result = await controller.getUpcomingDeadlines('30');
        expect(result).toBeDefined();
    });

    it('getActiveGrants returns grants', async () => {
        const result = await controller.getActiveGrants();
        expect(result).toBeDefined();
    });

    it('getGrant returns single grant', async () => {
        const result = await controller.getGrant('g1');
        expect(result).toBeDefined();
    });

    it('createGrant creates grant', async () => {
        const result = await controller.createGrant({
            donorName: 'USAID', donorType: 'bilateral' as any, grantCode: 'GC001',
            title: 'Test', description: 'Test', amount: 100000, currency: 'USD',
            startDate: '2026-01-01', endDate: '2026-12-31', reportingFrequency: 'quarterly',
            contactPerson: 'John',
        });
        expect(result.id).toBe('g2');
    });

    it('recordExpenditure records expenditure', async () => {
        const result = await controller.recordExpenditure('g1', {
            category: 'travel', description: 'Field trip', amount: 500, currency: 'USD',
        });
        expect(result.id).toBe('exp1');
    });

    it('generateReport generates report', async () => {
        const result = await controller.generateReport('g1', {
            reportType: 'financial', periodStart: '2026-01-01', periodEnd: '2026-03-31',
        });
        expect(result.status).toBe('generated');
    });
});
