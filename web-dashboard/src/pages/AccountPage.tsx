import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    User,
    Shield,
    Smartphone,
    Bell,
    Mail,
    LogOut,
    CheckCircle2,
    XCircle,
    LinkIcon,
    Unlink,
    Loader2,
} from 'lucide-react';
import { unlinkLine, unlinkGoogle, getLineAuthUrl, getGoogleAuthUrl } from '../api/services';
import './AccountPage.css';

const AccountPage: React.FC = () => {
    const { user, logout, refreshUser } = useAuth();
    const [unlinking, setUnlinking] = useState<'line' | 'google' | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    if (!user) {
        return <div className="p-8 text-center text-white">載入中...</div>;
    }

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 4000);
    };

    const handleUnlink = async (provider: 'line' | 'google') => {
        if (!confirm(`確定要解除 ${provider === 'line' ? 'LINE' : 'Google'} 帳號連結嗎？`)) return;
        
        setUnlinking(provider);
        try {
            if (provider === 'line') {
                await unlinkLine();
            } else {
                await unlinkGoogle();
            }
            showMessage('success', `已成功解除 ${provider === 'line' ? 'LINE' : 'Google'} 連結`);
            await refreshUser();
        } catch {
            showMessage('error', '解除連結失敗，請稍後再試');
        } finally {
            setUnlinking(null);
        }
    };

    const handleLink = (provider: 'line' | 'google') => {
        // Redirect to OAuth flow with redirect back to account page
        const authUrl = provider === 'line' ? getLineAuthUrl() : getGoogleAuthUrl();
        window.location.href = `${authUrl}?redirect=${encodeURIComponent('/account')}`;
    };

    return (
        <div className="account-page">
            {/* Status Message */}
            {message && (
                <div className={`account-toast ${message.type}`}>
                    {message.type === 'success' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
                    {message.text}
                </div>
            )}

            <header className="account-header">
                <h1>
                    <User size={32} className="text-[var(--accent-gold)]" />
                    我的帳戶
                </h1>
                <div className="subtitle">管理您的個人資料與連結帳戶</div>
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

                            <button
                                onClick={logout}
                                className="mt-8 w-full py-2 px-4 bg-red-500/10 border border-red-500/30 text-red-500 rounded-lg flex items-center justify-center gap-2 hover:bg-red-500/20 transition-colors"
                            >
                                <LogOut size={16} />
                                登出帳戶
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Column: Settings & Details */}
                <div className="right-column space-y-6">
                    {/* Basic Information */}
                    <div className="account-card">
                        <div className="card-header">
                            <h2>基本資料</h2>
                        </div>
                        <div className="card-content">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="info-group">
                                    <label className="info-label">顯示名稱</label>
                                    <div className="info-value">
                                        {user.displayName || '未設定'}
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
                            </div>
                        </div>
                    </div>

                    {/* Linked Accounts — Real Data */}
                    <div className="account-card">
                        <div className="card-header">
                            <h2>連結帳戶</h2>
                        </div>
                        <div className="card-content">
                            <div className="space-y-3">
                                {/* LINE */}
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
                                    <div className="flex items-center gap-2">
                                        <div className={`status-indicator ${user.lineLinked ? 'connected' : 'disconnected'}`}>
                                            {user.lineLinked ? '已連結' : '未設定'}
                                        </div>
                                        {user.lineLinked ? (
                                            <button
                                                onClick={() => handleUnlink('line')}
                                                disabled={unlinking === 'line'}
                                                className="link-action-btn unlink"
                                                title="解除 LINE 連結"
                                            >
                                                {unlinking === 'line' ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleLink('line')}
                                                className="link-action-btn link"
                                                title="連結 LINE 帳號"
                                            >
                                                <LinkIcon size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Google */}
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
                                    <div className="flex items-center gap-2">
                                        <div className={`status-indicator ${user.googleLinked ? 'connected' : 'disconnected'}`}>
                                            {user.googleLinked ? '已連結' : '未設定'}
                                        </div>
                                        {user.googleLinked ? (
                                            <button
                                                onClick={() => handleUnlink('google')}
                                                disabled={unlinking === 'google'}
                                                className="link-action-btn unlink"
                                                title="解除 Google 連結"
                                            >
                                                {unlinking === 'google' ? <Loader2 size={14} className="animate-spin" /> : <Unlink size={14} />}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleLink('google')}
                                                className="link-action-btn link"
                                                title="連結 Google 帳號"
                                            >
                                                <LinkIcon size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notification Preferences */}
                    <div className="account-card">
                        <div className="card-header">
                            <h2>通知設定</h2>
                        </div>
                        <div className="card-content">
                            <div className="setting-item">
                                <div className="setting-info">
                                    <h4>
                                        <Bell size={16} className="inline mr-2 text-[var(--accent-gold)]" />
                                        緊急警報通知
                                    </h4>
                                    <p>透過 LINE 接收即時災情警報{!user.lineLinked && '（需先連結 LINE）'}</p>
                                </div>
                                <label className="toggle-switch">
                                    <input type="checkbox" defaultChecked={user.lineLinked} disabled={!user.lineLinked} />
                                    <span className="slider"></span>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AccountPage;
