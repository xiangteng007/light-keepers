import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
    User,
    Shield,
    Smartphone,
    Bell,
    Lock,
    Mail,
    Award,
    CreditCard,
    LogOut,
    CheckCircle2,
    XCircle
} from 'lucide-react';
import './AccountPage.css';

const AccountPage: React.FC = () => {
    const { user, logout } = useAuth();

    if (!user) {
        return <div className="p-8 text-center text-white">載入中...</div>;
    }

    return (
        <div className="account-page">
            <header className="account-header">
                <h1>
                    <User size={32} className="text-[var(--accent-gold)]" />
                    我的帳戶
                </h1>
                <div className="subtitle">管理您的個人資料、安全設定與連結帳戶</div>
            </header>

            <div className="account-grid">
                {/* Left Column: Profile Card */}
                <div className="left-column">
                    <div className="account-card profile-card">
                        <div className="card-content w-full flex flex-col items-center">
                            <div className="avatar-container">
                                {user.avatarUrl ? (
                                    <img src={user.avatarUrl} alt={user.displayName} />
                                ) : (
                                    <span className="avatar-placeholder">
                                        {user.displayName?.charAt(0) || user.email.charAt(0)}
                                    </span>
                                )}
                            </div>

                            <h2 className="profile-name">{user.displayName || '未設定名稱'}</h2>
                            <p className="profile-email">{user.email}</p>

                            <div className="role-badge">
                                <Shield size={14} />
                                <span>{user.roleDisplayName} (Level {user.roleLevel})</span>
                            </div>

                            <div className="profile-stats">
                                <div className="stat-item">
                                    <span className="stat-value">2,450</span>
                                    <span className="stat-label">貢獻積分</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-value">128</span>
                                    <span className="stat-label">服務時數</span>
                                </div>
                            </div>

                            <button
                                onClick={logout}
                                className="mt-8 w-full py-2 px-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                            >
                                <LogOut size={16} />
                                登出帳戶
                            </button>
                        </div>
                    </div>

                    {/* Volunteer Status Card (Mobile/Compact view) */}
                    <div className="account-card mt-6">
                        <div className="card-header">
                            <h2>志工徽章</h2>
                            <Award size={20} className="text-[var(--accent-gold)]" />
                        </div>
                        <div className="card-content">
                            <div className="flex flex-wrap gap-2">
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                                    急救轉運
                                </span>
                                <span className="px-3 py-1 bg-green-500/20 text-green-300 text-xs rounded-full border border-green-500/30">
                                    物資管理
                                </span>
                                <span className="px-3 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full border border-purple-500/30">
                                    通訊協調
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Settings & Details */}
                <div className="right-column space-y-6">
                    {/* Basic Information */}
                    <div className="account-card">
                        <div className="card-header">
                            <h2>基本資料</h2>
                            <button className="text-sm text-[var(--accent-gold)] hover:underline">
                                編輯資料
                            </button>
                        </div>
                        <div className="card-content">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="info-group">
                                    <label className="info-label">顯示名稱</label>
                                    <div className="info-value">
                                        {user.displayName || '-'}
                                        <User size={16} className="text-gray-500" />
                                    </div>
                                </div>
                                <div className="info-group">
                                    <label className="info-label">電子郵件</label>
                                    <div className="info-value">
                                        {user.email}
                                        <div className="verified-badge">
                                            <CheckCircle2 size={14} />
                                            已驗證
                                        </div>
                                    </div>
                                </div>
                                <div className="info-group">
                                    <label className="info-label">手機號碼</label>
                                    <div className="info-value">
                                        0912-345-678
                                        <div className="verified-badge">
                                            <CheckCircle2 size={14} />
                                            已驗證
                                        </div>
                                    </div>
                                </div>
                                <div className="info-group">
                                    <label className="info-label">所屬單位</label>
                                    <div className="info-value">
                                        台北市救難協會 - 第一大隊
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Linked Accounts */}
                    <div className="account-card">
                        <div className="card-header">
                            <h2>連結帳戶</h2>
                        </div>
                        <div className="card-content">
                            <div className="space-y-3">
                                <div className="linked-account-item">
                                    <div className="platform-info">
                                        <div className="platform-icon bg-[#06C755]/10 text-[#06C755]">
                                            <Smartphone size={18} />
                                        </div>
                                        <div>
                                            <span className="platform-name">LINE</span>
                                            <span className="platform-status">
                                                {user.lineLinked ? '已連結官方帳號' : '尚未連結'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`status-indicator ${user.lineLinked ? 'connected' : 'disconnected'}`}>
                                        {user.lineLinked ? '已連結' : '未設定'}
                                    </div>
                                </div>

                                <div className="linked-account-item">
                                    <div className="platform-info">
                                        <div className="platform-icon bg-red-500/10 text-red-500">
                                            <Mail size={18} />
                                        </div>
                                        <div>
                                            <span className="platform-name">Google</span>
                                            <span className="platform-status">
                                                {user.googleLinked ? '用於快速登入' : '尚未連結'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`status-indicator ${user.googleLinked ? 'connected' : 'disconnected'}`}>
                                        {user.googleLinked ? '已連結' : '未設定'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security & Preferences */}
                    <div className="account-card">
                        <div className="card-header">
                            <h2>安全與偏好設定</h2>
                        </div>
                        <div className="card-content">
                            <div className="setting-item">
                                <div className="setting-info">
                                    <h4>兩步驟驗證 (2FA)</h4>
                                    <p>為您的帳戶增加一層額外的安全保護</p>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="setting-item">
                                <div className="setting-info">
                                    <h4>緊急警報通知</h4>
                                    <p>透過 LINE 接收即時災情警報</p>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" defaultChecked />
                                    <span className="slider"></span>
                                </label>
                            </div>

                            <div className="setting-item">
                                <div className="setting-info">
                                    <h4>變更密碼</h4>
                                    <p>建議定期更換您的登入密碼</p>
                                </div>
                                <button className="px-4 py-2 text-sm bg-white/5 border border-white/10 rounded hover:bg-white/10 transition-colors">
                                    修改
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountPage;
