import { Injectable, Logger } from '@nestjs/common';

/**
 * Payroll Service
 * Subsidy and fee calculation
 */
@Injectable()
export class PayrollService {
    private readonly logger = new Logger(PayrollService.name);
    private payrollRecords: Map<string, PayrollRecord> = new Map();
    private rates: PayrollRates = {
        baseHourlyRate: 200,
        nightBonus: 1.5,
        weekendBonus: 1.25,
        hazardBonus: 2.0,
        mealAllowance: 100,
        transportAllowance: 150,
    };

    /**
     * 計算單次出勤補助
     */
    calculateShiftPay(shift: ShiftData): PayCalculation {
        let hourlyRate = this.rates.baseHourlyRate;
        const bonuses: Bonus[] = [];

        // 夜班加成
        if (this.isNightShift(shift.startTime, shift.endTime)) {
            hourlyRate *= this.rates.nightBonus;
            bonuses.push({ type: 'night', multiplier: this.rates.nightBonus, reason: '夜間加成' });
        }

        // 周末加成
        if (this.isWeekend(shift.date)) {
            hourlyRate *= this.rates.weekendBonus;
            bonuses.push({ type: 'weekend', multiplier: this.rates.weekendBonus, reason: '假日加成' });
        }

        // 危險加成
        if (shift.hazardous) {
            hourlyRate *= this.rates.hazardBonus;
            bonuses.push({ type: 'hazard', multiplier: this.rates.hazardBonus, reason: '危險任務加成' });
        }

        const basePay = hourlyRate * shift.hours;
        const mealAllowance = shift.hours >= 4 ? this.rates.mealAllowance : 0;
        const transportAllowance = this.rates.transportAllowance;

        const total = basePay + mealAllowance + transportAllowance;

        return {
            basePay: Math.round(basePay),
            bonuses,
            mealAllowance,
            transportAllowance,
            total: Math.round(total),
            breakdown: {
                hourlyRate: Math.round(hourlyRate),
                hours: shift.hours,
            },
        };
    }

    /**
     * 計算月度薪資
     */
    calculateMonthlyPayroll(volunteerId: string, shifts: ShiftData[]): MonthlyPayroll {
        const calculations = shifts.map((s) => ({ shift: s, pay: this.calculateShiftPay(s) }));

        const totalBasePay = calculations.reduce((sum, c) => sum + c.pay.basePay, 0);
        const totalAllowances = calculations.reduce((sum, c) => sum + c.pay.mealAllowance + c.pay.transportAllowance, 0);
        const grandTotal = calculations.reduce((sum, c) => sum + c.pay.total, 0);
        const totalHours = shifts.reduce((sum, s) => sum + s.hours, 0);

        const record: PayrollRecord = {
            id: `payroll-${Date.now()}`,
            volunteerId,
            month: shifts[0]?.date.getMonth() + 1 || new Date().getMonth() + 1,
            year: shifts[0]?.date.getFullYear() || new Date().getFullYear(),
            totalShifts: shifts.length,
            totalHours,
            totalBasePay,
            totalAllowances,
            grandTotal,
            status: 'pending',
            createdAt: new Date(),
        };

        this.payrollRecords.set(record.id, record);

        return {
            record,
            details: calculations,
        };
    }

    /**
     * 取得薪資記錄
     */
    getPayrollRecords(volunteerId: string): PayrollRecord[] {
        return Array.from(this.payrollRecords.values())
            .filter((r) => r.volunteerId === volunteerId)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    /**
     * 更新狀態
     */
    updatePayrollStatus(recordId: string, status: 'approved' | 'paid' | 'rejected', note?: string): boolean {
        const record = this.payrollRecords.get(recordId);
        if (!record) return false;

        record.status = status;
        if (status === 'paid') record.paidAt = new Date();
        if (note) record.note = note;

        return true;
    }

    /**
     * 取得費率
     */
    getRates(): PayrollRates {
        return { ...this.rates };
    }

    /**
     * 更新費率
     */
    updateRates(updates: Partial<PayrollRates>): void {
        Object.assign(this.rates, updates);
    }

    /**
     * 產生報表
     */
    generateReport(month: number, year: number): PayrollReport {
        const records = Array.from(this.payrollRecords.values())
            .filter((r) => r.month === month && r.year === year);

        const byStatus: Record<string, number> = {};
        records.forEach((r) => {
            byStatus[r.status] = (byStatus[r.status] || 0) + 1;
        });

        return {
            month,
            year,
            totalRecords: records.length,
            totalAmount: records.reduce((sum, r) => sum + r.grandTotal, 0),
            totalHours: records.reduce((sum, r) => sum + r.totalHours, 0),
            byStatus,
            generatedAt: new Date(),
        };
    }

    private isNightShift(start: string, end: string): boolean {
        const startHour = parseInt(start.split(':')[0], 10);
        return startHour >= 22 || startHour < 6;
    }

    private isWeekend(date: Date): boolean {
        const day = date.getDay();
        return day === 0 || day === 6;
    }
}

// Types
interface PayrollRates { baseHourlyRate: number; nightBonus: number; weekendBonus: number; hazardBonus: number; mealAllowance: number; transportAllowance: number; }
interface ShiftData { date: Date; startTime: string; endTime: string; hours: number; hazardous?: boolean; }
interface Bonus { type: string; multiplier: number; reason: string; }
interface PayCalculation { basePay: number; bonuses: Bonus[]; mealAllowance: number; transportAllowance: number; total: number; breakdown: any; }
interface PayrollRecord { id: string; volunteerId: string; month: number; year: number; totalShifts: number; totalHours: number; totalBasePay: number; totalAllowances: number; grandTotal: number; status: string; createdAt: Date; paidAt?: Date; note?: string; }
interface MonthlyPayroll { record: PayrollRecord; details: { shift: ShiftData; pay: PayCalculation }[]; }
interface PayrollReport { month: number; year: number; totalRecords: number; totalAmount: number; totalHours: number; byStatus: Record<string, number>; generatedAt: Date; }
