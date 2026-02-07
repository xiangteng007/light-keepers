import api from '../client';

// ===== 志工管理 Volunteers =====

export type VolunteerStatus = 'available' | 'busy' | 'offline';

export interface Volunteer {
    id: string;
    name: string;
    email?: string;
    phone: string;
    region: string;
    address?: string;
    skills: string[];
    status: VolunteerStatus;
    serviceHours: number;
    taskCount: number;
    emergencyContact?: string;
    emergencyPhone?: string;
    photoUrl?: string;
    lineUserId?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CreateVolunteerDto {
    name: string;
    email?: string;
    phone: string;
    region: string;
    address?: string;
    skills: string[];
    emergencyContact?: string;
    emergencyPhone?: string;
    notes?: string;
    photoUrl?: string;
    accountId?: string; // 關聯的帳號 ID
}

export interface UpdateVolunteerDto extends Partial<CreateVolunteerDto> {
    status?: VolunteerStatus;
}

// 取得志工列表 (遮罩版)
export const getVolunteers = (params?: {
    status?: VolunteerStatus;
    region?: string;
    skill?: string;
    limit?: number;
    offset?: number;
}) => api.get<{ success: boolean; data: Volunteer[]; count: number }>('/volunteers', { params });

// 取得單一志工 (完整資料，需 Admin)
export const getVolunteer = (id: string) => api.get<{ success: boolean; data: Volunteer }>(`/volunteers/${id}`);

// 建立志工
export const createVolunteer = (data: CreateVolunteerDto) => api.post<Volunteer>('/volunteers', data);

// 更新志工
export const updateVolunteer = (id: string, data: UpdateVolunteerDto) =>
    api.patch<Volunteer>(`/volunteers/${id}`, data);

// 刪除志工
export const deleteVolunteer = (id: string) => api.delete(`/volunteers/${id}`);

// 更新志工狀態
export const updateVolunteerStatus = (id: string, status: VolunteerStatus) =>
    api.patch<Volunteer>(`/volunteers/${id}/status`, { status });

// 取得可用志工
export const getAvailableVolunteers = (region?: string, skill?: string) =>
    api.get<Volunteer[]>('/volunteers/available', { params: { region, skill } });

// ===== 志工位置追蹤 =====

export interface ActiveVolunteerLocation {
    assignmentId: string;
    volunteerId: string;
    volunteerName: string;
    taskTitle: string;
    status: string;
    lat: number;
    lng: number;
    lastLocationAt: string;
    checkInAt?: string;
}

// 取得進行中任務的志工位置
export const getActiveVolunteerLocations = () =>
    api.get<{ success: boolean; data: ActiveVolunteerLocation[]; count: number }>('/volunteer-locations/active');

// 更新志工位置（任務期間）
export const updateVolunteerLocation = (assignmentId: string, lat: number, lng: number) =>
    api.post<{ success: boolean; message: string }>(`/volunteer-locations/${assignmentId}/update`, { lat, lng });

// 取得志工位置歷史
export const getVolunteerLocationHistory = (volunteerId: string, limit?: number) =>
    api.get<{ success: boolean; data: any[] }>(`/volunteer-locations/volunteer/${volunteerId}`, { params: { limit } });


// 取得志工統計
export const getVolunteerStats = () => api.get<{
    success: boolean; data: {
        total: number;
        available: number;
        busy: number;
        offline: number;
        totalServiceHours: number;
    }
}>('/volunteers/stats');

// ===== 志工審核 =====

// 取得待審核志工列表
export const getPendingVolunteers = () =>
    api.get<{ success: boolean; data: Volunteer[]; count: number }>('/volunteers/pending');

// 取得待審核志工數量
export const getPendingVolunteerCount = () =>
    api.get<{ success: boolean; data: { count: number } }>('/volunteers/pending/count');

// 取得已審核通過的志工列表
export const getApprovedVolunteers = (params?: {
    status?: VolunteerStatus;
    region?: string;
    skill?: string;
    limit?: number;
    offset?: number;
}) => api.get<{ success: boolean; data: Volunteer[]; count: number }>('/volunteers/approved', { params });

// 審核通過志工
export const approveVolunteer = (id: string, approvedBy: string, note?: string) =>
    api.post<{ success: boolean; message: string; data: Volunteer }>(
        `/volunteers/${id}/approve`,
        { approvedBy, note }
    );

// 拒絕志工申請
export const rejectVolunteer = (id: string, rejectedBy: string, note?: string) =>
    api.post<{ success: boolean; message: string; data: Volunteer }>(
        `/volunteers/${id}/reject`,
        { rejectedBy, note }
    );
