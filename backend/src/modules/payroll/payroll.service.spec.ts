import { Test, TestingModule } from '@nestjs/testing';
import { PayrollService } from './payroll.service';

describe('PayrollService', () => {
    let service: PayrollService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [PayrollService],
        }).compile();
        service = module.get(PayrollService);
    });

    it('should be defined', () => expect(service).toBeDefined());

    it('calculateShiftPay returns base calculation', () => {
        const pay = service.calculateShiftPay({ date: new Date('2024-01-03'), startTime: '09:00', endTime: '17:00', hours: 8 }); // Wednesday
        expect(pay.basePay).toBeGreaterThan(0);
        expect(pay.total).toBeGreaterThan(0);
        expect(pay.transportAllowance).toBe(150);
    });

    it('calculateShiftPay adds night bonus', () => {
        const pay = service.calculateShiftPay({ date: new Date('2024-01-03'), startTime: '23:00', endTime: '07:00', hours: 8 });
        expect(pay.bonuses.some(b => b.type === 'night')).toBe(true);
    });

    it('calculateShiftPay adds weekend bonus', () => {
        const pay = service.calculateShiftPay({ date: new Date('2024-01-06'), startTime: '09:00', endTime: '17:00', hours: 8 }); // Saturday
        expect(pay.bonuses.some(b => b.type === 'weekend')).toBe(true);
    });

    it('calculateShiftPay adds hazard bonus', () => {
        const pay = service.calculateShiftPay({ date: new Date('2024-01-03'), startTime: '09:00', endTime: '17:00', hours: 8, hazardous: true });
        expect(pay.bonuses.some(b => b.type === 'hazard')).toBe(true);
    });

    it('calculateShiftPay meal allowance for 4+ hours', () => {
        const long = service.calculateShiftPay({ date: new Date('2024-01-03'), startTime: '09:00', endTime: '13:00', hours: 4 });
        const short = service.calculateShiftPay({ date: new Date('2024-01-03'), startTime: '09:00', endTime: '12:00', hours: 3 });
        expect(long.mealAllowance).toBe(100);
        expect(short.mealAllowance).toBe(0);
    });

    it('calculateMonthlyPayroll returns record and details', () => {
        const shifts = [
            { date: new Date('2024-01-03'), startTime: '09:00', endTime: '17:00', hours: 8 },
            { date: new Date('2024-01-04'), startTime: '09:00', endTime: '17:00', hours: 8 },
        ];
        const result = service.calculateMonthlyPayroll('v1', shifts);
        expect(result.record.totalShifts).toBe(2);
        expect(result.details.length).toBe(2);
    });

    it('getPayrollRecords returns records', () => {
        service.calculateMonthlyPayroll('v1', [{ date: new Date(), startTime: '09:00', endTime: '17:00', hours: 8 }]);
        expect(service.getPayrollRecords('v1').length).toBe(1);
    });

    it('updatePayrollStatus updates record', () => {
        const r = service.calculateMonthlyPayroll('v1', [{ date: new Date(), startTime: '09:00', endTime: '17:00', hours: 8 }]);
        expect(service.updatePayrollStatus(r.record.id, 'approved')).toBe(true);
        expect(service.updatePayrollStatus(r.record.id, 'paid')).toBe(true);
    });

    it('getRates / updateRates works', () => {
        const rates = service.getRates();
        expect(rates.baseHourlyRate).toBe(200);
        service.updateRates({ baseHourlyRate: 300 });
        expect(service.getRates().baseHourlyRate).toBe(300);
    });

    it('generateReport returns report', () => {
        const report = service.generateReport(1, 2024);
        expect(report.month).toBe(1);
        expect(report.year).toBe(2024);
    });
});
