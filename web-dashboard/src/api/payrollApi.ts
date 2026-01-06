import { apiClient } from './config';

export interface PayrollRecord {
    id: string;
    volunteerId: string;
    month: number;
    year: number;
    totalShifts: number;
    totalHours: number;
    totalBasePay: number;
    totalAllowances: number;
    grandTotal: number;
    status: 'pending' | 'approved' | 'paid' | 'rejected';
    createdAt: string;
    paidAt?: string;
}

export interface PayrollRates {
    baseHourlyRate: number;
    nightBonus: number;
    weekendBonus: number;
    hazardBonus: number;
    mealAllowance: number;
    transportAllowance: number;
}

export const payrollApi = {
    // 計算單次出勤補助
    calculateShiftPay: (shiftData: {
        date: string;
        startTime: string;
        endTime: string;
        hours: number;
        hazardous?: boolean;
    }) => apiClient.post('/payroll/calculate/shift', shiftData),

    // 計算月度薪資
    calculateMonthlyPayroll: (volunteerId: string, shifts: any[]) =>
        apiClient.post('/payroll/calculate/monthly', { volunteerId, shifts }),

    // 取得薪資記錄
    getRecords: (volunteerId: string) =>
        apiClient.get(`/payroll/records/${volunteerId}`),

    // 更新狀態
    updateStatus: (recordId: string, status: 'approved' | 'paid' | 'rejected', note?: string) =>
        apiClient.patch(`/payroll/records/${recordId}/status`, { status, note }),

    // 取得費率
    getRates: () =>
        apiClient.get('/payroll/rates'),

    // 更新費率
    updateRates: (updates: Partial<PayrollRates>) =>
        apiClient.patch('/payroll/rates', updates),

    // 產生報表
    generateReport: (month: number, year: number) =>
        apiClient.get(`/payroll/report/${year}/${month}`),
};
