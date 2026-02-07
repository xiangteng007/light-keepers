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

// 取得所有報表排程
export const getReportSchedules = () =>
    api.get<{ success: boolean; data: ReportSchedule[]; count: number }>('/report-schedules');

// 取得單一排程
export const getReportSchedule = (id: string) =>
    api.get<{ success: boolean; data: ReportSchedule }>(`/report-schedules/${id}`);

// 取得排程執行記錄
export const getScheduleExecutions = (id: string, limit?: number) =>
    api.get<{ success: boolean; data: ReportExecution[]; count: number }>(`/report-schedules/${id}/executions`, { params: { limit } });

// 建立排程
export const createReportSchedule = (data: Partial<ReportSchedule>) =>
    api.post<{ success: boolean; data: ReportSchedule }>('/report-schedules', data);

// 更新排程
export const updateReportSchedule = (id: string, data: Partial<ReportSchedule>) =>
    api.patch<{ success: boolean; data: ReportSchedule }>(`/report-schedules/${id}`, data);

// 切換排程啟用狀態
export const toggleReportSchedule = (id: string) =>
    api.patch<{ success: boolean; data: ReportSchedule }>(`/report-schedules/${id}/toggle`);

// 手動執行排程
export const executeReportSchedule = (id: string) =>
    api.post<{ success: boolean; data: ReportExecution }>(`/report-schedules/${id}/execute`);

// 刪除排程
export const deleteReportSchedule = (id: string) =>
    api.delete(`/report-schedules/${id}`);
