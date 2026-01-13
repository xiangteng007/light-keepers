/**
 * AccountSummary Component
 * 
 * Left sidebar showing user profile summary, KPIs, and quick actions.
 * Collapsible on tablet/mobile.
 */

import React, { useState } from 'react';
import {
    User,
    Shield,
    Edit3,
    Lock,
    Download,
    LogOut,
    ChevronDown,
    ChevronUp,
    Clock,
    Award,
    CheckCircle,
    Target,
} from 'lucide-react';
import type { AccountSummaryProps } from '../../account.types';
import styles from './AccountSummary.module.css';

const AccountSummary: React.FC<AccountSummaryProps> = ({
    data,
    onEditProfile,
    onSecuritySettings,
    onExportData,
    onLogout,
    isCollapsed = false,
    onToggleCollapse,
}) => {
    const [imageError, setImageError] = useState(false);

    const getInitial = () => {
        return data.displayName?.charAt(0) || data.email.charAt(0).toUpperCase();
    };

    const formatLastLogin = (dateStr?: string) => {
        if (!dateStr) return '從未登入';
        const date = new Date(dateStr);
        return date.toLocaleString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const statusConfig = {
        active: { label: '啟用中', className: styles.statusActive },
        suspended: { label: '已停用', className: styles.statusSuspended },
        pending: { label: '待審核', className: styles.statusPending },
    };

    const status = statusConfig[data.status];

    return (
        <div className={styles.summary}>
            {/* Collapsible Header (Mobile/Tablet) */}
            {onToggleCollapse && (
                <button
                    className={styles.collapseToggle}
                    onClick={onToggleCollapse}
                    aria-expanded={!isCollapsed}
                >
                    <div className={styles.collapseHeader}>
                        <div className={styles.avatarSmall}>
                            {data.avatarUrl && !imageError ? (
                                <img
                                    src={data.avatarUrl}
                                    alt={data.displayName}
                                    onError={() => setImageError(true)}
                                />
                            ) : (
                                <span>{getInitial()}</span>
                            )}
                        </div>
                        <div className={styles.collapseInfo}>
                            <span className={styles.collapseName}>{data.displayName}</span>
                            <span className={styles.collapseRole}>{data.roleDisplayName}</span>
                        </div>
                    </div>
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                </button>
            )}

            {/* Main Content (Collapsible on Mobile) */}
            <div className={`${styles.content} ${isCollapsed ? styles.contentCollapsed : ''}`}>
                {/* Avatar Section */}
                <div className={styles.avatarSection}>
                    <div className={styles.avatar}>
                        {data.avatarUrl && !imageError ? (
                            <img
                                src={data.avatarUrl}
                                alt={data.displayName}
                                onError={() => setImageError(true)}
                            />
                        ) : (
                            <span className={styles.avatarInitial}>{getInitial()}</span>
                        )}
                    </div>
                </div>

                {/* User Info */}
                <div className={styles.userInfo}>
                    <h2 className={styles.userName}>{data.displayName || '未設定名稱'}</h2>
                    <p className={styles.userEmail}>{data.email}</p>

                    <div className={styles.roleBadge}>
                        <Shield size={14} />
                        <span>Level {data.roleLevel} • {data.roleDisplayName}</span>
                    </div>

                    <div className={styles.statusRow}>
                        <span className={`${styles.status} ${status.className}`}>
                            {status.label}
                        </span>
                        <span className={styles.lastLogin}>
                            <Clock size={12} />
                            {formatLastLogin(data.lastLoginAt)}
                        </span>
                    </div>
                </div>

                {/* Divider */}
                <div className={styles.divider} />

                {/* KPI Cards */}
                <div className={styles.kpiGrid}>
                    <div className={styles.kpiCard}>
                        <div className={styles.kpiIcon}>
                            <Award size={18} />
                        </div>
                        <div className={styles.kpiValue}>{data.contributionPoints.toLocaleString()}</div>
                        <div className={styles.kpiLabel}>貢獻積分</div>
                    </div>

                    <div className={styles.kpiCard}>
                        <div className={styles.kpiIcon}>
                            <Clock size={18} />
                        </div>
                        <div className={styles.kpiValue}>{data.serviceHours}</div>
                        <div className={styles.kpiLabel}>服務時數</div>
                    </div>

                    <div className={styles.kpiCard}>
                        <div className={styles.kpiIcon}>
                            <Target size={18} />
                        </div>
                        <div className={styles.kpiValue}>{data.tasksCompleted}</div>
                        <div className={styles.kpiLabel}>任務完成</div>
                    </div>

                    {data.recentContribution !== undefined && (
                        <div className={styles.kpiCard}>
                            <div className={styles.kpiIcon}>
                                <CheckCircle size={18} />
                            </div>
                            <div className={styles.kpiValue}>+{data.recentContribution}</div>
                            <div className={styles.kpiLabel}>近30天</div>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className={styles.divider} />

                {/* Quick Actions */}
                <div className={styles.quickActions}>
                    <button className={styles.actionBtn} onClick={onEditProfile}>
                        <Edit3 size={16} />
                        <span>編輯資料</span>
                    </button>

                    <button className={styles.actionBtn} onClick={onSecuritySettings}>
                        <Lock size={16} />
                        <span>安全設定</span>
                    </button>

                    <button
                        className={`${styles.actionBtn} ${styles.actionDisabled}`}
                        onClick={onExportData}
                        disabled
                        title="功能開發中"
                    >
                        <Download size={16} />
                        <span>匯出個資</span>
                    </button>

                    <button
                        className={`${styles.actionBtn} ${styles.actionDanger}`}
                        onClick={onLogout}
                    >
                        <LogOut size={16} />
                        <span>登出帳戶</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountSummary;
