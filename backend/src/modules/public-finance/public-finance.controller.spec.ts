import { Test, TestingModule } from '@nestjs/testing';
import { PublicFinanceController } from './public-finance.controller';
import { PublicFinanceService } from './public-finance.service';

describe('PublicFinanceController', () => {
    let controller: PublicFinanceController;

    beforeEach(async () => {
        const service = {
            getPublicFinanceSummary: jest.fn().mockReturnValue({}),
            getMajorExpenditures: jest.fn().mockReturnValue([]),
            getProjectReport: jest.fn().mockReturnValue({}),
            getDonorAcknowledgement: jest.fn().mockReturnValue({}),
            getAnnualReportInfo: jest.fn().mockReturnValue({}),
            getLiveDashboardData: jest.fn().mockReturnValue({}),
        };

        const module: TestingModule = await Test.createTestingModule({
            controllers: [PublicFinanceController],
            providers: [{ provide: PublicFinanceService, useValue: service }],
        }).compile();

        controller = module.get<PublicFinanceController>(PublicFinanceController);
    });

    it('should be defined', () => expect(controller).toBeDefined());
    it('getSummary returns summary', () => expect(controller.getSummary(2025)).toBeDefined());
    it('getMajorExpenditures returns data', () => expect(controller.getMajorExpenditures(2025)).toBeDefined());
    it('getProjectReport returns report', () => expect(controller.getProjectReport('p1')).toBeDefined());
    it('getDonorAcknowledgement returns data', () => expect(controller.getDonorAcknowledgement()).toBeDefined());
    it('getDashboard returns dashboard', () => expect(controller.getDashboard()).toBeDefined());
});
