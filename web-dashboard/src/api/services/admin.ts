import api from '../client';

// ===== 倉庫管理 Warehouses =====

export interface Warehouse {
    id: string;
    name: string;
    code: string;
    address?: string;
    contactPerson?: string;
    contactPhone?: string;
    isPrimary: boolean;
    isActive: boolean;
    notes?: string;
    latitude?: number;
    longitude?: number;
    createdAt: string;
    updatedAt: string;
}

// 取得所有倉庫
export const getWarehouses = () =>
    api.get<{ data: Warehouse[]; total: number }>('/warehouses');

// 取得主倉庫
export const getPrimaryWarehouse = () =>
    api.get<{ data: Warehouse | null }>('/warehouses/primary');

// 取得單一倉庫
export const getWarehouse = (id: string) =>
    api.get<{ data: Warehouse }>(`/warehouses/${id}`);

// 取得倉庫 (地圖用，有座標)
export const getWarehousesForMap = async () => {
    const res = await getWarehouses();
    // 過濾出有座標且啟用的倉庫
    return res.data.data.filter(w => w.isActive && w.latitude && w.longitude);
};

// ===== 公告系統 Announcements =====

export type AnnouncementCategory = 'disaster' | 'event' | 'training' | 'maintenance' | 'general';
export type AnnouncementStatus = 'draft' | 'published' | 'archived';
export type AnnouncementPriority = 'normal' | 'high' | 'urgent';

export interface Announcement {
    id: string;
    title: string;
    content: string;
    summary?: string;
    category: AnnouncementCategory;
    status: AnnouncementStatus;
    priority: AnnouncementPriority;
    isPinned: boolean;
    sortOrder: number;
    publishAt?: string;
    expireAt?: string;
    attachments?: string[];
    coverImage?: string;
    tags?: string[];
    authorId: string;
    authorName?: string;
    viewCount: number;
    sendNotification: boolean;
    notificationSent: boolean;
    createdAt: string;
    updatedAt: string;
    publishedAt?: string;
}

export interface CreateAnnouncementDto {
    title: string;
    content: string;
    summary?: string;
    category?: AnnouncementCategory;
    priority?: AnnouncementPriority;
    isPinned?: boolean;
    publishAt?: string;
    expireAt?: string;
    attachments?: string[];
    coverImage?: string;
    tags?: string[];
    sendNotification?: boolean;
    authorId: string;
    authorName?: string;
}

// 取得已發布公告（公開）
export const getAnnouncements = (params?: {
    category?: AnnouncementCategory;
    priority?: AnnouncementPriority;
    tag?: string;
    limit?: number;
    offset?: number;
}) => api.get<{ success: boolean; data: Announcement[]; count: number }>('/announcements', { params });

// 取得單一公告
export const getAnnouncement = (id: string) =>
    api.get<{ success: boolean; data: Announcement }>(`/announcements/${id}`);

// 取得分類統計
export const getAnnouncementCategoryStats = () =>
    api.get<{ success: boolean; data: Record<AnnouncementCategory, number> }>('/announcements/stats/categories');

// 取得所有公告（管理員）
export const getAllAnnouncements = (params?: {
    status?: AnnouncementStatus;
    category?: AnnouncementCategory;
    limit?: number;
    offset?: number;
}) => api.get<{ success: boolean; data: Announcement[]; count: number }>('/announcements/admin/all', { params });

// 建立公告
export const createAnnouncement = (data: CreateAnnouncementDto) =>
    api.post<{ success: boolean; data: Announcement }>('/announcements', data);

// 更新公告
export const updateAnnouncement = (id: string, data: Partial<CreateAnnouncementDto> & { status?: AnnouncementStatus }) =>
    api.patch<{ success: boolean; data: Announcement }>(`/announcements/${id}`, data);

// 發布公告
export const publishAnnouncement = (id: string) =>
    api.patch<{ success: boolean; data: Announcement }>(`/announcements/${id}/publish`);

// 取消發布公告
export const unpublishAnnouncement = (id: string) =>
    api.patch<{ success: boolean; data: Announcement }>(`/announcements/${id}/unpublish`);

// 封存公告
export const archiveAnnouncement = (id: string) =>
    api.patch<{ success: boolean; data: Announcement }>(`/announcements/${id}/archive`);

// 切換置頂
export const togglePinAnnouncement = (id: string) =>
    api.patch<{ success: boolean; data: Announcement }>(`/announcements/${id}/pin`);

// 刪除公告
export const deleteAnnouncement = (id: string) =>
    api.delete(`/announcements/${id}`);
