/**
 * Audit Log Page
 * 
 * View and filter system audit logs
 * Level 5+ only — connected to real API
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Search,
    Download,
    RefreshCw,
    User,
    Clock,
    AlertTriangle,
    Check,
    X,
    ChevronDown,
    ChevronRight,
    Eye,
    Loader2,
} from 'lucide-react';
import api from '../utils/api';
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

const AuditLogPage: React.FC = () => {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    const fetchLogs = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const params: Record<string, string> = { limit: '100' };
            if (statusFilter !== 'all') {
                params.success = statusFilter === 'success' ? 'true' : 'false';
            }
            if (actionFilter !== 'all') {
                params.action = actionFilter;
            }
            const response = await api.get('/audit/logs', { params });
            const data = response.data?.data || response.data || [];
            // Normalize: backend returns logs or items array
            const items = Array.isArray(data) ? data : (data.items || data.logs || []);
            setLogs(items);
        } catch (err: any) {
            console.error('Failed to fetch audit logs:', err);
            setError(err?.response?.data?.message || '無法載入稽核日誌');
            setLogs([]);
        } finally {
            setLoading(false);
        }
    }, [statusFilter, actionFilter]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

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

    return (
        <div className={styles.page}>
            <header className={styles.header}>
                <div className={styles.headerLeft}>
                    <h1 className={styles.title}>
                        <Eye size={24} />
                        稽核日誌
                    </h1>
                    <p className={styles.subtitle}>
                        系統活動追蹤與安全監控
                    </p>
                </div>
                <div className={styles.headerActions}>
                    <button className={styles.actionButton} onClick={fetchLogs} disabled={loading}>
                        <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        重新整理
                    </button>
                    <button className={styles.actionButton}>
                        <Download size={18} />
                        匯出
                    </button>
                </div>
            </header>

            {/* Filters */}
            <div className={styles.filters}>
                <div className={styles.searchBox}>
                    <Search size={18} className={styles.searchIcon} />
                    <input
                        type="text"
                        placeholder="搜尋用戶、動作、資源..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={styles.searchInput}
                    />
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>狀態</label>
                    <select
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
                    <label className={styles.filterLabel}>動作</label>
                    <select
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
                <div className={styles.errorBanner}>
                    <AlertTriangle size={16} /> {error}
                </div>
            )}

            {/* Stats */}
            <div className={styles.stats}>
                <div className={styles.statCard}>
                    <span className={styles.statValue}>{filteredLogs.length}</span>
                    <span className={styles.statLabel}>總筆數</span>
                </div>
                <div className={styles.statCard}>
                    <span className={`${styles.statValue} ${styles.successText}`}>
                        {filteredLogs.filter(l => l.status === 'success').length}
                    </span>
                    <span className={styles.statLabel}>成功</span>
                </div>
                <div className={styles.statCard}>
                    <span className={`${styles.statValue} ${styles.dangerText}`}>
                        {filteredLogs.filter(l => l.status === 'failed').length}
                    </span>
                    <span className={styles.statLabel}>失敗</span>
                </div>
            </div>

            {/* Loading */}
            {loading && (
                <div className={styles.loadingOverlay}>
                    <Loader2 size={32} className="spin" />
                    <span>載入稽核日誌中...</span>
                </div>
            )}

            {/* Log Table */}
            {!loading && (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th></th>
                                <th>時間</th>
                                <th>用戶</th>
                                <th>動作</th>
                                <th>資源</th>
                                <th>狀態</th>
                                <th>IP 位址</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                        {error ? '載入失敗' : '暫無稽核日誌'}
                                    </td>
                                </tr>
                            ) : filteredLogs.map((log) => (
                                <React.Fragment key={log.id}>
                                    <tr
                                        className={`${styles.row} ${expandedLogId === log.id ? styles.rowExpanded : ''}`}
                                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                                    >
                                        <td className={styles.expandCell}>
                                            {expandedLogId === log.id ? (
                                                <ChevronDown size={16} />
                                            ) : (
                                                <ChevronRight size={16} />
                                            )}
                                        </td>
                                        <td className={styles.timeCell}>
                                            <Clock size={14} />
                                            {formatTime(log.timestamp)}
                                        </td>
                                        <td>
                                            <div className={styles.userCell}>
                                                <User size={14} />
                                                {log.userName}
                                            </div>
                                        </td>
                                        <td>
                                            <span className={styles.actionBadge}>
                                                {ACTION_LABELS[log.action] || log.action}
                                            </span>
                                        </td>
                                        <td>
                                            {RESOURCE_LABELS[log.resource] || log.resource}
                                            {log.resourceId && <span className={styles.resourceId}> ({log.resourceId})</span>}
                                        </td>
                                        <td>
                                            <span className={`${styles.statusBadge} ${styles[log.status]}`}>
                                                {log.status === 'success' ? <Check size={12} /> : <X size={12} />}
                                                {log.status === 'success' ? '成功' : '失敗'}
                                            </span>
                                        </td>
                                        <td className={styles.ipCell}>
                                            {log.ipAddress || '-'}
                                        </td>
                                    </tr>
                                    {expandedLogId === log.id && (
                                        <tr className={styles.detailRow}>
                                            <td colSpan={7}>
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
                                                                <AlertTriangle size={14} /> 錯誤:
                                                            </span>
                                                            <span className={styles.dangerText}>{log.error}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default AuditLogPage;
