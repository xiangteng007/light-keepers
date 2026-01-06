import { apiClient } from './config';

export interface Shift {
    id: string;
    date: string;
    templateId: string;
    volunteerId: string;
    volunteerName: string;
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
    notes?: string;
}

export interface ShiftTemplate {
    id: string;
    name: string;
    startTime: string;
    endTime: string;
    color: string;
}

export interface CalendarDay {
    date: string;
    dayOfWeek: number;
    shifts: Shift[];
    totalVolunteers: number;
}

export const shiftCalendarApi = {
    // 取得日曆檢視
    getCalendarView: (startDate: string, endDate: string) =>
        apiClient.get('/shift-calendar/calendar', { params: { startDate, endDate } }),

    // 取得志工排班
    getVolunteerSchedule: (volunteerId: string, month: number, year: number) =>
        apiClient.get(`/shift-calendar/volunteer/${volunteerId}/${year}/${month}`),

    // 建立班次
    createShift: (data: {
        date: string;
        templateId: string;
        volunteerId: string;
        volunteerName: string;
        notes?: string;
    }) => apiClient.post('/shift-calendar/shifts', data),

    // 更新班次
    updateShift: (shiftId: string, updates: Partial<Shift>) =>
        apiClient.patch(`/shift-calendar/shifts/${shiftId}`, updates),

    // 刪除班次
    deleteShift: (shiftId: string) =>
        apiClient.delete(`/shift-calendar/shifts/${shiftId}`),

    // 交換班次
    swapShifts: (shiftId1: string, shiftId2: string) =>
        apiClient.post('/shift-calendar/swap', { shiftId1, shiftId2 }),

    // 複製週排班
    copyWeekSchedule: (sourceWeekStart: string, targetWeekStart: string) =>
        apiClient.post('/shift-calendar/copy-week', { sourceWeekStart, targetWeekStart }),

    // 取得空缺
    getVacancies: (date: string) =>
        apiClient.get(`/shift-calendar/vacancies/${date}`),

    // 取得班次模板
    getTemplates: () =>
        apiClient.get('/shift-calendar/templates'),
};
