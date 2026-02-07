import api from '../client';

// ===== 回報系統 Reports =====

export type ReportType = 'earthquake' | 'flood' | 'fire' | 'typhoon' | 'landslide' | 'traffic' | 'infrastructure' | 'other';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReportStatus = 'pending' | 'confirmed' | 'rejected';
export type ReportSource = 'web' | 'line';

export interface Report {
    id: string;
    type: ReportType;
    severity: ReportSeverity;
    status: ReportStatus;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    address?: string;
    photos?: string[];
    contactName?: string;
    contactPhone?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNote?: string;
    // 來源追蹤
    source?: ReportSource;
    reporterLineUserId?: string;
    reporterLineDisplayName?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateReportDto {
    type: ReportType;
    severity?: ReportSeverity;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    address?: string;
    photos?: string[];
    contactName?: string;
    contactPhone?: string;
}

export interface ReviewReportDto {
    status: 'confirmed' | 'rejected';
    reviewedBy: string;
    reviewNote?: string;
}

// 取得回報列表
export const getReports = (params?: {
    status?: ReportStatus;
    type?: ReportType;
    severity?: ReportSeverity;
    limit?: number;
    offset?: number
}) => api.get<{ success: boolean; data: Report[]; count: number }>('/reports', { params });

// 取得單一回報
export const getReport = (id: string) => api.get<Report>(`/reports/${id}`);

// 建立回報
export const createReport = (data: CreateReportDto) => api.post<Report>('/reports', data);

// 審核回報
export const reviewReport = (id: string, data: ReviewReportDto) =>
    api.patch<Report>(`/reports/${id}/review`, data);

// 刪除回報
export const deleteReport = (id: string) => api.delete(`/reports/${id}`);

// 取得地圖用回報
export const getReportsForMap = () => api.get<Report[]>('/reports/map');

// 取得回報統計
export const getReportStats = () => api.get<{
    success: boolean; data: {
        total: number;
        pending: number;
        confirmed: number;
        rejected: number;
        byType: Record<string, number>;
    }
}>('/reports/stats');

// 災情熱點分析
export interface HotspotData {
    gridId: string;
    centerLat: number;
    centerLng: number;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    types: Record<string, number>;
    recentReports: Array<{ id: string; title: string; type: string; createdAt: string }>;
}

export interface HotspotsResponse {
    hotspots: HotspotData[];
    totalReports: number;
    generatedAt: string;
}

export const getHotspots = (params?: { gridSizeKm?: number; minCount?: number; days?: number }) =>
    api.get<{ success: boolean; data: HotspotsResponse }>('/reports/analysis/hotspots', { params });

// 回報趨勢數據
export interface TrendData {
    labels: string[];
    datasets: { label: string; data: number[] }[];
}

export const getReportTrend = (days?: number) =>
    api.get<{ success: boolean; data: TrendData }>('/reports/analysis/trend', { params: { days } });

// 區域分佈統計
export interface RegionData {
    regions: string[];
    values: number[];
}

export const getRegionStats = (days?: number) =>
    api.get<{ success: boolean; data: RegionData }>('/reports/analysis/regions', { params: { days } });

// 時段分佈統計
export interface HourlyData {
    hours: number[];
    values: number[];
}

export const getHourlyStats = (days?: number) =>
    api.get<{ success: boolean; data: HourlyData }>('/reports/analysis/hourly', { params: { days } });
