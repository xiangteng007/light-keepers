/**
 * Account Page Mock Data
 * 
 * Mock data for development and testing.
 * Replace with actual API calls in production.
 */

import type { AccountData, NotificationPreferences } from './account.types';

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
    systemAnnouncements: { email: true, sms: false, line: true, push: true },
    taskAssignments: { email: true, sms: true, line: true, push: true },
    emergencyAlerts: { email: true, sms: true, line: true, push: true },
    weeklyDigest: true,
};

export const MOCK_ACCOUNT_DATA: AccountData = {
    id: 'user-001',
    email: 'xiangteng007@gmail.com',
    displayName: '開發測試用戶',
    realName: '王小明',
    nickname: '小明',
    phone: '0912-345-678',
    phoneVerified: true,
    emailVerified: true,
    avatarUrl: undefined,
    roleLevel: 5,
    roleDisplayName: '系統擁有者',
    roles: ['系統擁有者', '救災指揮官'],
    status: 'active',
    lastLoginAt: new Date().toISOString(),
    createdAt: '2024-01-15T08:00:00Z',

    // KPIs
    contributionPoints: 2450,
    serviceHours: 128,
    tasksCompleted: 47,
    recentContribution: 320,

    // Organizations
    organizations: [
        {
            id: 'org-001',
            name: '台北市救難協會',
            role: '副隊長',
            department: '第一大隊',
            joinedAt: '2023-03-01T00:00:00Z',
            isPrimary: true,
        },
        {
            id: 'org-002',
            name: '新北市義消總隊',
            role: '隊員',
            department: '板橋分隊',
            joinedAt: '2024-06-15T00:00:00Z',
            isPrimary: false,
        },
    ],

    // Certifications
    certifications: [
        {
            id: 'cert-001',
            name: 'EMT-1 急救技術員',
            issuer: '衛生福利部',
            issuedAt: '2023-05-20T00:00:00Z',
            expiresAt: '2026-05-20T00:00:00Z',
            status: 'valid',
        },
        {
            id: 'cert-002',
            name: '無人機操作證照',
            issuer: '民航局',
            issuedAt: '2024-01-10T00:00:00Z',
            status: 'valid',
        },
    ],

    // Badges
    badges: [
        {
            id: 'badge-001',
            name: '急救轉運',
            description: '完成急救轉運培訓並通過考核',
            category: 'skill',
            earnedAt: '2023-06-01T00:00:00Z',
            isEarned: true,
        },
        {
            id: 'badge-002',
            name: '物資管理',
            description: '具備物資調度與庫存管理能力',
            category: 'skill',
            earnedAt: '2023-08-15T00:00:00Z',
            isEarned: true,
        },
        {
            id: 'badge-003',
            name: '通訊協調',
            description: '熟悉無線電操作與通訊協調',
            category: 'skill',
            earnedAt: '2024-02-20T00:00:00Z',
            isEarned: true,
        },
        {
            id: 'badge-004',
            name: '百小時服務',
            description: '累計服務時數達100小時',
            category: 'achievement',
            earnedAt: '2024-09-01T00:00:00Z',
            isEarned: true,
        },
        {
            id: 'badge-005',
            name: '水域救援',
            description: '完成水域救援專業培訓',
            category: 'training',
            isEarned: false,
        },
        {
            id: 'badge-006',
            name: '高空繩索',
            description: '高空繩索救援專業認證',
            category: 'training',
            isEarned: false,
        },
    ],

    // Connected Accounts
    lineLinked: false,
    lineLinkedAt: undefined,
    googleLinked: true,
    googleLinkedAt: '2024-01-20T10:30:00Z',
    googleEmail: 'xiangteng007@gmail.com',

    // Security
    twoFactorEnabled: false,
    activeSessions: [
        {
            id: 'session-001',
            deviceName: 'Windows PC',
            deviceType: 'desktop',
            browser: 'Chrome 120',
            location: '台北市',
            ipAddress: '220.135.xxx.xxx',
            lastActiveAt: new Date().toISOString(),
            isCurrent: true,
        },
        {
            id: 'session-002',
            deviceName: 'iPhone 15',
            deviceType: 'mobile',
            browser: 'Safari',
            location: '新北市',
            ipAddress: '114.32.xxx.xxx',
            lastActiveAt: new Date(Date.now() - 3600000).toISOString(),
            isCurrent: false,
        },
    ],

    // Preferences
    notifications: DEFAULT_NOTIFICATION_PREFS,
};

// Helper to simulate API delay
export const simulateApiCall = <T>(data: T, delay = 800): Promise<T> => {
    return new Promise((resolve) => setTimeout(() => resolve(data), delay));
};
