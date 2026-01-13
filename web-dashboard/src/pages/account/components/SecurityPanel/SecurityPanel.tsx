/**
 * SecurityPanel Component
 * 
 * Security settings: password, 2FA, sessions, danger zone.
 */

import React, { useState } from 'react';
import {
    Lock,
    Shield,
    Smartphone,
    Monitor,
    Tablet,
    AlertTriangle,
    LogOut,
    Key,
    RefreshCw,
    Trash2,
    MapPin,
    Clock,
} from 'lucide-react';
import type { SecurityPanelProps } from '../../account.types';
import styles from './SecurityPanel.module.css';

const SecurityPanel: React.FC<SecurityPanelProps> = ({
    data,
    onChangePassword,
    onToggle2FA,
    onRevokeSession,
    onDeactivateAccount,
}) => {
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isToggling2FA, setIsToggling2FA] = useState(false);
    const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

    const handleChangePassword = async () => {
        setIsChangingPassword(true);
        try {
            await onChangePassword();
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleToggle2FA = async () => {
        setIsToggling2FA(true);
        try {
            await onToggle2FA();
        } finally {
            setIsToggling2FA(false);
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        setRevokingSessionId(sessionId);
        try {
            await onRevokeSession(sessionId);
        } finally {
            setRevokingSessionId(null);
        }
    };

    const getDeviceIcon = (deviceType: string) => {
        switch (deviceType) {
            case 'mobile':
                return <Smartphone size={18} />;
            case 'tablet':
                return <Tablet size={18} />;
            default:
                return <Monitor size={18} />;
        }
    };

    const formatSessionTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);

        if (diffMins < 1) return '剛剛';
        if (diffMins < 60) return `${diffMins} 分鐘前`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)} 小時前`;
        return date.toLocaleDateString('zh-TW');
    };

    return (
        <div className={styles.panel}>
            <h3 className={styles.sectionTitle}>安全性設定</h3>

            {/* Password */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <Key size={18} />
                    <span>密碼管理</span>
                </div>
                <div className={styles.cardContent}>
                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <h4>變更密碼</h4>
                            <p>定期更換密碼可提高帳戶安全性</p>
                        </div>
                        <button
                            className={styles.actionBtn}
                            onClick={handleChangePassword}
                            disabled={isChangingPassword}
                        >
                            <RefreshCw size={16} className={isChangingPassword ? styles.spin : ''} />
                            {isChangingPassword ? '處理中...' : '變更密碼'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 2FA */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <Shield size={18} />
                    <span>兩步驟驗證 (2FA)</span>
                </div>
                <div className={styles.cardContent}>
                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <h4>兩步驟驗證</h4>
                            <p>為您的帳戶增加一層額外的安全保護</p>
                        </div>
                        <div className={styles.settingAction}>
                            <span className={data.twoFactorEnabled ? styles.statusEnabled : styles.statusDisabled}>
                                {data.twoFactorEnabled ? '已啟用' : '未啟用'}
                            </span>
                            <button
                                className={`${styles.actionBtn} ${data.twoFactorEnabled ? styles.actionDanger : ''}`}
                                onClick={handleToggle2FA}
                                disabled={isToggling2FA}
                            >
                                {isToggling2FA ? '處理中...' : (data.twoFactorEnabled ? '停用' : '啟用')}
                            </button>
                        </div>
                    </div>
                    {!data.twoFactorEnabled && (
                        <div className={styles.hint}>
                            <AlertTriangle size={14} />
                            建議啟用兩步驟驗證以保護您的帳戶安全
                        </div>
                    )}
                </div>
            </div>

            {/* Active Sessions */}
            <div className={styles.card}>
                <div className={styles.cardHeader}>
                    <Monitor size={18} />
                    <span>登入工作階段</span>
                </div>
                <div className={styles.cardContent}>
                    {data.activeSessions.length > 0 ? (
                        <div className={styles.sessionList}>
                            {data.activeSessions.map((session) => (
                                <div
                                    key={session.id}
                                    className={`${styles.sessionItem} ${session.isCurrent ? styles.currentSession : ''}`}
                                >
                                    <div className={styles.sessionIcon}>
                                        {getDeviceIcon(session.deviceType)}
                                    </div>
                                    <div className={styles.sessionInfo}>
                                        <div className={styles.sessionDevice}>
                                            {session.deviceName}
                                            {session.isCurrent && (
                                                <span className={styles.currentBadge}>目前裝置</span>
                                            )}
                                        </div>
                                        <div className={styles.sessionMeta}>
                                            <span>{session.browser}</span>
                                            {session.location && (
                                                <>
                                                    <span className={styles.separator}>•</span>
                                                    <span><MapPin size={12} /> {session.location}</span>
                                                </>
                                            )}
                                            <span className={styles.separator}>•</span>
                                            <span><Clock size={12} /> {formatSessionTime(session.lastActiveAt)}</span>
                                        </div>
                                    </div>
                                    {!session.isCurrent && (
                                        <button
                                            className={styles.revokeBtn}
                                            onClick={() => handleRevokeSession(session.id)}
                                            disabled={revokingSessionId === session.id}
                                        >
                                            <LogOut size={14} />
                                            {revokingSessionId === session.id ? '登出中...' : '登出'}
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className={styles.emptyState}>
                            <Monitor size={24} />
                            <p>沒有其他登入工作階段</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div className={`${styles.card} ${styles.dangerCard}`}>
                <div className={styles.cardHeader}>
                    <AlertTriangle size={18} />
                    <span>危險區域</span>
                </div>
                <div className={styles.cardContent}>
                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <h4>停用帳戶</h4>
                            <p>暫時停用您的帳戶，所有資料將被保留</p>
                        </div>
                        <button
                            className={styles.dangerBtn}
                            onClick={() => setShowDeactivateConfirm(true)}
                        >
                            <Lock size={16} />
                            停用帳戶
                        </button>
                    </div>

                    <div className={styles.settingRow}>
                        <div className={styles.settingInfo}>
                            <h4>刪除帳戶</h4>
                            <p>永久刪除您的帳戶及所有相關資料，此操作無法復原</p>
                        </div>
                        <button className={`${styles.dangerBtn} ${styles.btnDisabled}`} disabled>
                            <Trash2 size={16} />
                            刪除帳戶
                        </button>
                    </div>
                    <p className={styles.dangerHint}>
                        帳戶刪除需聯繫系統管理員核准
                    </p>
                </div>
            </div>

            {/* Deactivate Confirmation Dialog */}
            {showDeactivateConfirm && (
                <div className={styles.dialogOverlay} onClick={() => setShowDeactivateConfirm(false)}>
                    <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.dialogIcon}>
                            <AlertTriangle size={32} />
                        </div>
                        <h4>確定要停用帳戶嗎？</h4>
                        <p>停用後您將無法登入，但您的資料會被保留。如需重新啟用，請聯繫管理員。</p>
                        <div className={styles.dialogActions}>
                            <button
                                className={styles.cancelDialogBtn}
                                onClick={() => setShowDeactivateConfirm(false)}
                            >
                                取消
                            </button>
                            <button
                                className={styles.confirmDialogBtn}
                                onClick={async () => {
                                    await onDeactivateAccount();
                                    setShowDeactivateConfirm(false);
                                }}
                            >
                                確定停用
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurityPanel;
