import api from '../client';

// ===== 通知系統 Notifications =====

export type NotificationType = 'system' | 'assignment' | 'mobilization' | 'training' | 'alert';
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
    id: string;
    volunteerId?: string;
    type: NotificationType;
    priority: NotificationPriority;
    title: string;
    message: string;
    actionUrl?: string;
    relatedId?: string;
    isRead: boolean;
    readAt?: string;
    expiresAt?: string;
    createdAt: string;
}

// 取得通知列表
export const getNotifications = (volunteerId: string, params?: { unreadOnly?: boolean }) =>
    api.get<Notification[]>(`/notifications/${volunteerId}`, { params });

// 取得未讀數量
export const getUnreadCount = (volunteerId: string) =>
    api.get<{ count: number }>(`/notifications/${volunteerId}/unread-count`);

// 標記已讀
export const markNotificationAsRead = (id: string) =>
    api.patch<Notification>(`/notifications/${id}/read`);

// 標記全部已讀
export const markAllNotificationsAsRead = (volunteerId: string) =>
    api.patch<{ affected: number }>(`/notifications/${volunteerId}/read-all`);

// ===== 檔案上傳 Uploads =====

export interface UploadResult {
    url: string;
    filename: string;
    mimetype: string;
    size: number;
}

// 上傳單一檔案 (Base64)
export const uploadFile = (file: string, folder?: string) =>
    api.post<UploadResult>('/uploads', { file, folder });

// 批次上傳多個檔案
export const uploadFiles = (files: string[], folder?: string) =>
    api.post<UploadResult[]>('/uploads/bulk', { files, folder });
