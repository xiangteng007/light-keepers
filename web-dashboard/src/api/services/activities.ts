import api from '../client';

// ===== 活動報名系統 Activities =====

export type ActivityCategory = 'training' | 'community' | 'drill' | 'volunteer' | 'other';
export type ActivityStatus = 'draft' | 'open' | 'closed' | 'cancelled' | 'completed';
export type RegistrationStatus = 'pending' | 'confirmed' | 'waitlist' | 'cancelled' | 'attended';

export interface Activity {
    id: string;
    title: string;
    description?: string;
    summary?: string;
    category: ActivityCategory;
    startAt: string;
    endAt: string;
    registrationDeadline?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    onlineUrl?: string;
    maxParticipants: number;
    currentParticipants: number;
    waitlistLimit: number;
    requireApproval: boolean;
    status: ActivityStatus;
    organizerId: string;
    organizerName?: string;
    contactPhone?: string;
    contactEmail?: string;
    coverImage?: string;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
}

export interface ActivityRegistration {
    id: string;
    activityId: string;
    activity?: Activity;
    userId: string;
    status: RegistrationStatus;
    userName: string;
    userPhone?: string;
    userEmail?: string;
    remarks?: string;
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNote?: string;
    attended: boolean;
    attendedAt?: string;
    waitlistPosition?: number;
    createdAt: string;
    updatedAt: string;
}

// 取得活動列表
export const getActivities = (params?: {
    category?: ActivityCategory;
    status?: ActivityStatus;
    upcoming?: boolean;
    limit?: number;
    offset?: number;
}) => api.get<{ success: boolean; data: Activity[]; count: number }>('/activities', { params });

// 取得單一活動
export const getActivity = (id: string) =>
    api.get<{ success: boolean; data: Activity }>(`/activities/${id}`);

// 取得活動統計
export const getActivityStats = (id: string) =>
    api.get<{ success: boolean; data: { confirmed: number; pending: number; waitlist: number; cancelled: number; attended: number } }>(`/activities/${id}/stats`);

// 建立活動
export const createActivity = (data: Partial<Activity>) =>
    api.post<{ success: boolean; data: Activity }>('/activities', data);

// 更新活動
export const updateActivity = (id: string, data: Partial<Activity>) =>
    api.patch<{ success: boolean; data: Activity }>(`/activities/${id}`, data);

// 發布活動
export const publishActivity = (id: string) =>
    api.patch<{ success: boolean; data: Activity }>(`/activities/${id}/publish`);

// 關閉報名
export const closeActivity = (id: string) =>
    api.patch<{ success: boolean; data: Activity }>(`/activities/${id}/close`);

// 取消活動
export const cancelActivity = (id: string) =>
    api.patch<{ success: boolean; data: Activity }>(`/activities/${id}/cancel`);

// 完成活動
export const completeActivity = (id: string) =>
    api.patch<{ success: boolean; data: Activity }>(`/activities/${id}/complete`);

// 報名活動
export const registerActivity = (id: string, data: {
    userId: string;
    userName: string;
    userPhone?: string;
    userEmail?: string;
    remarks?: string;
}) => api.post<{ success: boolean; data: ActivityRegistration }>(`/activities/${id}/register`, data);

// 取得活動報名列表
export const getActivityRegistrations = (id: string) =>
    api.get<{ success: boolean; data: ActivityRegistration[]; count: number }>(`/activities/${id}/registrations`);

// 取得用戶報名記錄
export const getUserActivityRegistrations = (userId: string) =>
    api.get<{ success: boolean; data: ActivityRegistration[]; count: number }>(`/activities/user/${userId}/registrations`);

// 審核報名
export const approveRegistration = (registrationId: string, reviewedBy: string, note?: string) =>
    api.patch<{ success: boolean; data: ActivityRegistration }>(`/activities/registrations/${registrationId}/approve`, { reviewedBy, note });

// 取消報名
export const cancelRegistration = (registrationId: string, userId: string) =>
    api.delete(`/activities/registrations/${registrationId}?userId=${userId}`);

// 簽到
export const markAttendance = (registrationId: string, attended: boolean) =>
    api.patch<{ success: boolean; data: ActivityRegistration }>(`/activities/registrations/${registrationId}/attendance`, { attended });
