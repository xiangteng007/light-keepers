import { apiClient } from './config';

export interface AttendanceCheckIn {
    volunteerId: string;
    method: 'gps' | 'qr';
    location?: { lat: number; lng: number; accuracy?: number };
    qrCode?: string;
}

export interface AttendanceRecord {
    id: string;
    volunteerId: string;
    date: string;
    checkInTime: string;
    checkOutTime?: string;
    hours?: number;
    method: 'gps' | 'qr';
    status: 'checked_in' | 'completed' | 'cancelled';
}

export const attendanceApi = {
    // GPS 打卡
    checkInGps: (volunteerId: string, location: { lat: number; lng: number; accuracy?: number }) =>
        apiClient.post('/attendance/check-in/gps', { volunteerId, location }),

    // QR 打卡
    checkInQr: (volunteerId: string, qrCode: string) =>
        apiClient.post('/attendance/check-in/qr', { volunteerId, qrCode }),

    // 簽退
    checkOut: (recordId: string, location?: { lat: number; lng: number }) =>
        apiClient.post(`/attendance/check-out/${recordId}`, { location }),

    // 取得志工出勤記錄
    getRecords: (volunteerId: string, params?: { startDate?: string; endDate?: string }) =>
        apiClient.get(`/attendance/records/${volunteerId}`, { params }),

    // 每日統計
    getDailySummary: (date: string) =>
        apiClient.get(`/attendance/summary/${date}`),

    // 月度報表
    getMonthlyReport: (volunteerId: string, month: number, year: number) =>
        apiClient.get(`/attendance/report/${volunteerId}/${year}/${month}`),

    // 產生 QR Code
    generateQrCode: (locationId: string, locationName: string) =>
        apiClient.post('/attendance/qr/generate', { locationId, locationName }),
};
