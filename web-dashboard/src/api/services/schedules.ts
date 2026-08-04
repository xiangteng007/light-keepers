import api from '../client';

// ===== 報表排程系統 Report Schedules =====

export type ScheduleReportType = 'volunteer_hours' | 'disaster' | 'inventory' | 'inventory_transaction' | 'activity_attendance';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly';
export type DeliveryMethod = 'email' | 'download' | 'storage';

export interface ReportSchedule {
    id: string;
    name: string;
    description?: string;
    reportType: ScheduleReportType;
    frequency: ScheduleFrequency;
    executeAt: string;
    dayOfWeek?: number;
    dayOfMonth?: number;
    isActive: boolean;
    periodType: string;
    deliveryMethod: DeliveryMethod;
    recipients?: string;
    outputFormat: 'csv' | 'json' | 'pdf';
    createdBy: string;
    lastExecutedAt?: string;
    nextExecuteAt?: string;
    executionCount: number;
    failureCount: number;
    lastError?: string;
    createdAt: string;
    updatedAt: string;
}

export interface ReportExecution {
    id: string;
    scheduleId: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    periodStart: string;
    periodEnd: string;
    startedAt?: string;
    completedAt?: string;
    durationMs?: number;
    outputPath?: string;
    fileSize?: number;
    errorMessage?: string;
    createdAt: string;
}

// 後端實際路由是 reports/scheduler（report-scheduler.controller.ts）；
// 舊前綴 /report-schedules 在後端不存在，所有呼叫都是 404。
// ⚠ 後端回傳形狀（enabled / type / cron schedule）與上方 ReportSchedule
//   介面（isActive / reportType / frequency）尚未對齊，此處僅修路徑與動詞。
const BASE = '/reports/scheduler';

// 取得所有報表排程
export const getReportSchedules = () =>
    api.get<{ success: boolean; data: ReportSchedule[]; count: number }>(BASE);

// 取得單一排程
export const getReportSchedule = (id: string) =>
    api.get<{ success: boolean; data: ReportSchedule }>(`${BASE}/${id}`);

// 取得報表產生記錄（後端僅有全域 history，無 per-schedule executions）
export const getScheduleExecutions = (limit?: number) =>
    api.get<{ success: boolean; data: ReportExecution[]; count: number }>(`${BASE}/history`, { params: { limit } });

// 建立排程
export const createReportSchedule = (data: Partial<ReportSchedule>) =>
    api.post<{ success: boolean; data: ReportSchedule }>(BASE, data);

// 更新排程
export const updateReportSchedule = (id: string, data: Partial<ReportSchedule>) =>
    api.put<{ success: boolean; data: ReportSchedule }>(`${BASE}/${id}`, data);

// 切換排程啟用狀態（後端是 enable/disable 兩個端點，需帶目標狀態）
export const toggleReportSchedule = (id: string, enable: boolean) =>
    api.post<{ success: boolean; message: string }>(`${BASE}/${id}/${enable ? 'enable' : 'disable'}`);

// 手動執行排程
export const executeReportSchedule = (id: string) =>
    api.post<{ success: boolean; data: ReportExecution }>(`${BASE}/${id}/run`);

// 刪除排程
export const deleteReportSchedule = (id: string) =>
    api.delete(`${BASE}/${id}`);
