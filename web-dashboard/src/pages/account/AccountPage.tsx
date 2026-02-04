/**
 * AccountPage - Main Component
 * 
 * Complete redesign of the /account page with:
 * - 2-column layout (desktop) / stacked layout (tablet/mobile)
 * - Tab navigation with 5 panels
 * - Responsive design with RWD breakpoints
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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

// Styles
import styles from './AccountPage.module.css';

// Tab configuration
const TABS: { id: TabId; label: string }[] = [
    { id: 'profile', label: '個人資料' },
    { id: 'volunteer', label: '志工/組織' },
    { id: 'security', label: '安全性' },
    { id: 'connected', label: '連結帳戶' },
    { id: 'preferences', label: '通知偏好' },
];

const AccountPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
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

    // Responsive detection
    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 1200);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Load account data
    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                // Merge mock data with actual user data
                const data = await simulateApiCall({
                    ...MOCK_ACCOUNT_DATA,
                    id: user?.id || MOCK_ACCOUNT_DATA.id,
                    email: user?.email || MOCK_ACCOUNT_DATA.email,
                    displayName: user?.displayName || MOCK_ACCOUNT_DATA.displayName,
                    avatarUrl: user?.avatarUrl || MOCK_ACCOUNT_DATA.avatarUrl,
                    roleLevel: user?.roleLevel ?? MOCK_ACCOUNT_DATA.roleLevel,
                    roleDisplayName: user?.roleDisplayName || MOCK_ACCOUNT_DATA.roleDisplayName,
                    lineLinked: user?.lineLinked ?? MOCK_ACCOUNT_DATA.lineLinked,
                    googleLinked: user?.googleLinked ?? MOCK_ACCOUNT_DATA.googleLinked,
                }, 500);
                setAccountData(data);
            } catch (error) {
                console.error('Failed to load account data:', error);
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
        console.log('Export data - feature coming soon');
    }, []);

    const handleLogout = useCallback(async () => {
        if (window.confirm('確定要登出嗎？')) {
            await logout();
            navigate('/login');
        }
    }, [logout, navigate]);

    // Profile panel handlers
    const handleSaveProfile = useCallback(async (formData: ProfileFormData) => {
        // TODO: Implement API call
        console.log('Saving profile:', formData);
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
        console.log(`Resending ${type} verification`);
        await simulateApiCall(null, 1000);
    }, []);

    // Security panel handlers
    const handleChangePassword = useCallback(async () => {
        // TODO: Implement password change flow
        console.log('Change password');
        await simulateApiCall(null, 500);
        alert('密碼重設信已發送至您的信箱');
    }, []);

    const handleToggle2FA = useCallback(async () => {
        // TODO: Implement 2FA toggle
        console.log('Toggle 2FA');
        await simulateApiCall(null, 500);
        setAccountData(prev => prev ? {
            ...prev,
            twoFactorEnabled: !prev.twoFactorEnabled,
        } : null);
    }, []);

    const handleRevokeSession = useCallback(async (sessionId: string) => {
        // TODO: Implement session revocation
        console.log('Revoke session:', sessionId);
        await simulateApiCall(null, 500);
        setAccountData(prev => prev ? {
            ...prev,
            activeSessions: prev.activeSessions.filter(s => s.id !== sessionId),
        } : null);
    }, []);

    const handleDeactivateAccount = useCallback(async () => {
        // TODO: Implement account deactivation
        console.log('Deactivate account');
        await simulateApiCall(null, 500);
    }, []);

    // Connected accounts handlers
    const handleConnectLine = useCallback(async () => {
        // TODO: Implement LINE OAuth
        console.log('Connect LINE - TODO');
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
        console.log('Disconnect LINE');
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
        console.log('Connect Google - TODO');
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
        console.log('Disconnect Google');
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
        console.log('Saving preferences:', prefs);
        await simulateApiCall(null, 500);
        setAccountData(prev => prev ? {
            ...prev,
            notifications: prefs,
        } : null);
    }, []);

    const handleResetPreferences = useCallback(() => {
        console.log('Reset preferences to default');
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
                        <User size={28} className={styles.pageTitleIcon} />
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

    return (
        <div className={styles.accountPage}>
            {/* Page Header */}
            <header className={styles.pageHeader}>
                <h1 className={styles.pageTitle}>
                    <User size={28} className={styles.pageTitleIcon} />
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
                    <nav className={styles.tabNavigation}>
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                className={`${styles.tabButton} ${activeTab === tab.id ? styles.tabButtonActive : ''}`}
                                onClick={() => handleTabChange(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </nav>

                    {/* Tab Content */}
                    <div className={styles.tabContent}>
                        {tabContent}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountPage;
