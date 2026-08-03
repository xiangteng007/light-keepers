/**
 * AccountPage - Main Component
 * 
 * Complete redesign of the /account page with:
 * - 2-column layout (desktop) / stacked layout (tablet/mobile)
 * - Tab navigation with 5 panels
 * - Responsive design with RWD breakpoints
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { UserIcon } from '../../design-system/icons';
import { useAuth } from '../../context/AuthContext';
import LoginModal from '../../components/auth/LoginModal';
import { Button } from '../../design-system';

// Components
import { AccountSummary } from './components/AccountSummary';
import { ProfilePanel } from './components/ProfilePanel';
import { VolunteerOrgPanel } from './components/VolunteerOrgPanel';
import { SecurityPanel } from './components/SecurityPanel';
import { ConnectedAccountsPanel } from './components/ConnectedAccountsPanel';
import { PreferencesPanel } from './components/PreferencesPanel';

// Types & Mock Data
import type { AccountData, TabId, ProfileFormData, NotificationPreferences } from './account.types';
import { MOCK_ACCOUNT_DATA, simulateApiCall } from './account.mock';

// Styles & Utilities
import styles from './AccountPage.module.css';
import { authLogger } from '../../utils/logger';
import { isDevModeUser } from '../../utils/devMode';

// Tab configuration
const TABS: { id: TabId; label: string }[] = [
    { id: 'profile', label: '個人資料' },
    { id: 'volunteer', label: '志工/組織' },
    { id: 'security', label: '安全性' },
    { id: 'connected', label: '連結帳戶' },
    { id: 'preferences', label: '通知偏好' },
];

const AccountPage: React.FC = () => {
    const { user, logout, isLoading: authLoading } = useAuth();
    const [searchParams, setSearchParams] = useSearchParams();

    // State
    const [accountData, setAccountData] = useState<AccountData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabId>(() => {
        const tabParam = searchParams.get('tab') as TabId;
        return TABS.some(t => t.id === tabParam) ? tabParam : 'profile';
    });
    const [isSummaryCollapsed, setIsSummaryCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1200);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);

    // Responsive detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1200);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Show login modal if not authenticated (after auth loading completes)
    useEffect(() => {
        // Check for dev mode - skip if dev mode is enabled (DEV build only)
        const devModeEnabled = isDevModeUser();
        // Wait for auth to finish loading before showing login
        if (!authLoading && !user && !devModeEnabled) {
            authLogger.debug('User not authenticated, showing login modal');
            setIsLoginModalOpen(true);
        }
    }, [user, authLoading]);

    // Load account data — try real API first, fallback to mock defaults
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Try fetching full profile from API
                const { default: api } = await import('../../api/client');
                // api/client 的 axios baseURL 已是 `${VITE_API_URL}/api/v1`，不可再加 `/api`。
                // 實際的個人資料端點：@Controller('auth') + @Get('me') → /api/v1/auth/me
                const response = await api.get('/auth/me');
                const apiData = response.data?.data || response.data || {};
                
                // Merge API data over user auth context
                const mergedData: AccountData = {
                    ...MOCK_ACCOUNT_DATA, // defaults for missing fields
                    ...apiData,
                    // Auth context always wins for core identity
                    id: user?.id || apiData.id || MOCK_ACCOUNT_DATA.id,
                    email: user?.email || apiData.email || MOCK_ACCOUNT_DATA.email,
                    displayName: user?.displayName || apiData.displayName || MOCK_ACCOUNT_DATA.displayName,
                    avatarUrl: user?.avatarUrl || apiData.avatarUrl,
                    roleLevel: user?.roleLevel ?? apiData.roleLevel ?? MOCK_ACCOUNT_DATA.roleLevel,
                    roleDisplayName: user?.roleDisplayName || apiData.roleDisplayName || MOCK_ACCOUNT_DATA.roleDisplayName,
                    lineLinked: user?.lineLinked ?? apiData.lineLinked ?? MOCK_ACCOUNT_DATA.lineLinked,
                    googleLinked: user?.googleLinked ?? apiData.googleLinked ?? MOCK_ACCOUNT_DATA.googleLinked,
                };
                setAccountData(mergedData);
            } catch (error) {
                authLogger.error('Failed to load account from API, using fallback:', error);
                // Fallback: use mock data merged with auth user
                const fallbackData: AccountData = {
                    ...MOCK_ACCOUNT_DATA,
                    id: user?.id || MOCK_ACCOUNT_DATA.id,
                    email: user?.email || MOCK_ACCOUNT_DATA.email,
                    displayName: user?.displayName || MOCK_ACCOUNT_DATA.displayName,
                    avatarUrl: user?.avatarUrl || MOCK_ACCOUNT_DATA.avatarUrl,
                    roleLevel: user?.roleLevel ?? MOCK_ACCOUNT_DATA.roleLevel,
                    roleDisplayName: user?.roleDisplayName || MOCK_ACCOUNT_DATA.roleDisplayName,
                    lineLinked: user?.lineLinked ?? MOCK_ACCOUNT_DATA.lineLinked,
                    googleLinked: user?.googleLinked ?? MOCK_ACCOUNT_DATA.googleLinked,
                };
                setAccountData(fallbackData);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [user]);

    // Tab change handler with URL persistence
    const handleTabChange = useCallback((tab: TabId) => {
        setActiveTab(tab);
        setSearchParams({ tab });
    }, [setSearchParams]);

    // Quick action handlers
    const handleEditProfile = useCallback(() => {
        handleTabChange('profile');
    }, [handleTabChange]);

    const handleSecuritySettings = useCallback(() => {
        handleTabChange('security');
    }, [handleTabChange]);

    const handleExportData = useCallback(() => {
        // TODO: Implement data export
        authLogger.debug('Export data - feature coming soon');
    }, []);

    const handleLogout = useCallback(async () => {
        if (window.confirm('確定要登出嗎？')) {
            await logout();
            // After logout, show login modal instead of navigating to non-existent route
            setIsLoginModalOpen(true);
        }
    }, [logout]);

    // Profile panel handlers
    const handleSaveProfile = useCallback(async (formData: ProfileFormData) => {
        // TODO: Implement API call
        authLogger.debug('Saving profile:', formData);
        await simulateApiCall(null, 1000);
        setAccountData(prev => prev ? {
            ...prev,
            displayName: formData.displayName,
            realName: formData.realName,
            nickname: formData.nickname,
            phone: formData.phone,
        } : null);
    }, []);

    const handleResendVerification = useCallback(async (type: 'email' | 'phone') => {
        // TODO: Implement verification resend
        authLogger.debug(`Resending ${type} verification`);
        await simulateApiCall(null, 1000);
    }, []);

    // Security panel handlers
    const handleChangePassword = useCallback(async () => {
        // TODO: Implement password change flow
        authLogger.debug('Change password requested');
        await simulateApiCall(null, 500);
        alert('密碼重設信已發送至您的信箱');
    }, []);

    const handleToggle2FA = useCallback(async () => {
        // TODO: Implement 2FA toggle
        authLogger.debug('Toggle 2FA requested');
        await simulateApiCall(null, 500);
        setAccountData(prev => prev ? {
            ...prev,
            twoFactorEnabled: !prev.twoFactorEnabled,
        } : null);
    }, []);

    const handleRevokeSession = useCallback(async (sessionId: string) => {
        // TODO: Implement session revocation
        authLogger.debug('Revoke session:', sessionId);
        await simulateApiCall(null, 500);
        setAccountData(prev => prev ? {
            ...prev,
            activeSessions: prev.activeSessions.filter(s => s.id !== sessionId),
        } : null);
    }, []);

    const handleDeactivateAccount = useCallback(async () => {
        // TODO: Implement account deactivation
        authLogger.debug('Deactivate account requested');
        await simulateApiCall(null, 500);
    }, []);

    // Connected accounts handlers
    const handleConnectLine = useCallback(async () => {
        // TODO: Implement LINE OAuth
        authLogger.debug('Connect LINE requested');
        await simulateApiCall(null, 1000);
        setAccountData(prev => prev ? {
            ...prev,
            lineLinked: true,
            lineLinkedAt: new Date().toISOString(),
            lineDisplayName: '測試用戶',
        } : null);
    }, []);

    const handleDisconnectLine = useCallback(async () => {
        if (!window.confirm('確定要解除 LINE 連結嗎？')) return;
        authLogger.debug('Disconnect LINE requested');
        await simulateApiCall(null, 500);
        setAccountData(prev => prev ? {
            ...prev,
            lineLinked: false,
            lineLinkedAt: undefined,
            lineDisplayName: undefined,
        } : null);
    }, []);

    const handleConnectGoogle = useCallback(async () => {
        // TODO: Implement Google OAuth
        authLogger.debug('Connect Google requested');
        await simulateApiCall(null, 1000);
        setAccountData(prev => prev ? {
            ...prev,
            googleLinked: true,
            googleLinkedAt: new Date().toISOString(),
            googleEmail: user?.email,
        } : null);
    }, [user?.email]);

    const handleDisconnectGoogle = useCallback(async () => {
        if (!window.confirm('確定要解除 Google 連結嗎？')) return;
        authLogger.debug('Disconnect Google requested');
        await simulateApiCall(null, 500);
        setAccountData(prev => prev ? {
            ...prev,
            googleLinked: false,
            googleLinkedAt: undefined,
            googleEmail: undefined,
        } : null);
    }, []);

    // Preferences handlers
    const handleSavePreferences = useCallback(async (prefs: NotificationPreferences) => {
        // TODO: Implement API call
        authLogger.debug('Saving preferences:', prefs);
        await simulateApiCall(null, 500);
        setAccountData(prev => prev ? {
            ...prev,
            notifications: prefs,
        } : null);
    }, []);

    const handleResetPreferences = useCallback(() => {
        authLogger.debug('Reset preferences to default');
    }, []);

    // Render tab content
    const tabContent = useMemo(() => {
        if (!accountData) return null;

        switch (activeTab) {
            case 'profile':
                return (
                    <ProfilePanel
                        data={accountData}
                        onSave={handleSaveProfile}
                        onResendVerification={handleResendVerification}
                    />
                );
            case 'volunteer':
                return <VolunteerOrgPanel data={accountData} />;
            case 'security':
                return (
                    <SecurityPanel
                        data={accountData}
                        onChangePassword={handleChangePassword}
                        onToggle2FA={handleToggle2FA}
                        onRevokeSession={handleRevokeSession}
                        onDeactivateAccount={handleDeactivateAccount}
                    />
                );
            case 'connected':
                return (
                    <ConnectedAccountsPanel
                        data={accountData}
                        onConnectLine={handleConnectLine}
                        onDisconnectLine={handleDisconnectLine}
                        onConnectGoogle={handleConnectGoogle}
                        onDisconnectGoogle={handleDisconnectGoogle}
                    />
                );
            case 'preferences':
                return (
                    <PreferencesPanel
                        data={accountData}
                        onSave={handleSavePreferences}
                        onReset={handleResetPreferences}
                    />
                );
            default:
                return null;
        }
    }, [
        activeTab,
        accountData,
        handleSaveProfile,
        handleResendVerification,
        handleChangePassword,
        handleToggle2FA,
        handleRevokeSession,
        handleDeactivateAccount,
        handleConnectLine,
        handleDisconnectLine,
        handleConnectGoogle,
        handleDisconnectGoogle,
        handleSavePreferences,
        handleResetPreferences,
    ]);

    // Loading state
    if (isLoading || !accountData) {
        return (
            <div className={styles.accountPage}>
                <header className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>
                        <UserIcon size={24} className={styles.pageTitleIcon} aria-hidden="true" />
                        我的帳戶
                    </h1>
                    <p className={styles.pageSubtitle}>管理您的個人資料、安全設定與連結帳戶</p>
                </header>
                <div className={styles.mainLayout}>
                    <div className={styles.leftColumn}>
                        <div className={`${styles.card} ${styles.skeleton}`} style={{ height: 480 }} />
                    </div>
                    <div className={styles.rightColumn}>
                        <div className={`${styles.tabNavigation} ${styles.skeleton}`} style={{ height: 52 }} />
                        <div className={`${styles.card} ${styles.skeleton}`} style={{ height: 400 }} />
                    </div>
                </div>
            </div>
        );
    }

    // Show login modal for unauthenticated users
    if (!user && !authLoading) {
        return (
            <div className={styles.accountPage}>
                <LoginModal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} />
                <header className={styles.pageHeader}>
                    <h1 className={styles.pageTitle}>
                        <UserIcon size={24} className={styles.pageTitleIcon} aria-hidden="true" />
                        我的帳戶
                    </h1>
                    <p className={styles.pageSubtitle}>請先登入以查看您的帳戶資訊</p>
                </header>
                <div className={styles.mainLayout}>
                    <div className={styles.leftColumn}>
                        <div className={styles.card} style={{ padding: '2rem', textAlign: 'center' }}>
                            <p style={{ marginBottom: '1rem' }}>您尚未登入</p>
                            <Button
                                variant="primary"
                                onClick={() => setIsLoginModalOpen(true)}
                            >
                                登入
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.accountPage}>
            {/* Page Header */}
            <header className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>
                    <UserIcon size={24} className={styles.pageTitleIcon} aria-hidden="true" />
                    我的帳戶
                </h1>
                <p className={styles.pageSubtitle}>管理您的個人資料、安全設定與連結帳戶</p>
            </header>

            {/* Main Layout */}
            <div className={styles.mainLayout}>
                {/* Left Column: Account Summary */}
                <div className={styles.leftColumn}>
                    <AccountSummary
                        data={accountData}
                        onEditProfile={handleEditProfile}
                        onSecuritySettings={handleSecuritySettings}
                        onExportData={handleExportData}
                        onLogout={handleLogout}
                        isCollapsed={isMobile ? isSummaryCollapsed : undefined}
                        onToggleCollapse={isMobile ? () => setIsSummaryCollapsed(!isSummaryCollapsed) : undefined}
                    />
                </div>

                {/* Right Column: Tab Content */}
                <div className={styles.rightColumn}>
                    {/* Tab Navigation */}
                    <nav className={styles.tabNavigation} role="tablist" aria-label="帳戶設定分頁">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                role="tab"
                                id={`account-tab-${tab.id}`}
                                aria-selected={activeTab === tab.id}
                                aria-controls={`account-tabpanel-${tab.id}`}
                                className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
                                onClick={() => handleTabChange(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    {/* Tab Content */}
                    <div
                        className={styles.tabContent}
                        role="tabpanel"
                        id={`account-tabpanel-${activeTab}`}
                        aria-labelledby={`account-tab-${activeTab}`}
                        tabIndex={0}
                    >
                        {tabContent}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountPage;
