/**
 * notification-hub.service.ts
 * Frontend Client for NotificationHub
 */
import { api } from '../api';

export interface NotificationPayload {
    title: string;
    body: string;
    urgency?: number;
    channels?: string[];
}

export const notificationHub = {
    broadcast: (payload: NotificationPayload) =>
        api.post('/notifications/broadcast', payload),

    getConfigs: () => api.get('/social-monitor/notifications'),

    // 取得歷史通知 (整合各種來源)
    getHistory: (params?: { limit?: number }) =>
        api.get('/notifications/history', { params }),
};
