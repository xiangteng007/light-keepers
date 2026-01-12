/**
 * analytics-hub.service.ts
 * Frontend Client for AnalyticsHub
 */
import api from '../api';

export interface ReportRequest {
    type: 'incident' | 'volunteer' | 'resource' | 'aar';
    format: 'pdf' | 'csv' | 'json';
    dateRange?: { from: string; to: string };
}

export const analyticsHub = {
    generateReport: (request: ReportRequest) =>
        api.post('/analytics/reports', request),

    getDashboardStats: () =>
        api.get('/analytics/dashboard/stats'),

    getRecentReports: () =>
        api.get('/analytics/reports/recent'),

    downloadReport: (reportId: string) =>
        api.get(`/analytics/reports/download/${reportId}`),
};
