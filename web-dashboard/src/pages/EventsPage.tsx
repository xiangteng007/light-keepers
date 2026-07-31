import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getReports, createTask, getAccounts, deleteReport, getTasks, getReportStats } from '../api/services';
import type { Report, ReportType, ReportSeverity, ReportSource, Task } from '../api/services';
import { Modal, Button, Card } from '../design-system';
import { useAuth } from '../context/AuthContext';
import './EventsPage.css';

// 類型配置
// Bespoke categorical palette (8 disaster types) — no 1:1 semantic token equivalent, left as literal hex
const TYPE_CONFIG: Record<ReportType, { label: string; icon: string; color: string }> = {
    earthquake: { label: '地震', icon: '🌍', color: '#795548' },
    flood: { label: '淹水', icon: '🌊', color: '#2196F3' },
    fire: { label: '火災', icon: '🔥', color: '#FF5722' },
    typhoon: { label: '颱風', icon: '🌀', color: '#00BCD4' },
    landslide: { label: '土石流', icon: '⛰️', color: '#795548' },
    traffic: { label: '交通事故', icon: '🚗', color: '#FF9800' },
    infrastructure: { label: '設施損壞', icon: '🏗️', color: '#F44336' },
    other: { label: '其他', icon: '📋', color: '#607D8B' },
};

// Bespoke severity color scale (distinct from success/warning/danger — 4 discrete levels), left as literal hex
const SEVERITY_CONFIG: Record<ReportSeverity, { label: string; stars: number; color: string }> = {
    low: { label: '輕微', stars: 1, color: '#4CAF50' },
    medium: { label: '中等', stars: 2, color: '#FF9800' },
    high: { label: '嚴重', stars: 3, color: '#F44336' },
    critical: { label: '緊急', stars: 4, color: '#9C27B0' },
};

// Source brand colors (LINE official green, generic web blue) — no semantic token equivalent, left as literal hex
const SOURCE_CONFIG: Record<ReportSource, { label: string; icon: string; color: string }> = {
    line: { label: 'LINE', icon: '💬', color: '#00B900' },
    web: { label: '網頁', icon: '🌐', color: '#1976D2' },
};

// 格式化時間
function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    return `${days}天前`;
}

function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('zh-TW');
}

type ViewMode = 'card' | 'table';

export default function EventsPage() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const [viewMode, setViewMode] = useState<ViewMode>('card');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [sourceFilter, setSourceFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showTaskModal, setShowTaskModal] = useState(false);
    const [taskForm, setTaskForm] = useState({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });

    // 獲取已確認的回報作為災害回報
    const { data: reportsData, isLoading, error } = useQuery({
        queryKey: ['confirmedReports'],
        queryFn: () => getReports({ status: 'confirmed' }).then(res => res.data.data),
    });

    // 獲取統計
    const { data: statsData } = useQuery({
        queryKey: ['reportStats'],
        queryFn: () => getReportStats().then(res => res.data.data),
    });

    // 獲取志工列表
    const { data: accountsData } = useQuery({
        queryKey: ['accounts'],
        queryFn: () => getAccounts().then(res => res.data),
    });

    // 獲取所有任務
    const { data: tasksData } = useQuery({
        queryKey: ['allTasks'],
        queryFn: () => getTasks({ limit: 500 }).then(res => res.data.data),
    });

    const tasks = (tasksData as Task[]) || [];

    // 建立任務
    const createTaskMutation = useMutation({
        mutationFn: createTask,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['allTasks'] });
            setShowTaskModal(false);
            setTaskForm({ title: '', description: '', priority: 'medium', dueDate: '', assignedTo: '' });
            alert('任務已建立！');
        },
        onError: () => {
            alert('建立任務失敗');
        },
    });

    // 刪除報告
    const deleteReportMutation = useMutation({
        mutationFn: deleteReport,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['confirmedReports'] });
            alert('已刪除事件');
        },
        onError: () => {
            alert('刪除失敗');
        },
    });

    // 權限檢查
    const canAssignTask = (user?.roleLevel ?? 0) >= 2;
    const canDeleteEvent = (user?.roleLevel ?? 0) >= 3;

    const reports = reportsData || [];

    // 計算每個事件的任務狀態
    const getEventTaskStatus = useMemo(() => {
        const statusMap = new Map<string, { pending: number; inProgress: number; completed: number }>();

        tasks.forEach((task: Task) => {
            if (!task.eventId) return;
            const existing = statusMap.get(task.eventId) || { pending: 0, inProgress: 0, completed: 0 };
            if (task.status === 'pending') existing.pending++;
            else if (task.status === 'in_progress') existing.inProgress++;
            else if (task.status === 'completed') existing.completed++;
            statusMap.set(task.eventId, existing);
        });

        return (reportId: string) => statusMap.get(reportId) || null;
    }, [tasks]);

    // 計算來源統計
    const sourceStats = useMemo(() => {
        const stats = { line: 0, web: 0 };
        reports.forEach(report => {
            const source = report.source || 'web';
            stats[source] = (stats[source] || 0) + 1;
        });
        return stats;
    }, [reports]);

    // 過濾
    const filteredReports = reports.filter(report => {
        if (typeFilter && report.type !== typeFilter) return false;
        if (sourceFilter && (report.source || 'web') !== sourceFilter) return false;
        if (searchQuery && !report.title.includes(searchQuery) && !report.description.includes(searchQuery)) return false;
        return true;
    });

    // 開啟詳情彈窗
    const openDetailModal = (report: Report) => {
        setSelectedReport(report);
        setShowDetailModal(true);
    };

    // 開啟分派任務彈窗
    const openTaskModal = (report: Report) => {
        setSelectedReport(report);
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 3);
        const dueStr = defaultDue.toISOString().split('T')[0];

        setTaskForm({
            title: `處理：${report.title}`,
            description: `【災害回報】${report.description}\n\n【位置】${report.address || `${report.latitude}, ${report.longitude}`}\n【回報人】${report.contactName || '未提供'}\n【聯絡電話】${report.contactPhone || '未提供'}`,
            priority: report.severity === 'critical' ? 'high' : report.severity === 'high' ? 'high' : 'medium',
            dueDate: dueStr,
            assignedTo: '',
        });
        setShowTaskModal(true);
    };

    // 提交任務
    const handleCreateTask = () => {
        if (!taskForm.title.trim()) {
            alert('請輸入任務標題');
            return;
        }
        if (!taskForm.assignedTo) {
            alert('請選擇指派志工');
            return;
        }
        const priorityMap: Record<string, number> = { low: 1, medium: 2, high: 3 };
        createTaskMutation.mutate({
            title: taskForm.title,
            description: taskForm.description,
            priority: priorityMap[taskForm.priority] || 2,
            dueAt: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
            assignedTo: taskForm.assignedTo,
            eventId: selectedReport?.id,
        });
    };

    // 志工主動領取任務
    const handleClaimTask = (report: Report) => {
        if (!user?.id) {
            alert('請先登入');
            return;
        }
        const priorityMap: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 3 };
        const defaultDue = new Date();
        defaultDue.setDate(defaultDue.getDate() + 3);

        createTaskMutation.mutate({
            title: `處理：${report.title}`,
            description: `【災害回報】${report.description}\n\n【位置】${report.address || `${report.latitude}, ${report.longitude}`}\n【回報人】${report.contactName || '未提供'}\n【聯絡電話】${report.contactPhone || '未提供'}`,
            priority: priorityMap[report.severity] || 2,
            dueAt: defaultDue.toISOString(),
            assignedTo: user.id,
            eventId: report.id,
        });
    };

    if (isLoading) {
        return (
            <div className="page events-page">
                <div className="page-header">
                    <h2>災害回報</h2>
                </div>
                <div className="loading-state">載入中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page events-page">
                <div className="page-header">
                    <h2>災害回報</h2>
                </div>
                <div className="error-state">載入失敗，請重試</div>
            </div>
        );
    }

    return (
        <div className="page events-page">
            {/* 頁面標題區 */}
            <div className="page-header">
                <div className="page-header__left">
                    <h2>🚨 災害回報</h2>
                    <span className="header-badge">{filteredReports.length} 件</span>
                </div>
                <div className="page-header__right">
                    <Button variant="primary" onClick={() => window.location.href = '/report'}>
                        📝 新增回報
                    </Button>
                </div>
            </div>

            {/* 統計儀表板 */}
            <div className="events-stats">
                <div className="stat-card stat-card--total">
                    <div className="stat-card__icon">📊</div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{statsData?.confirmed || filteredReports.length}</div>
                        <div className="stat-card__label">已確認回報</div>
                    </div>
                </div>
                <div className="stat-card stat-card--line">
                    <div className="stat-card__icon">💬</div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{sourceStats.line}</div>
                        <div className="stat-card__label">LINE 回報</div>
                    </div>
                </div>
                <div className="stat-card stat-card--web">
                    <div className="stat-card__icon">🌐</div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{sourceStats.web}</div>
                        <div className="stat-card__label">網頁回報</div>
                    </div>
                </div>
                <div className="stat-card stat-card--pending">
                    <div className="stat-card__icon">⏳</div>
                    <div className="stat-card__content">
                        <div className="stat-card__value">{statsData?.pending || 0}</div>
                        <div className="stat-card__label">待審核</div>
                    </div>
                </div>
            </div>

            {/* 篩選器 */}
            <div className="filter-bar">
                <div className="filter-bar__left">
                    <select
                        className="filter-select"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="">所有類別</option>
                        {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                            <option key={key} value={key}>{config.icon} {config.label}</option>
                        ))}
                    </select>
                    <select
                        className="filter-select"
                        value={sourceFilter}
                        onChange={(e) => setSourceFilter(e.target.value)}
                    >
                        <option value="">所有來源</option>
                        <option value="line">💬 LINE</option>
                        <option value="web">🌐 網頁</option>
                    </select>
                    <input
                        type="text"
                        className="filter-search"
                        placeholder="搜尋事件..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="filter-bar__right">
                    <div className="view-toggle">
                        <button
                            className={`view-toggle__btn ${viewMode === 'card' ? 'active' : ''}`}
                            onClick={() => setViewMode('card')}
                            title="卡片視圖"
                        >
                            ▦
                        </button>
                        <button
                            className={`view-toggle__btn ${viewMode === 'table' ? 'active' : ''}`}
                            onClick={() => setViewMode('table')}
                            title="表格視圖"
                        >
                            ☰
                        </button>
                    </div>
                </div>
            </div>

            {filteredReports.length === 0 ? (
                <div className="empty-state">
                    <span>📋</span>
                    <p>目前沒有已確認的災害回報</p>
                </div>
            ) : viewMode === 'card' ? (
                /* 卡片視圖 */
                <div className="events-grid">
                    {filteredReports.map((report) => {
                        const taskStatus = getEventTaskStatus(report.id);
                        const source = report.source || 'web';
                        return (
                            <Card key={report.id} className="event-card" padding="md">
                                {/* 卡片標題列 */}
                                <div className="event-card__header">
                                    <span
                                        className="event-card__type"
                                        style={{ backgroundColor: `${TYPE_CONFIG[report.type]?.color}20`, color: TYPE_CONFIG[report.type]?.color }}
                                    >
                                        {TYPE_CONFIG[report.type]?.icon} {TYPE_CONFIG[report.type]?.label}
                                    </span>
                                    <span
                                        className="event-card__source"
                                        style={{ backgroundColor: `${SOURCE_CONFIG[source]?.color}20`, color: SOURCE_CONFIG[source]?.color }}
                                    >
                                        {SOURCE_CONFIG[source]?.icon} {SOURCE_CONFIG[source]?.label}
                                    </span>
                                </div>

                                {/* 照片預覽 */}
                                {report.photos && report.photos.length > 0 && (
                                    <div className="event-card__photo">
                                        <img src={report.photos[0]} alt="災情照片" />
                                        {report.photos.length > 1 && (
                                            <span className="event-card__photo-count">+{report.photos.length - 1}</span>
                                        )}
                                    </div>
                                )}

                                {/* 標題與描述 */}
                                <h3 className="event-card__title">{report.title}</h3>
                                <p className="event-card__desc">{report.description.substring(0, 80)}...</p>

                                {/* 嚴重程度 */}
                                <div className="event-card__severity">
                                    <span style={{ color: SEVERITY_CONFIG[report.severity]?.color }}>
                                        {'★'.repeat(SEVERITY_CONFIG[report.severity]?.stars || 2)}
                                        {'☆'.repeat(4 - (SEVERITY_CONFIG[report.severity]?.stars || 2))}
                                    </span>
                                    <span className="severity-label">{SEVERITY_CONFIG[report.severity]?.label}</span>
                                </div>

                                {/* 位置與時間 */}
                                <div className="event-card__meta">
                                    <span>📍 {report.address || `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`}</span>
                                    <span>🕐 {formatTimeAgo(report.createdAt)}</span>
                                </div>

                                {/* 任務狀態 */}
                                <div className="event-card__status">
                                    {!taskStatus ? (
                                        <span className="status status-pending">⚪ 未派發</span>
                                    ) : taskStatus.completed === taskStatus.pending + taskStatus.inProgress + taskStatus.completed ? (
                                        <span className="status status-completed">✅ 已完成</span>
                                    ) : taskStatus.inProgress > 0 ? (
                                        <span className="status status-active">🟡 處理中</span>
                                    ) : (
                                        <span className="status status-pending">🔵 已派發</span>
                                    )}
                                </div>

                                {/* 操作按鈕 */}
                                <div className="event-card__actions">
                                    <button className="btn-small" onClick={() => openDetailModal(report)}>
                                        查看
                                    </button>
                                    {user && (
                                        <button
                                            className="btn-small btn-success-outline"
                                            onClick={() => {
                                                if (confirm(`確定要領取「${report.title}」任務嗎？`)) {
                                                    handleClaimTask(report);
                                                }
                                            }}
                                        >
                                            領取
                                        </button>
                                    )}
                                    {canAssignTask && (
                                        <button className="btn-small btn-primary-outline" onClick={() => openTaskModal(report)}>
                                            分派
                                        </button>
                                    )}
                                </div>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                /* 表格視圖 */
                <div className="events-table">
                    <table>
                        <thead>
                            <tr>
                                <th>來源</th>
                                <th>嚴重度</th>
                                <th>事件標題</th>
                                <th>類別</th>
                                <th>狀態</th>
                                <th>時間</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map((report) => {
                                const taskStatus = getEventTaskStatus(report.id);
                                const source = report.source || 'web';
                                return (
                                    <tr key={report.id}>
                                        <td>
                                            <span
                                                className="source-badge"
                                                style={{ backgroundColor: `${SOURCE_CONFIG[source]?.color}20`, color: SOURCE_CONFIG[source]?.color }}
                                            >
                                                {SOURCE_CONFIG[source]?.icon}
                                            </span>
                                        </td>
                                        <td>
                                            <span
                                                className="severity-badge"
                                                style={{ color: SEVERITY_CONFIG[report.severity]?.color }}
                                            >
                                                {'★'.repeat(SEVERITY_CONFIG[report.severity]?.stars || 2)}
                                            </span>
                                        </td>
                                        <td>{report.title}</td>
                                        <td>
                                            <span
                                                className="category-tag"
                                                style={{ backgroundColor: `${TYPE_CONFIG[report.type]?.color}20`, color: TYPE_CONFIG[report.type]?.color }}
                                            >
                                                {TYPE_CONFIG[report.type]?.icon} {TYPE_CONFIG[report.type]?.label || report.type}
                                            </span>
                                        </td>
                                        <td>
                                            {!taskStatus ? (
                                                <span className="status status-pending">⚪ 未派發</span>
                                            ) : taskStatus.completed === taskStatus.pending + taskStatus.inProgress + taskStatus.completed ? (
                                                <span className="status status-completed">✅ 已完成</span>
                                            ) : taskStatus.inProgress > 0 ? (
                                                <span className="status status-active">🟡 處理中</span>
                                            ) : (
                                                <span className="status status-pending">🔵 已派發</span>
                                            )}
                                        </td>
                                        <td>{formatTimeAgo(report.createdAt)}</td>
                                        <td className="actions-cell">
                                            <button className="btn-small" onClick={() => openDetailModal(report)}>
                                                查看
                                            </button>
                                            {user && (
                                                <button
                                                    className="btn-small btn-success-outline"
                                                    onClick={() => {
                                                        if (confirm(`確定要領取「${report.title}」任務嗎？`)) {
                                                            handleClaimTask(report);
                                                        }
                                                    }}
                                                >
                                                    領取
                                                </button>
                                            )}
                                            {canAssignTask && (
                                                <button className="btn-small btn-primary-outline" onClick={() => openTaskModal(report)}>
                                                    分派
                                                </button>
                                            )}
                                            {canDeleteEvent && (
                                                <button
                                                    className="btn-small btn-danger-outline"
                                                    onClick={() => {
                                                        if (confirm(`確定要刪除「${report.title}」嗎？`)) {
                                                            deleteReportMutation.mutate(report.id);
                                                        }
                                                    }}
                                                >
                                                    刪除
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* 詳情彈窗 */}
            {showDetailModal && selectedReport && (
                <Modal
                    isOpen={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    title="災害回報詳情"
                >
                    <div className="event-detail">
                        <div className="event-detail__header">
                            <span
                                className="event-detail__type"
                                style={{ backgroundColor: TYPE_CONFIG[selectedReport.type]?.color }}
                            >
                                {TYPE_CONFIG[selectedReport.type]?.icon} {TYPE_CONFIG[selectedReport.type]?.label}
                            </span>
                            <span
                                className="event-detail__source"
                                style={{ backgroundColor: SOURCE_CONFIG[selectedReport.source || 'web']?.color }}
                            >
                                {SOURCE_CONFIG[selectedReport.source || 'web']?.icon} {SOURCE_CONFIG[selectedReport.source || 'web']?.label}
                            </span>
                            <span
                                className="event-detail__severity"
                                style={{ color: SEVERITY_CONFIG[selectedReport.severity]?.color }}
                            >
                                {SEVERITY_CONFIG[selectedReport.severity]?.label}
                            </span>
                        </div>

                        <h3>{selectedReport.title}</h3>
                        <p className="event-detail__desc">{selectedReport.description}</p>

                        {/* 照片展示 */}
                        {selectedReport.photos && selectedReport.photos.length > 0 && (
                            <div className="event-detail__photos">
                                {selectedReport.photos.map((photo, idx) => (
                                    <img key={idx} src={photo} alt={`照片 ${idx + 1}`} />
                                ))}
                            </div>
                        )}

                        <div className="event-detail__info">
                            <div className="info-row">
                                <span className="info-label">📍 位置</span>
                                <span className="info-value">
                                    {selectedReport.address || `${selectedReport.latitude}, ${selectedReport.longitude}`}
                                </span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">📅 回報時間</span>
                                <span className="info-value">{formatDateTime(selectedReport.createdAt)}</span>
                            </div>
                            <div className="info-row">
                                <span className="info-label">👤 回報人</span>
                                <span className="info-value">
                                    {selectedReport.reporterLineDisplayName || selectedReport.contactName || '(未提供)'}
                                </span>
                            </div>
                            {selectedReport.contactPhone && (
                                <div className="info-row">
                                    <span className="info-label">📞 聯絡電話</span>
                                    <span className="info-value">{selectedReport.contactPhone}</span>
                                </div>
                            )}
                            <div className="info-row">
                                <span className="info-label">✅ 審核人</span>
                                <span className="info-value">{selectedReport.reviewedBy || '(未審核)'}</span>
                            </div>
                        </div>

                        <div className="event-detail__actions">
                            <Button
                                variant="secondary"
                                onClick={() => window.open(`/map?lat=${selectedReport.latitude}&lng=${selectedReport.longitude}`, '_self')}
                            >
                                📍 在地圖查看
                            </Button>
                            {canAssignTask && (
                                <Button
                                    variant="primary"
                                    onClick={() => { setShowDetailModal(false); openTaskModal(selectedReport); }}
                                >
                                    分派任務
                                </Button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* 分派任務彈窗 */}
            {showTaskModal && selectedReport && (
                <Modal
                    isOpen={showTaskModal}
                    onClose={() => setShowTaskModal(false)}
                    title="分派任務"
                >
                    <div className="task-form">
                        <div className="form-group">
                            <label>關聯事件</label>
                            <Card padding="sm" className="related-event-card">
                                <span>{TYPE_CONFIG[selectedReport.type]?.icon}</span>
                                <span>{selectedReport.title}</span>
                            </Card>
                        </div>

                        <div className="form-group">
                            <label>任務標題 *</label>
                            <input
                                type="text"
                                value={taskForm.title}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="輸入任務標題"
                            />
                        </div>

                        <div className="form-group">
                            <label>任務說明</label>
                            <textarea
                                value={taskForm.description}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                                rows={4}
                                placeholder="輸入任務說明"
                            />
                        </div>

                        <div className="form-group">
                            <label>優先級</label>
                            <select
                                value={taskForm.priority}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value }))}
                            >
                                <option value="low">🟢 低</option>
                                <option value="medium">🟡 中</option>
                                <option value="high">🔴 高</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>指派志工 *</label>
                            <select
                                value={taskForm.assignedTo}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, assignedTo: e.target.value }))}
                            >
                                <option value="">-- 請選擇志工 --</option>
                                {accountsData?.map(account => (
                                    <option key={account.id} value={account.id}>
                                        {account.displayName} ({account.email})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>截止日期</label>
                            <input
                                type="date"
                                value={taskForm.dueDate}
                                onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                            />
                        </div>

                        <div className="form-actions">
                            <Button variant="secondary" onClick={() => setShowTaskModal(false)}>
                                取消
                            </Button>
                            <Button
                                variant="primary"
                                onClick={handleCreateTask}
                                disabled={createTaskMutation.isPending}
                            >
                                {createTaskMutation.isPending ? '建立中...' : '建立任務'}
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
