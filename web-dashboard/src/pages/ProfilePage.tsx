import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Settings, Mail, Shield, LinkIcon, Bell, Lock, LogOut, ClipboardList, CheckCircle2, XCircle } from 'lucide-react';
import { createVolunteer } from '../api/services';
import { Alert, Badge, Button, Modal } from '../design-system';
import type { LkIcon } from '../design-system/icons';
import {
    AedIcon,
    SearchIcon,
    InventoryIcon,
    FlaskIcon,
    RadioIcon,
    VehicleIcon,
    BuildingIcon,
    SupportIcon,
    CheckIcon,
    LockIcon,
} from '../design-system/icons';
import './ProfilePage.css';
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';

// LINE Login Config
const LINE_CLIENT_ID = import.meta.env.VITE_LINE_CLIENT_ID || '';
const LINE_REDIRECT_URI = `${window.location.origin}/profile?action=bind-line`;

// Google Login Config  
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GOOGLE_REDIRECT_URI = `${window.location.origin}/profile?action=bind-google`;

// 志工技能選項（R5/T5c：icon 改 B3c 教範圖例，取最接近語意者）
const SKILL_OPTIONS: Array<{ value: string; label: string; Icon: LkIcon }> = [
    { value: 'medical', label: '醫療救護', Icon: AedIcon },
    { value: 'rescue', label: '搜救救難', Icon: SearchIcon },
    { value: 'logistics', label: '物資運送', Icon: InventoryIcon },
    { value: 'cooking', label: '炑事料理', Icon: FlaskIcon },
    { value: 'communication', label: '通訊聯絡', Icon: RadioIcon },
    { value: 'driving', label: '駕駛運輸', Icon: VehicleIcon },
    { value: 'construction', label: '土木修繕', Icon: BuildingIcon },
    { value: 'social', label: '社工關懷', Icon: SupportIcon },
];

export default function ProfilePage() {
    const navigate = useNavigate();
    const { user, logout, refreshUser } = useAuth();
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'notifications' | 'volunteer'>('profile');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Profile form data
    const [formData, setFormData] = useState({
        displayName: user?.displayName || '',
        email: user?.email || '',
    });

    // Notification preferences
    const [preferences, setPreferences] = useState({
        alertNotifications: true,
        taskNotifications: true,
        trainingNotifications: true,
    });


    // Password management
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [hasPassword, setHasPassword] = useState<boolean | null>(null);  // null = loading
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
    });
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    // 志工登記表單狀態
    const [volunteerForm, setVolunteerForm] = useState({
        name: '',
        phone: '',
        email: user?.email || '',
        region: '',
        address: '',
        skills: [] as string[],
        emergencyContact: '',
        emergencyPhone: '',
        notes: '',
    });
    const [isVolunteerSubmitting, setIsVolunteerSubmitting] = useState(false);
    const [volunteerSubmitted, setVolunteerSubmitted] = useState(false);

    // Fetch preferences and password status on mount
    useEffect(() => {
        fetchPreferences();
        checkHasPassword();
    }, []);

    // Check if account has password
    const checkHasPassword = async () => {
        try {
            const { data } = await api.get('/auth/has-password');
            setHasPassword(data.hasPassword);
        } catch (err) {
            console.error('Failed to check password status:', err);
        }
    };

    // Handle OAuth callback for binding
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const action = urlParams.get('action');
        const code = urlParams.get('code');

        if (action === 'bind-line' && code) {
            handleLineBindCallback(code);
        } else if (action === 'bind-google' && code) {
            handleGoogleBindCallback(code);
        }
    }, []);

    // Fetch notification preferences
    const fetchPreferences = async () => {
        try {
            const { data } = await api.get('/auth/preferences');
            setPreferences(data);
        } catch (err) {
            console.error('Failed to fetch preferences:', err);
        }
    };

    // Handle preference change
    const handlePreferenceChange = async (key: keyof typeof preferences, value: boolean) => {
        const newPreferences = { ...preferences, [key]: value };
        setPreferences(newPreferences);

        try {
            await api.patch('/auth/preferences', { [key]: value });
            setMessage({ type: 'success', text: '通知偏好已更新' });
            setTimeout(() => setMessage(null), 2000);
        } catch (err) {
            setMessage({ type: 'error', text: getApiErrorMessage(err, '更新失敗') });
            setPreferences(preferences); // Revert
        }
    };

    // Handle password change (for accounts with existing password)
    const handleChangePassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: '新密碼與確認密碼不符' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: '新密碼至少需要 6 個字元' });
            return;
        }

        setIsChangingPassword(true);
        try {
            await api.post('/auth/change-password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword,
            });
            setMessage({ type: 'success', text: '密碼已成功變更！' });
            setShowPasswordModal(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (err) {
            setMessage({ type: 'error', text: getApiErrorMessage(err, '密碼變更失敗，請稍後再試') });
        } finally {
            setIsChangingPassword(false);
        }
    };

    // Handle set password (for OAuth accounts without password)
    const handleSetPassword = async () => {
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: '新密碼與確認密碼不符' });
            return;
        }

        if (passwordData.newPassword.length < 6) {
            setMessage({ type: 'error', text: '密碼至少需要 6 個字元' });
            return;
        }

        setIsChangingPassword(true);
        try {
            await api.post('/auth/set-password', {
                newPassword: passwordData.newPassword,
            });
            setMessage({ type: 'success', text: '密碼設定成功！現在您可以使用 Email/密碼登入' });
            setShowPasswordModal(false);
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
            setHasPassword(true);  // Update state
        } catch (err) {
            setMessage({ type: 'error', text: getApiErrorMessage(err, '密碼設定失敗，請稍後再試') });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleLineBindCallback = async (code: string) => {
        try {
            // 使用專門的綁定端點（需要認證）
            const { data } = await api.post('/auth/line/bind-callback', { code, redirectUri: LINE_REDIRECT_URI });
            setMessage({ type: 'success', text: `LINE 帳號綁定成功！(${data.lineDisplayName || ''})` });
            await refreshUser();
        } catch (err) {
            console.error('LINE binding error:', err);
            setMessage({ type: 'error', text: getApiErrorMessage(err, 'LINE 帳號綁定失敗，請稍後再試') });
        } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };


    const handleGoogleBindCallback = async (code: string) => {
        try {
            // 使用專門的綁定端點（需要認證）
            const { data } = await api.post('/auth/google/bind-callback', { code, redirectUri: GOOGLE_REDIRECT_URI });
            setMessage({ type: 'success', text: `Google 帳號綁定成功！(${data.googleEmail || ''})` });
            await refreshUser();
        } catch (err) {
            console.error('Google binding error:', err);
            setMessage({ type: 'error', text: getApiErrorMessage(err, 'Google 帳號綁定失敗，請稍後再試') });
        } finally {
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    };

    const handleLineBind = () => {
        if (!LINE_CLIENT_ID) {
            setMessage({ type: 'error', text: 'LINE 綁定尚未設定' });
            return;
        }
        const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?response_type=code&client_id=${LINE_CLIENT_ID}&redirect_uri=${encodeURIComponent(LINE_REDIRECT_URI)}&state=line-bind&scope=profile%20openid`;
        window.location.href = lineAuthUrl;
    };

    const handleGoogleBind = () => {
        if (!GOOGLE_CLIENT_ID) {
            setMessage({ type: 'error', text: 'Google 綁定尚未設定' });
            return;
        }
        const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${encodeURIComponent(GOOGLE_REDIRECT_URI)}&state=google-bind&scope=openid%20email%20profile`;
        window.location.href = googleAuthUrl;
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            await api.patch('/auth/profile', {
                displayName: formData.displayName,
            });
            setMessage({ type: 'success', text: '個人資料更新成功！' });
            setIsEditing(false);
            await refreshUser();
        } catch (err) {
            setMessage({ type: 'error', text: getApiErrorMessage(err, '更新失敗，請稍後再試') });
        } finally {
            setIsSaving(false);
        }
    };

    // 志工技能選擇切換
    const toggleSkill = (skillValue: string) => {
        setVolunteerForm(prev => ({
            ...prev,
            skills: prev.skills.includes(skillValue)
                ? prev.skills.filter(s => s !== skillValue)
                : [...prev.skills, skillValue]
        }));
    };

    // 志工登記綁定檢查
    const hasLineBinding = !!user?.lineLinked;
    const hasGoogleBinding = !!user?.googleLinked;
    const canRegisterVolunteer = hasLineBinding && hasGoogleBinding;

    // 提交志工申請
    const handleVolunteerSubmit = async () => {
        if (!volunteerForm.name || !volunteerForm.phone || !volunteerForm.region || !volunteerForm.emergencyContact || !volunteerForm.emergencyPhone) {
            setMessage({ type: 'error', text: '請填寫必填欄位：姓名、電話、所在地區、緊急聯絡人、緊急聯絡電話' });
            return;
        }

        setIsVolunteerSubmitting(true);
        try {
            await createVolunteer({
                ...volunteerForm,
                accountId: user?.id,
            });
            setVolunteerSubmitted(true);
            setMessage({ type: 'success', text: '志工登記申請已送出！' });
        } catch (err) {
            console.error('Failed to register volunteer:', err);
            setMessage({ type: 'error', text: '登記失敗，請稍後再試' });
        } finally {
            setIsVolunteerSubmitting(false);
        }
    };

    const tabs = [
        { id: 'profile' as const, label: '個人資料', icon: User },
        { id: 'security' as const, label: '安全設定', icon: Shield },
        { id: 'notifications' as const, label: '通知偏好', icon: Bell },
        // 只要尚未提交志工申請的用戶都顯示志工登記 Tab (不論權限等級)
        ...((!volunteerSubmitted && !user?.volunteerProfileCompleted) ? [{ id: 'volunteer' as const, label: '志工登記', icon: ClipboardList }] : []),
    ];

    return (
        <div className="profile-page">
            <header className="profile-header">
                <h1><Settings size={28} aria-hidden="true" /> 個人設定</h1>
                <p>管理您的帳號資訊和偏好設定</p>
            </header>

            {message && (
                <Alert
                    variant={message.type === 'success' ? 'success' : 'danger'}
                    closable
                    onClose={() => setMessage(null)}
                >
                    {message.text}
                </Alert>
            )}

            <div className="profile-content">
                <div className="profile-sidebar">
                    <div className="profile-avatar-section">
                        <div className="profile-avatar">
                            {user?.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.displayName || '用戶'} />
                            ) : (
                                <User size={40} />
                            )}
                        </div>
                        <h3>{user?.displayName || user?.email || '用戶'}</h3>
                        <span className="profile-role">{user?.roleDisplayName || '登記志工'}</span>
                    </div>

                    <nav className="profile-nav">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`profile-nav-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <tab.icon size={18} />
                                {tab.label}
                            </button>
                        ))}
                        <button
                            className="profile-nav-item profile-nav-item--danger"
                            onClick={async () => {
                                await logout();
                                navigate('/login');
                            }}
                        >
                            <LogOut size={18} />
                            登出
                        </button>
                    </nav>
                </div>

                <div className="profile-main">
                    {activeTab === 'profile' && (
                        <div className="profile-section">
                            <div className="profile-section-header">
                                <h2>個人資料</h2>
                                {!isEditing ? (
                                    <Button variant="secondary" onClick={() => setIsEditing(true)}>
                                        編輯
                                    </Button>
                                ) : (
                                    <div className="profile-section-actions">
                                        <Button variant="secondary" onClick={() => setIsEditing(false)}>
                                            取消
                                        </Button>
                                        <Button
                                            variant="primary"
                                            onClick={handleSave}
                                            disabled={isSaving}
                                        >
                                            {isSaving ? '儲存中...' : '儲存'}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            <div className="profile-form">
                                <div className="profile-form-group">
                                    <label><User size={16} /> 顯示名稱</label>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            value={formData.displayName}
                                            onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                                            placeholder="請輸入顯示名稱"
                                        />
                                    ) : (
                                        <div className="profile-value">{user?.displayName || '未設定'}</div>
                                    )}
                                </div>

                                <div className="profile-form-group">
                                    <label><Mail size={16} /> 電子郵件</label>
                                    <div className="profile-value">{user?.email || '未設定'}</div>
                                </div>

                                <div className="profile-form-group">
                                    <label><Shield size={16} aria-hidden="true" /> 身份</label>
                                    <div className="profile-value">
                                        <Badge variant="info" size="sm">{user?.roleDisplayName || '登記志工'}</Badge>
                                    </div>
                                </div>
                            </div>

                            <div className="profile-section-divider" />

                            <h3><LinkIcon size={18} aria-hidden="true" /> 綁定帳號</h3>
                            <div className="profile-linked-accounts">
                                <div className="linked-account">
                                    <div className="linked-account-info">
                                        {/* Official LINE brand mark color (#06C755) — third-party brand color, no token equivalent */}
                                        <svg viewBox="0 0 24 24" width="24" height="24" fill="#06C755">
                                            <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.629.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
                                        </svg>
                                        <div>
                                            <span className="linked-account-name">LINE</span>
                                            <span className="linked-account-status">
                                                {user?.lineLinked ? '已綁定' : '未綁定'}
                                            </span>
                                        </div>
                                    </div>
                                    {!user?.lineLinked && (
                                        <Button variant="secondary" onClick={handleLineBind}>
                                            綁定
                                        </Button>
                                    )}
                                </div>

                                <div className="linked-account">
                                    <div className="linked-account-info">
                                        {/* Official Google logo colors — third-party brand colors, no token equivalent */}
                                        <svg viewBox="0 0 24 24" width="24" height="24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                        </svg>
                                        <div>
                                            <span className="linked-account-name">Google</span>
                                            <span className="linked-account-status">
                                                {user?.googleLinked ? '已綁定' : '未綁定'}
                                            </span>
                                        </div>
                                    </div>
                                    {!user?.googleLinked && (
                                        <Button variant="secondary" onClick={handleGoogleBind}>
                                            綁定
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="profile-section">
                            <h2><Lock size={20} /> 安全設定</h2>
                            <div className="profile-form">
                                <div className="security-item">
                                    <div className="security-item-info">
                                        {hasPassword ? (
                                            <>
                                                <h4>變更密碼</h4>
                                                <p>定期更換密碼以保護帳號安全</p>
                                            </>
                                        ) : (
                                            <>
                                                <h4>設定密碼</h4>
                                                <p>您透過 LINE/Google 登入，尚未設定密碼。設定後可使用 Email/密碼登入</p>
                                            </>
                                        )}
                                    </div>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setShowPasswordModal(true)}
                                        disabled={hasPassword === null}
                                    >
                                        {hasPassword === null ? '載入中...' : hasPassword ? '變更密碼' : '設定密碼'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'notifications' && (
                        <div className="profile-section">
                            <h2><Bell size={20} /> 通知偏好</h2>
                            <p className="profile-section-desc">設定您希望接收的通知類型</p>
                            <div className="notification-settings">
                                <div className="notification-setting">
                                    <div>
                                        <h4>災害示警通知</h4>
                                        <p>接收 NCDR 災害示警即時推播</p>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={preferences.alertNotifications}
                                            onChange={(e) => handlePreferenceChange('alertNotifications', e.target.checked)}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="notification-setting">
                                    <div>
                                        <h4>任務指派通知</h4>
                                        <p>當有新任務指派給您時收到通知</p>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={preferences.taskNotifications}
                                            onChange={(e) => handlePreferenceChange('taskNotifications', e.target.checked)}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                                <div className="notification-setting">
                                    <div>
                                        <h4>培訓課程通知</h4>
                                        <p>接收新課程和培訓活動通知</p>
                                    </div>
                                    <label className="toggle">
                                        <input
                                            type="checkbox"
                                            checked={preferences.trainingNotifications}
                                            onChange={(e) => handlePreferenceChange('trainingNotifications', e.target.checked)}
                                        />
                                        <span className="slider"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'volunteer' && (
                        <div className="profile-section volunteer-register-section">
                            <h2><ClipboardList size={20} /> 志工登記</h2>
                            <p className="profile-section-desc">加入 Light Keepers 志工團隊</p>

                            {volunteerSubmitted ? (
                                <div className="register-success">
                                    <span className="success-icon"><CheckIcon size={32} /></span>
                                    <h3>志工登記申請已送出</h3>
                                    <p>感謝您願意加入 Light Keepers 志工團隊！</p>
                                    <p className="note">您的申請正在等待管理員審核，審核通過後您將收到通知。</p>
                                </div>
                            ) : !canRegisterVolunteer ? (
                                <div className="binding-required">
                                    <Alert variant="warning" title="需要完成帳號綁定">
                                        登記志工前，請先完成以下帳號綁定：
                                    </Alert>
                                    <div className="binding-checklist">
                                        <div className={`binding-item ${hasLineBinding ? 'done' : ''}`}>
                                            {hasLineBinding ? (
                                                <CheckCircle2 size={18} className="binding-icon binding-icon--done" aria-hidden="true" />
                                            ) : (
                                                <XCircle size={18} className="binding-icon" aria-hidden="true" />
                                            )}
                                            <span>LINE 帳號綁定{hasLineBinding ? '（已完成）' : '（未完成）'}</span>
                                            {!hasLineBinding && (
                                                <Button size="sm" variant="primary" onClick={handleLineBind}>
                                                    綁定
                                                </Button>
                                            )}
                                        </div>
                                        <div className={`binding-item ${hasGoogleBinding ? 'done' : ''}`}>
                                            {hasGoogleBinding ? (
                                                <CheckCircle2 size={18} className="binding-icon binding-icon--done" aria-hidden="true" />
                                            ) : (
                                                <XCircle size={18} className="binding-icon" aria-hidden="true" />
                                            )}
                                            <span>Google 帳號綁定{hasGoogleBinding ? '（已完成）' : '（未完成）'}</span>
                                            {!hasGoogleBinding && (
                                                <Button size="sm" variant="primary" onClick={handleGoogleBind}>
                                                    綁定
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="volunteer-form">
                                    <div className="form-row">
                                        <div className="form-section">
                                            <label className="form-label">姓名 *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="請輸入姓名"
                                                value={volunteerForm.name}
                                                onChange={e => setVolunteerForm({ ...volunteerForm, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-section">
                                            <label className="form-label">電話 *</label>
                                            <input
                                                type="tel"
                                                className="form-input"
                                                placeholder="09XX-XXX-XXX"
                                                value={volunteerForm.phone}
                                                onChange={e => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-section">
                                            <label className="form-label">Email</label>
                                            <input
                                                type="email"
                                                className="form-input"
                                                placeholder="volunteer@email.com"
                                                value={volunteerForm.email}
                                                onChange={e => setVolunteerForm({ ...volunteerForm, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-section">
                                            <label className="form-label">所在地區 *</label>
                                            <input
                                                type="text"
                                                className="form-input"
                                                placeholder="例如：台北市中山區"
                                                value={volunteerForm.region}
                                                onChange={e => setVolunteerForm({ ...volunteerForm, region: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <label className="form-label">
                                            詳細地址
                                            <Badge variant="info" size="sm" icon={<LockIcon size={12} />}>僅管理員可見</Badge>
                                        </label>
                                        <input
                                            type="text"
                                            className="form-input form-input--private"
                                            placeholder="詳細地址（選填）"
                                            value={volunteerForm.address}
                                            onChange={e => setVolunteerForm({ ...volunteerForm, address: e.target.value })}
                                        />
                                    </div>

                                    <div className="form-section">
                                        <label className="form-label">專長技能</label>
                                        <div className="skills-grid">
                                            {SKILL_OPTIONS.map(skill => (
                                                <button
                                                    key={skill.value}
                                                    type="button"
                                                    className={`skill-btn ${volunteerForm.skills.includes(skill.value) ? 'skill-btn--selected' : ''}`}
                                                    onClick={() => toggleSkill(skill.value)}
                                                >
                                                    <span className="skill-btn__icon"><skill.Icon size={16} /></span>
                                                    <span className="skill-btn__label">{skill.label}</span>
                                                    {volunteerForm.skills.includes(skill.value) && (
                                                        <span className="skill-btn__check"><CheckIcon size={14} /></span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-row">
                                        <div className="form-section">
                                            <label className="form-label">
                                                緊急聯絡人 *
                                                <Badge variant="info" size="sm" icon={<LockIcon size={12} />}>僅管理員可見</Badge>
                                            </label>
                                            <input
                                                type="text"
                                                className="form-input form-input--private"
                                                placeholder="聯絡人姓名"
                                                value={volunteerForm.emergencyContact}
                                                onChange={e => setVolunteerForm({ ...volunteerForm, emergencyContact: e.target.value })}
                                            />
                                        </div>
                                        <div className="form-section">
                                            <label className="form-label">
                                                緊急聯絡電話 *
                                                <Badge variant="info" size="sm" icon={<LockIcon size={12} />}>僅管理員可見</Badge>
                                            </label>
                                            <input
                                                type="tel"
                                                className="form-input form-input--private"
                                                placeholder="緊急聯絡電話"
                                                value={volunteerForm.emergencyPhone}
                                                onChange={e => setVolunteerForm({ ...volunteerForm, emergencyPhone: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="form-section">
                                        <label className="form-label">備註事項（過敏原或慢性疾病等需特別註記事項）</label>
                                        <textarea
                                            className="form-textarea"
                                            placeholder="請填寫過敏原、慢性疾病或其他需要特別注意的事項..."
                                            value={volunteerForm.notes}
                                            onChange={e => setVolunteerForm({ ...volunteerForm, notes: e.target.value })}
                                            rows={3}
                                        />
                                    </div>

                                    <div className="form-actions">
                                        <Button
                                            variant="primary"
                                            onClick={handleVolunteerSubmit}
                                            disabled={isVolunteerSubmitting}
                                        >
                                            {isVolunteerSubmitting ? '提交中...' : '提交申請'}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Password Modal (Set or Change) */}
            {showPasswordModal && (
                <Modal
                    isOpen={showPasswordModal}
                    onClose={() => setShowPasswordModal(false)}
                    title={hasPassword ? '變更密碼' : '設定密碼'}
                    size="sm"
                >
                    <div className="password-form">
                        {hasPassword && (
                            <div className="form-group">
                                <label htmlFor="pw-current">目前密碼</label>
                                <input
                                    id="pw-current"
                                    type="password"
                                    value={passwordData.currentPassword}
                                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                    placeholder="請輸入目前密碼"
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="pw-new">{hasPassword ? '新密碼' : '密碼'}</label>
                            <input
                                id="pw-new"
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                placeholder="請輸入密碼（至少 6 字元）"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="pw-confirm">確認密碼</label>
                            <input
                                id="pw-confirm"
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                placeholder="請再次輸入密碼"
                            />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
                            取消
                        </Button>
                        <Button
                            variant="primary"
                            onClick={hasPassword ? handleChangePassword : handleSetPassword}
                            disabled={isChangingPassword}
                        >
                            {isChangingPassword ? '處理中...' : '確認'}
                        </Button>
                    </div>
                </Modal>
            )}
        </div>
    );
}

