import api from '../client';

// Health
export const getHealth = () => api.get('/health');

// Auth
export const login = (email: string, password: string) =>
    api.post('/auth/login', { email, password });

export const register = (data: { email?: string; phone?: string; password: string; displayName?: string }) =>
    api.post('/auth/register', data);

export const getProfile = () => api.get('/auth/me');

// Logout - clears refresh_token cookie on server
export const logout = () => api.post('/auth/logout');

// ===== OAuth Account Linking =====
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const getLineAuthUrl = () => `${API_BASE_URL}/api/v1/auth/line`;
export const getGoogleAuthUrl = () => `${API_BASE_URL}/api/v1/auth/google`;
export const unlinkLine = () => api.delete('/auth/link/line');
export const unlinkGoogle = () => api.delete('/auth/link/google');

// ===== Profile Update =====
export const updateProfile = (data: { displayName?: string; phone?: string }) =>
    api.patch('/auth/me', data);


// ===== OTP 驗證 =====

export const sendPhoneOtp = (phone: string) =>
    api.post<{ success: boolean; message: string }>('/auth/send-otp', { phone });

export const verifyPhoneOtp = (phone: string, code: string) =>
    api.post<{ success: boolean; verified: boolean }>('/auth/verify-otp', { phone, code });

// ===== LINE OTP 驗證 =====

export const sendLineOtp = () =>
    api.post<{ success: boolean; message: string }>('/auth/send-line-otp');

export const verifyLineOtp = (code: string) =>
    api.post<{ success: boolean; verified: boolean }>('/auth/verify-line-otp', { code });

// ===== Email OTP 驗證 =====

export const sendEmailOtp = (email: string) =>
    api.post<{ success: boolean; message: string }>('/auth/send-email-otp', { email });

export const verifyEmailOtp = (email: string, code: string) =>
    api.post<{ success: boolean; verified: boolean }>('/auth/verify-email-otp', { email, code });

// ===== 密碼重設 =====

export const forgotPassword = (data: { email?: string; phone?: string }) =>
    api.post<{ success: boolean; message: string }>('/auth/forgot-password', data);

export const resetPassword = (token: string, newPassword: string) =>
    api.post<{ success: boolean; message: string }>('/auth/reset-password', { token, newPassword });

// ===== 密碼設定 (OAuth 帳號) =====

export const hasPassword = () =>
    api.get<{ hasPassword: boolean }>('/auth/has-password');

export const setPassword = (newPassword: string) =>
    api.post<{ success: boolean }>('/auth/set-password', { newPassword });

// ===== 帳號狀態 =====

export interface AccountStatus {
    approvalStatus: 'pending' | 'approved' | 'rejected';
    phoneVerified: boolean;
    emailVerified: boolean;
    volunteerProfileCompleted: boolean;
    needsSetup: boolean;
}

export const getAccountStatus = () =>
    api.get<AccountStatus>('/auth/me/status');

export const markVolunteerProfileCompleted = () =>
    api.post<{ success: boolean }>('/auth/me/volunteer-profile-completed');

// ===== 帳號審核 (管理員) =====

export interface PendingAccount {
    id: string;
    email: string;
    phone: string;
    displayName: string;
    createdAt: string;
}

export const getPendingAccounts = () =>
    api.get<PendingAccount[]>('/accounts/pending');

export const approveAccount = (accountId: string) =>
    api.patch<{ success: boolean; message: string }>(`/accounts/${accountId}/approve`);

export const rejectAccount = (accountId: string, reason?: string) =>
    api.patch<{ success: boolean; message: string }>(`/accounts/${accountId}/reject`, { reason });

// 刪除帳號 (僅限 level 0)
export const deleteAccount = (accountId: string) =>
    api.delete<{ success: boolean; message: string }>(`/accounts/${accountId}`);

// 加入黑名單 (僅限 level 0)
export const blacklistAccount = (accountId: string, reason?: string) =>
    api.patch<{ success: boolean; message: string }>(`/accounts/${accountId}/blacklist`, { reason });

// Accounts
export const getRoles = () => api.get('/accounts/roles');

// Page Permissions (RBAC Single Source of Truth)
export interface PagePermission {
    id: string;
    pageKey: string;
    pageName: string;
    pagePath: string;
    requiredLevel: number;
    icon?: string;
    sortOrder: number;
    isVisible: boolean;
}

export const getPagePermissions = () =>
    api.get<PagePermission[]>('/accounts/page-permissions');

export const updatePagePermission = (pageKey: string, data: Partial<PagePermission>) =>
    api.patch<PagePermission>(`/accounts/page-permissions/${pageKey}`, data);


// 志工/帳號列表 (用於選擇指派對象)
export interface AccountSimple {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
    roleLevel: number;
}

export const getAccounts = () =>
    api.get<AccountSimple[]>('/accounts');
