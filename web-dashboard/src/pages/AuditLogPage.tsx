/**
 * Audit Log Page
 *
 * View and filter system audit logs
 * Level 5+ only — connected to real API
 *
 * FE-4 遷移範本（3.1 示範頁 3/3）：utils/api → src/api/client + react-query
 * 見 docs/architecture/API_CLIENT_CONSOLIDATION.md §「遷移模式 C：伺服器端篩選參數」
 * 重點：篩選條件進 queryKey，react-query 自動 refetch + 快取每組條件的結果。
 *
 * R3b/設計語言重建：List archetype 的可審計性範例（DESIGN_LANGUAGE.md §7.2）——
 * 每列必含時間戳（tabular-nums）＋操作者＋動作＋對象。
 */

import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
    SearchIcon,
    ExportIcon,
    SyncIcon,
    UserIcon,
    ClockIcon,
    WarningIcon,
    CheckIcon,
    CloseIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    AuditIcon,
} from '../design-system/icons';
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';
import { Alert, Badge, Tag, Button, InputField, StatIndicator } from '../design-system';
import { SkeletonTable } from '../components/ui/Skeleton/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import styles from './AuditLogPage.module.css';

interface AuditLog {
    id: string;
    timestamp: string;
    userId: string;
    userName: string;
    action: string;
    resource: string;
    resourceId?: string;
    status: 'success' | 'failed';
    ipAddress?: string;
    userAgent?: string;
    details?: Record<string, any>;
    error?: string;
}

const ACTION_LABELS: Record<string, string> = {
    LOGIN: '登入',
    LOGOUT: '登出',
    CREATE: '建立',
    UPDATE: '更新',
    DELETE: '刪除',
    VIEW: '檢視',
    EXPORT: '匯出',
    SYNC: '同步',
    APPROVE: '核准',
    REJECT: '拒絕',
};

const RESOURCE_LABELS: Record<string, string> = {
    auth: '認證',
    task: '任務',
    volunteer: '志工',
    resource: '物資',
    report: '報表',
    ncdr_alerts: 'NCDR 警報',
    account: '帳戶',
    settings: '設定',
};

// 動作類別是分類標籤（非危急狀態），用 Tag 的裝飾性 color 對照，非 Badge 狀態語意。
const ACTION_TAG_COLOR: Record<string, 'default' | 'success' | 'warning' | 'danger'> = {
    LOGIN: 'default',
    LOGOUT: 'default',
    CREATE: 'success',
    APPROVE: 'success',
    UPDATE: 'warning',
    SYNC: 'warning',
    DELETE: 'danger',
    REJECT: 'danger',
};

/** query key 慣例：[領域, 資源, 篩選條件物件] —— 篩選條件變動即自動 refetch */
const auditKeys = {
    logs: (filters: { status: string; action: string }) => ['audit', 'logs', filters] as const,
};

const AuditLogPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const {
        data: logs = [],
        isFetching: loading,
        error: queryError,
        refetch: fetchLogs,
    } = useQuery({
        queryKey: auditKeys.logs({ status: statusFilter, action: actionFilter }),
        queryFn: async ({ signal }): Promise<AuditLog[]> => {
            const params: Record<string, string> = { limit: '100' };
            if (statusFilter !== 'all') {
                params.success = statusFilter === 'success' ? 'true' : 'false';
            }
            if (actionFilter !== 'all') {
                params.action = actionFilter;
            }
            const response = await api.get('/audit/logs', { params, signal });
            const data = response.data?.data || response.data || [];
            // Normalize: backend returns logs or items array
            return Array.isArray(data) ? data : (data.items || data.logs || []);
        },
    });

    const error = queryError ? getApiErrorMessage(queryError, '無法載入稽核日誌') : null;

    // Client-side search filter
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchSearch = !searchQuery ||
                (log.userName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.action || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (log.resource || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchSearch;
        });
    }, [logs, searchQuery]);

    // Format timestamp
    const formatTime = (iso: string) => {
        const date = new Date(iso);
        return date.toLocaleString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const toggleExpand = (id: string) => setExpandedLogId(prev => (prev === id ? null : id));

    const renderDetails = (log: AuditLog) => (
        <div className={styles.detailContent}>
            {log.userAgent && (
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>瀏覽器:</span>
                    <span>{log.userAgent}</span>
                </div>
            )}
            {log.details && (
                <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>詳細資料:</span>
                    <code className={styles.detailCode}>
                        {JSON.stringify(log.details, null, 2)}
                    </code>
                </div>
            )}
            {log.error && (
                <div className={styles.detailItem}>
                    <span className={`${styles.detailLabel} ${styles.dangerText}`}>
                        <WarningIcon size={14} aria-hidden="true" /> 錯誤:
                    </span>
                    <span className={styles.dangerText}>{log.error}</span>
                </div>
            )}
        </div>
    );

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>
                        <AuditIcon size={24} aria-hidden="true" />
                        稽核日誌
                    </h1>
                    <p className={styles.subtitle}>
                        系統活動追蹤與安全監控
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <Button
                        variant="secondary"
                        onClick={() => fetchLogs()}
                        disabled={loading}
                        icon={<SyncIcon size={16} className={loading ? 'spin' : ''} aria-hidden="true" />}
                    >
                        重新整理
                    </Button>
                    <Button variant="primary" icon={<ExportIcon size={16} aria-hidden="true" />}>
                        匯出
                    </Button>
                </div>
            </header>

            {/* Stats */}
            <div className={styles.stats}>
                <StatIndicator value={filteredLogs.length} label="總筆數" />
                <StatIndicator
                    value={filteredLogs.filter(l => l.status === 'success').length}
                    label="成功"
                    variant="success"
                />
                <StatIndicator
                    value={filteredLogs.filter(l => l.status === 'failed').length}
                    label="失敗"
                    variant="danger"
                />
            </div>

            {/* Toolbar */}
            <div className={styles.filters}>
                <InputField
                    prefix={<SearchIcon size={18} aria-hidden="true" />}
                    placeholder="搜尋用戶、動作、資源..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="搜尋稽核日誌"
                    className={styles.searchBox}
                />

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="audit-status-filter">狀態</label>
                    <select
                        id="audit-status-filter"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">全部</option>
                        <option value="success">成功</option>
                        <option value="failed">失敗</option>
                    </select>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel} htmlFor="audit-action-filter">動作</label>
                    <select
                        id="audit-action-filter"
                        value={actionFilter}
                        onChange={(e) => setActionFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">全部</option>
                        {Object.entries(ACTION_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className={styles.errorBannerWrap}>
                    <Alert variant="danger" icon={<WarningIcon size={16} />} title="載入失敗">
                        <div className={styles.errorBody}>
                            <span>{error}</span>
                            <Button size="sm" variant="secondary" onClick={() => fetchLogs()}>重試</Button>
                        </div>
                    </Alert>
                </div>
            )}

            {/* Loading */}
            {loading && (
                <div className={styles.tableWrapper}>
                    <SkeletonTable rows={6} columns={6} />
                </div>
            )}

            {/* Empty */}
            {!loading && !error && filteredLogs.length === 0 && (
                <EmptyState
                    variant="search"
                    title="暫無稽核日誌"
                    description="試試調整篩選條件，或清空搜尋關鍵字查看全部紀錄。"
                />
            )}

            {/* Log Table — desktop */}
            {!loading && filteredLogs.length > 0 && (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th scope="col"><span className={styles.visuallyHidden}>展開</span></th>
                                <th scope="col">時間</th>
                                <th scope="col">用戶</th>
                                <th scope="col">動作</th>
                                <th scope="col">資源</th>
                                <th scope="col">狀態</th>
                                <th scope="col">IP 位址</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr
                                        className={`${styles.row} ${expandedLogId === log.id ? styles.rowExpanded : ''}`}
                                        onClick={() => toggleExpand(log.id)}
                                        tabIndex={0}
                                        role="button"
                                        aria-expanded={expandedLogId === log.id}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                toggleExpand(log.id);
                                            }
                                        }}
                                    >
                                        <td className={styles.expandCell}>
                                            {expandedLogId === log.id ? (
                                                <ChevronDownIcon size={16} aria-hidden="true" />
                                            ) : (
                                                <ChevronRightIcon size={16} aria-hidden="true" />
                                            )}
                                        </td>
                                        <td className={styles.timeCell}>
                                            <ClockIcon size={14} aria-hidden="true" />
                                            {formatTime(log.timestamp)}
                                        </td>
                                        <td>
                                            <div className={styles.userCell}>
                                                <UserIcon size={14} aria-hidden="true" />
                                                {log.userName}
                                            </div>
                                        </td>
                                        <td>
                                            <Tag color={ACTION_TAG_COLOR[log.action] ?? 'default'} size="sm">
                                                {ACTION_LABELS[log.action] || log.action}
                                            </Tag>
                                        </td>
                                        <td>
                                            {RESOURCE_LABELS[log.resource] || log.resource}
                                            {log.resourceId && <span className={styles.resourceId}> ({log.resourceId})</span>}
                                        </td>
                                        <td>
                                            <Badge
                                                variant={log.status === 'success' ? 'success' : 'danger'}
                                                size="sm"
                                                icon={log.status === 'success' ? <CheckIcon size={12} aria-hidden="true" /> : <CloseIcon size={12} aria-hidden="true" />}
                                            >
                                                {log.status === 'success' ? '成功' : '失敗'}
                                            </Badge>
                                        </td>
                                        <td className={styles.ipCell}>
                                            {log.ipAddress || '-'}
                                        </td>
                                    </tr>
                                    {expandedLogId === log.id && (
                                        <tr className={styles.detailRow}>
                                            <td colSpan={7}>
                                                {renderDetails(log)}
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Log cards — mobile (行動端 Card 直列，取代表格 per §7.1) */}
            {!loading && filteredLogs.length > 0 && (
                <div className={styles.mobileList}>
                    {filteredLogs.map((log) => (
                        <div
                            key={log.id}
                            className={styles.logCard}
                            onClick={() => toggleExpand(log.id)}
                            role="button"
                            tabIndex={0}
                            aria-expanded={expandedLogId === log.id}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleExpand(log.id);
                                }
                            }}
                        >
                            <div className={styles.logCardTop}>
                                <span className={styles.timeCell}>
                                    <ClockIcon size={14} aria-hidden="true" />
                                    {formatTime(log.timestamp)}
                                </span>
                                <Badge
                                    variant={log.status === 'success' ? 'success' : 'danger'}
                                    size="sm"
                                    icon={log.status === 'success' ? <CheckIcon size={12} aria-hidden="true" /> : <CloseIcon size={12} aria-hidden="true" />}
                                >
                                    {log.status === 'success' ? '成功' : '失敗'}
                                </Badge>
                            </div>
                            <div className={styles.logCardMain}>
                                <div className={styles.userCell}>
                                    <UserIcon size={14} aria-hidden="true" />
                                    {log.userName}
                                </div>
                                <Tag color={ACTION_TAG_COLOR[log.action] ?? 'default'} size="sm">
                                    {ACTION_LABELS[log.action] || log.action}
                                </Tag>
                                <span>
                                    {RESOURCE_LABELS[log.resource] || log.resource}
                                    {log.resourceId && <span className={styles.resourceId}> ({log.resourceId})</span>}
                                </span>
                            </div>
                            {log.ipAddress && <div className={styles.ipCell}>{log.ipAddress}</div>}
                            {expandedLogId === log.id && renderDetails(log)}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuditLogPage;
