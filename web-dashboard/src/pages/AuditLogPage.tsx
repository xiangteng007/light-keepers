/**
 * Audit Log Page
 * 
 * View and filter system audit logs
 * Level 5+ only
 */

import React, { useState, useMemo } from 'react';
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
} from 'lucide-react';
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

// Mock audit log data
const MOCK_AUDIT_LOGS: AuditLog[] = [
    {
        id: '1',
        timestamp: '2026-01-13T06:30:00Z',
        userId: 'user-001',
        userName: '系統管理員',
        action: 'LOGIN',
        resource: 'auth',
        status: 'success',
        ipAddress: '203.145.78.23',
        userAgent: 'Chrome 120.0 / Windows',
        details: { method: 'password' },
    },
    {
        id: '2',
        timestamp: '2026-01-13T06:25:00Z',
        userId: 'user-002',
        userName: '張三',
        action: 'UPDATE',
        resource: 'task',
        resourceId: 'task-456',
        status: 'success',
        ipAddress: '140.112.45.67',
        userAgent: 'Safari 17.0 / macOS',
        details: { field: 'status', from: 'pending', to: 'in_progress' },
    },
    {
        id: '3',
        timestamp: '2026-01-13T06:20:00Z',
        userId: 'user-003',
        userName: '李四',
        action: 'DELETE',
        resource: 'volunteer',
        resourceId: 'vol-789',
        status: 'failed',
        ipAddress: '61.216.89.12',
        userAgent: 'Firefox 121.0 / Linux',
        error: '權限不足',
    },
    {
        id: '4',
        timestamp: '2026-01-13T06:15:00Z',
        userId: 'system',
        userName: '系統',
        action: 'SYNC',
        resource: 'ncdr_alerts',
        status: 'success',
        details: { count: 15 },
    },
    {
        id: '5',
        timestamp: '2026-01-13T06:10:00Z',
        userId: 'user-001',
        userName: '系統管理員',
        action: 'EXPORT',
        resource: 'report',
        resourceId: 'report-001',
        status: 'success',
        ipAddress: '203.145.78.23',
        details: { format: 'pdf', size: '2.4MB' },
    },
];

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
    const [logs] = useState<AuditLog[]>(MOCK_AUDIT_LOGS);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [actionFilter, setActionFilter] = useState<string>('all');
    const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

    // Filter logs
    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const matchSearch = !searchQuery ||
                log.userName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                log.resource.toLowerCase().includes(searchQuery.toLowerCase());

            const matchStatus = statusFilter === 'all' || log.status === statusFilter;
            const matchAction = actionFilter === 'all' || log.action === actionFilter;

            return matchSearch && matchStatus && matchAction;
        });
    }, [logs, searchQuery, statusFilter, actionFilter]);

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
                    <button className={styles.actionButton}>
                        <RefreshCw size={18} />
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

            {/* Log Table */}
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
                        {filteredLogs.map((log) => (
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
        </div>
    );
};

export default AuditLogPage;
