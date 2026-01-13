/**
 * Account Page Types
 * 
 * TypeScript interfaces for the Account page redesign.
 * Designed for backward compatibility with existing API.
 */

// ============ Core Types ============

export type AccountStatus = 'active' | 'suspended' | 'pending';
export type TabId = 'profile' | 'volunteer' | 'security' | 'connected' | 'preferences';

// ============ Organization & Badges ============

export interface Organization {
    id: string;
    name: string;
    role?: string;
    department?: string;
    joinedAt: string;
    isPrimary: boolean;
}

export interface Certification {
    id: string;
    name: string;
    issuer: string;
    issuedAt: string;
    expiresAt?: string;
    status: 'valid' | 'expired' | 'pending';
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    iconUrl?: string;
    category: 'skill' | 'achievement' | 'service' | 'training';
    earnedAt?: string;
    isEarned: boolean;
}

// ============ Security ============

export interface Session {
    id: string;
    deviceName: string;
    deviceType: 'desktop' | 'mobile' | 'tablet';
    browser: string;
    location?: string;
    ipAddress: string;
    lastActiveAt: string;
    isCurrent: boolean;
}

// ============ Preferences ============

export interface NotificationChannel {
    email: boolean;
    sms: boolean;
    line: boolean;
    push: boolean;
}

export interface NotificationPreferences {
    systemAnnouncements: NotificationChannel;
    taskAssignments: NotificationChannel;
    emergencyAlerts: NotificationChannel;
    weeklyDigest: boolean;
}

// ============ Main Account Data ============

export interface AccountData {
    id: string;
    email: string;
    displayName: string;
    realName?: string;
    nickname?: string;
    phone?: string;
    phoneVerified: boolean;
    emailVerified: boolean;
    avatarUrl?: string;
    roleLevel: number;
    roleDisplayName: string;
    roles?: string[];
    status: AccountStatus;
    lastLoginAt?: string;
    createdAt: string;

    // KPIs
    contributionPoints: number;
    serviceHours: number;
    tasksCompleted: number;
    recentContribution?: number;

    // Organization
    organizations: Organization[];
    certifications: Certification[];
    badges: Badge[];

    // Connected Accounts
    lineLinked: boolean;
    lineLinkedAt?: string;
    lineDisplayName?: string;
    googleLinked: boolean;
    googleLinkedAt?: string;
    googleEmail?: string;

    // Security
    twoFactorEnabled: boolean;
    activeSessions: Session[];

    // Preferences
    notifications: NotificationPreferences;
}

// ============ Form State Types ============

export interface ProfileFormData {
    displayName: string;
    realName: string;
    nickname: string;
    phone: string;
}

export interface ProfileFormErrors {
    displayName?: string;
    realName?: string;
    nickname?: string;
    phone?: string;
}

// ============ Component Props ============

export interface AccountSummaryProps {
    data: AccountData;
    onEditProfile: () => void;
    onSecuritySettings: () => void;
    onExportData: () => void;
    onLogout: () => void;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
}

export interface ProfilePanelProps {
    data: AccountData;
    onSave: (formData: ProfileFormData) => Promise<void>;
    onResendVerification: (type: 'email' | 'phone') => Promise<void>;
}

export interface SecurityPanelProps {
    data: AccountData;
    onChangePassword: () => Promise<void>;
    onToggle2FA: () => Promise<void>;
    onRevokeSession: (sessionId: string) => Promise<void>;
    onDeactivateAccount: () => Promise<void>;
}

export interface ConnectedAccountsPanelProps {
    data: AccountData;
    onConnectLine: () => Promise<void>;
    onDisconnectLine: () => Promise<void>;
    onConnectGoogle: () => Promise<void>;
    onDisconnectGoogle: () => Promise<void>;
}

export interface PreferencesPanelProps {
    data: AccountData;
    onSave: (prefs: NotificationPreferences) => Promise<void>;
    onReset: () => void;
}

export interface VolunteerOrgPanelProps {
    data: AccountData;
}
