import { Test, TestingModule } from '@nestjs/testing';
import { PayrollController } from './payroll.controller';
import { PayrollService } from './payroll.service';

describe('PayrollController', () => {
    let controller: PayrollController;
    let service: PayrollService;

    const mockService = {
        calculateShiftPay: jest.fn(),
        calculateMonthlyPayroll: jest.fn(),
        getPayrollRecords: jest.fn(),
        updatePayrollStatus: jest.fn(),
        getRates: jest.fn(),
        updateRates: jest.fn(),
        generateReport: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [PayrollController],
            providers: [
                { provide: PayrollService, useValue: mockService },
            ],
        }).compile();

        controller = module.get<PayrollController>(PayrollController);
        service = module.get<PayrollService>(PayrollService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('calculateShiftPay', () => {
        it('should calculate pay for a single shift', async () => {
            const body = {
                date: '2026-01-07',
                startTime: '08:00',
                endTime: '16:00',
                hours: 8,
            };
            const payResult = { basePay: 800, bonuses: 100, total: 900 };
            mockService.calculateShiftPay.mockResolvedValue(payResult);

            const result = await controller.calculateShiftPay(body);

            expect(service.calculateShiftPay).toHaveBeenCalled();
            expect(result).toEqual(payResult);
        });
    });

    describe('calculateMonthlyPayroll', () => {
        it('should calculate monthly payroll for volunteer', async () => {
            const body = { shifts: [] };
            const payroll = { totalHours: 40, grandTotal: 4000 };
            mockService.calculateMonthlyPayroll.mockResolvedValue(payroll);

            const result = await controller.calculateMonthlyPayroll('v1', body);

            expect(service.calculateMonthlyPayroll).toHaveBeenCalledWith('v1', []);
            expect(result).toEqual(payroll);
        });
    });

    describe('getPayrollRecords', () => {
        it('should return payroll records for volunteer', async () => {
            const records = [{ id: 'p1', month: 1, year: 2026 }];
            mockService.getPayrollRecords.mockResolvedValue(records);

            const result = await controller.getPayrollRecords('v1');

            expect(service.getPayrollRecords).toHaveBeenCalledWith('v1');
            expect(result).toEqual(records);
        });
    });

    describe('updatePayrollStatus', () => {
        it('should update payroll record status', async () => {
            mockService.updatePayrollStatus.mockReturnValue(true);

            const result = await controller.updatePayrollStatus('p1', { status: 'approved' });

            expect(service.updatePayrollStatus).toHaveBeenCalledWith('p1', 'approved', undefined);
            expect(result).toEqual({ success: true });
        });
    });

    describe('getRates', () => {
        it('should return current payroll rates', async () => {
            const rates = { baseHourlyRate: 100, nightBonus: 50 };
            mockService.getRates.mockResolvedValue(rates);

            const result = await controller.getRates();

            expect(service.getRates).toHaveBeenCalled();
            expect(result).toEqual(rates);
        });
    });

    describe('updateRates', () => {
        it('should update payroll rates', async () => {
            const newRates = { baseHourlyRate: 120 };
            mockService.updateRates.mockReturnValue(undefined);

            const result = await controller.updateRates(newRates);

            expect(service.updateRates).toHaveBeenCalledWith(newRates);
            expect(result).toEqual({ success: true });
        });
    });

    describe('generateReport', () => {
        it('should generate monthly payroll report', async () => {
            const report = { month: 1, year: 2026, records: [] };
            mockService.generateReport.mockResolvedValue(report);

            const result = await controller.generateReport(1, 2026);

            expect(service.generateReport).toHaveBeenCalledWith(1, 2026);
            expect(result).toEqual(report);
        });
    });
});
