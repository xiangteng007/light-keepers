/**
 * AccountSummary Component
 * 
 * Left sidebar showing user profile summary, KPIs, and quick actions.
 * Collapsible on tablet/mobile.
 */

import React, { useState } from 'react';
// 保留 lucide（R5/T6 誠實清單）：Target（目標/出勤率，無貼切 B3c 語意）
import { Target } from 'lucide-react';
import {
    ShieldIcon,
    EditIcon,
    LockIcon,
    ExportIcon,
    LogoutIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    ClockIcon,
    TrophyIcon,
    CheckIcon,
} from '../../../../design-system/icons';
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
                    {isCollapsed ? <ChevronDownIcon size={20} aria-hidden="true" /> : <ChevronUpIcon size={20} aria-hidden="true" />}
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
                        <ShieldIcon size={16} aria-hidden="true" />
                        <span>Level {data.roleLevel} • {data.roleDisplayName}</span>
                    </div>

                    <div className={styles.statusRow}>
                        <span className={`${styles.status} ${status.className}`}>
                            {status.label}
                        </span>
                        <span className={styles.lastLogin}>
                            <ClockIcon size={12} aria-hidden="true" />
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
                            <TrophyIcon size={16} aria-hidden="true" />
                        </div>
                        <div className={styles.kpiValue}>{data.contributionPoints.toLocaleString()}</div>
                        <div className={styles.kpiLabel}>貢獻積分</div>
                    </div>

                    <div className={styles.kpiCard}>
                        <div className={styles.kpiIcon}>
                            <ClockIcon size={16} aria-hidden="true" />
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
                                <CheckIcon size={16} aria-hidden="true" />
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
                        <EditIcon size={16} aria-hidden="true" />
                        <span>編輯資料</span>
                    </button>

                    <button className={styles.actionBtn} onClick={onSecuritySettings}>
                        <LockIcon size={16} aria-hidden="true" />
                        <span>安全設定</span>
                    </button>

                    <button
                        className={`${styles.actionBtn} ${styles.actionDisabled}`}
                        onClick={() => {
                            window.confirm(
                                '匯出個資功能\n\n' +
                                '此功能正在開發中，預計包含：\n' +
                                '• 匯出個人資料（JSON/CSV）\n' +
                                '• GDPR 合規資料可攜性\n' +
                                '• 志工服務紀錄下載\n' +
                                '• 任務完成證明產出\n\n' +
                                '如有緊急需求，請聯繫管理員。'
                            );
                        }}
                        title="資料匯出功能開發中 - 點擊查看詳情"
                    >
                        <ExportIcon size={16} aria-hidden="true" />
                        <span>匯出個資</span>
                    </button>

                    <button
                        className={`${styles.actionBtn} ${styles.actionDanger}`}
                        onClick={onLogout}
                    >
                        <LogoutIcon size={16} aria-hidden="true" />
                        <span>登出帳戶</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AccountSummary;
