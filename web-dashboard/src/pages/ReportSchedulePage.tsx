/**
 * 報表排程管理頁面
 * Report Schedule Management Page
 */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getReportSchedules,
    createReportSchedule,
    toggleReportSchedule,
    executeReportSchedule,
    deleteReportSchedule,
    getScheduleExecutions,
    type ReportSchedule,
    type ReportExecution,
} from '../api/services';
import {
    Calendar,
    Clock,
    Play,
    Pause,
    Trash2,
    Plus,
    FileText,
    Mail,
    Download,
    CheckCircle,
    XCircle,
    AlertCircle,
    X,
} from 'lucide-react';
import './ReportSchedulePage.css';

// 報表類型選項
const REPORT_TYPES = [
    { value: 'volunteer_hours', label: '志工時數報表', icon: '👥' },
    { value: 'disaster', label: '災害統計報表', icon: '🚨' },
    { value: 'inventory', label: '物資庫存報表', icon: '📦' },
    { value: 'inventory_transaction', label: '物資異動報表', icon: '📊' },
    { value: 'activity_attendance', label: '活動出席報表', icon: '📅' },
];

// 頻率選項
const FREQUENCY_OPTIONS = [
    { value: 'daily', label: '每日' },
    { value: 'weekly', label: '每週' },
    { value: 'monthly', label: '每月' },
];

// 遞送方式
const DELIVERY_METHODS = [
    { value: 'email', label: '電子郵件', icon: Mail },
    { value: 'download', label: '下載', icon: Download },
    { value: 'storage', label: '雲端儲存', icon: FileText },
];

export default function ReportSchedulePage() {
    const { user } = useAuth();

    const [schedules, setSchedules] = useState<ReportSchedule[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [selectedSchedule, setSelectedSchedule] = useState<ReportSchedule | null>(null);
    const [executions, setExecutions] = useState<ReportExecution[]>([]);

    // 載入排程列表
    const loadSchedules = async () => {
        try {
            setLoading(true);
            const res = await getReportSchedules();
            setSchedules(res.data.data || []);
        } catch (error) {
            console.error('Failed to load schedules:', error);
        } finally {
            setLoading(false);
        }
    };

    // 載入執行記錄
    const loadExecutions = async (scheduleId: string) => {
        try {
            const res = await getScheduleExecutions(scheduleId, 10);
            setExecutions(res.data.data || []);
        } catch (error) {
            console.error('Failed to load executions:', error);
        }
    };

    useEffect(() => {
        loadSchedules();
    }, []);

    // 切換啟用狀態
    const handleToggle = async (schedule: ReportSchedule) => {
        try {
            await toggleReportSchedule(schedule.id);
            loadSchedules();
        } catch (error) {
            console.error('Failed to toggle schedule:', error);
        }
    };

    // 立即執行
    const handleExecute = async (schedule: ReportSchedule) => {
        if (!confirm(`確定要立即執行「${schedule.name}」排程嗎？`)) return;
        try {
            await executeReportSchedule(schedule.id);
            alert('報表已開始生成，請稍後查看執行記錄');
            if (selectedSchedule?.id === schedule.id) {
                loadExecutions(schedule.id);
            }
        } catch (error) {
            console.error('Failed to execute schedule:', error);
            alert('執行失敗，請稍後再試');
        }
    };

    // 刪除排程
    const handleDelete = async (schedule: ReportSchedule) => {
        if (!confirm(`確定要刪除「${schedule.name}」排程嗎？`)) return;
        try {
            await deleteReportSchedule(schedule.id);
            loadSchedules();
            if (selectedSchedule?.id === schedule.id) {
                setSelectedSchedule(null);
            }
        } catch (error) {
            console.error('Failed to delete schedule:', error);
            alert('刪除失敗，請稍後再試');
        }
    };

    // 格式化頻率
    const formatFrequency = (schedule: ReportSchedule) => {
        const freq = FREQUENCY_OPTIONS.find(f => f.value === schedule.frequency);
        let detail = '';
        if (schedule.frequency === 'weekly' && schedule.dayOfWeek !== undefined) {
            const days = ['日', '一', '二', '三', '四', '五', '六'];
            detail = ` 週${days[schedule.dayOfWeek]}`;
        } else if (schedule.frequency === 'monthly' && schedule.dayOfMonth) {
            detail = ` ${schedule.dayOfMonth}日`;
        }
        return `${freq?.label || schedule.frequency}${detail} ${schedule.executeAt}`;
    };

    // 取得報表類型資訊
    const getReportTypeInfo = (type: string) => {
        return REPORT_TYPES.find(r => r.value === type) || { label: type, icon: '📄' };
    };

    return (
        <div className="report-schedule-page">
            {/* 頁面標題 */}
            <header className="schedule-header">
                <div className="schedule-header__title">
                    <h1>📋 報表排程</h1>
                    <p>自動化報表生成與發送</p>
                </div>
                <button
                    className="schedule-header__create-btn"
                    onClick={() => setShowCreateModal(true)}
                >
                    <Plus size={18} />
                    新增排程
                </button>
            </header>

            {/* 排程列表 */}
            <div className="schedules-grid">
                {loading ? (
                    <div className="loading">載入中...</div>
                ) : schedules.length === 0 ? (
                    <div className="empty">
                        <Calendar size={48} />
                        <p>尚無報表排程</p>
                        <button onClick={() => setShowCreateModal(true)}>建立第一個排程</button>
                    </div>
                ) : (
                    schedules.map(schedule => (
                        <article
                            key={schedule.id}
                            className={`schedule-card ${schedule.isActive ? 'active' : 'inactive'}`}
                        >
                            <div className="schedule-card__header">
                                <span className="schedule-card__icon">
                                    {getReportTypeInfo(schedule.reportType).icon}
                                </span>
                                <div className="schedule-card__title">
                                    <h3>{schedule.name}</h3>
                                    <span className="schedule-card__type">
                                        {getReportTypeInfo(schedule.reportType).label}
                                    </span>
                                </div>
                                <button
                                    className={`toggle-btn ${schedule.isActive ? 'on' : 'off'}`}
                                    onClick={() => handleToggle(schedule)}
                                    title={schedule.isActive ? '點擊停用' : '點擊啟用'}
                                >
                                    {schedule.isActive ? <Play size={16} /> : <Pause size={16} />}
                                </button>
                            </div>

                            <div className="schedule-card__info">
                                <div className="info-item">
                                    <Clock size={14} />
                                    <span>{formatFrequency(schedule)}</span>
                                </div>
                                <div className="info-item">
                                    {React.createElement(DELIVERY_METHODS.find(d => d.value === schedule.deliveryMethod)?.icon || Mail, { size: 14 })}
                                    <span>{DELIVERY_METHODS.find(d => d.value === schedule.deliveryMethod)?.label || schedule.deliveryMethod}</span>
                                </div>
                            </div>

                            {schedule.description && (
                                <p className="schedule-card__desc">{schedule.description}</p>
                            )}

                            <div className="schedule-card__actions">
                                <button
                                    className="action-btn execute"
                                    onClick={() => handleExecute(schedule)}
                                    title="立即執行"
                                >
                                    <Play size={14} /> 執行
                                </button>
                                <button
                                    className="action-btn history"
                                    onClick={() => {
                                        setSelectedSchedule(schedule);
                                        loadExecutions(schedule.id);
                                    }}
                                    title="查看記錄"
                                >
                                    <FileText size={14} /> 記錄
                                </button>
                                <button
                                    className="action-btn delete"
                                    onClick={() => handleDelete(schedule)}
                                    title="刪除"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </article>
                    ))
                )}
            </div>

            {/* 新增排程 Modal */}
            {showCreateModal && (
                <CreateScheduleModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={() => {
                        setShowCreateModal(false);
                        loadSchedules();
                    }}
                    user={user}
                />
            )}

            {/* 執行記錄 Modal */}
            {selectedSchedule && (
                <ExecutionHistoryModal
                    schedule={selectedSchedule}
                    executions={executions}
                    onClose={() => setSelectedSchedule(null)}
                />
            )}
        </div>
    );
}

// ===== 新增排程 Modal =====
function CreateScheduleModal({
    onClose,
    onSuccess,
    user,
}: {
    onClose: () => void;
    onSuccess: () => void;
    user: any;
}) {
    const [name, setName] = useState('');
    const [reportType, setReportType] = useState('volunteer_hours');
    const [frequency, setFrequency] = useState('weekly');
    const [executeAt, setExecuteAt] = useState('08:00');
    const [dayOfWeek, setDayOfWeek] = useState(1);
    const [dayOfMonth, setDayOfMonth] = useState(1);
    const [deliveryMethod, setDeliveryMethod] = useState('email');
    const [recipients, setRecipients] = useState(user?.email || '');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            setSubmitting(true);
            await createReportSchedule({
                name: name.trim(),
                reportType: reportType as any,
                frequency: frequency as any,
                executeAt,
                dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
                dayOfMonth: frequency === 'monthly' ? dayOfMonth : undefined,
                deliveryMethod: deliveryMethod as any,
                recipients: deliveryMethod === 'email' ? recipients : undefined,
                isActive: true,
                periodType: 'previous',
            });
            onSuccess();
        } catch (error) {
            console.error('Failed to create schedule:', error);
            alert('建立失敗，請稍後再試');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content create-schedule-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>新增報表排程</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label>排程名稱 *</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="例：每週志工時數統計"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label>報表類型</label>
                        <select value={reportType} onChange={e => setReportType(e.target.value)}>
                            {REPORT_TYPES.map(type => (
                                <option key={type.value} value={type.value}>
                                    {type.icon} {type.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-group">
                            <label>執行頻率</label>
                            <select value={frequency} onChange={e => setFrequency(e.target.value)}>
                                {FREQUENCY_OPTIONS.map(f => (
                                    <option key={f.value} value={f.value}>{f.label}</option>
                                ))}
                            </select>
                        </div>

                        {frequency === 'weekly' && (
                            <div className="form-group">
                                <label>週幾</label>
                                <select value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}>
                                    {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
                                        <option key={idx} value={idx}>週{day}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {frequency === 'monthly' && (
                            <div className="form-group">
                                <label>日期</label>
                                <select value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))}>
                                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                        <option key={day} value={day}>{day} 日</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="form-group">
                            <label>執行時間</label>
                            <input
                                type="time"
                                value={executeAt}
                                onChange={e => setExecuteAt(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label>遞送方式</label>
                        <div className="delivery-options">
                            {DELIVERY_METHODS.map(method => (
                                <button
                                    key={method.value}
                                    type="button"
                                    className={`delivery-option ${deliveryMethod === method.value ? 'selected' : ''}`}
                                    onClick={() => setDeliveryMethod(method.value)}
                                >
                                    <method.icon size={18} />
                                    {method.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {deliveryMethod === 'email' && (
                        <div className="form-group">
                            <label>收件人（多個用逗號分隔）</label>
                            <input
                                type="text"
                                value={recipients}
                                onChange={e => setRecipients(e.target.value)}
                                placeholder="email1@example.com, email2@example.com"
                            />
                        </div>
                    )}

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            取消
                        </button>
                        <button
                            type="submit"
                            className="btn-primary"
                            disabled={submitting || !name.trim()}
                        >
                            {submitting ? '建立中...' : '建立排程'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===== 執行記錄 Modal =====
function ExecutionHistoryModal({
    schedule,
    executions,
    onClose,
}: {
    schedule: ReportSchedule;
    executions: ReportExecution[];
    onClose: () => void;
}) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content execution-history-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{schedule.name} - 執行記錄</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="executions-list">
                    {executions.length === 0 ? (
                        <div className="empty">
                            <FileText size={32} />
                            <p>尚無執行記錄</p>
                        </div>
                    ) : (
                        executions.map(exec => (
                            <div key={exec.id} className={`execution-item ${exec.status}`}>
                                <div className="execution-item__status">
                                    {exec.status === 'completed' && <CheckCircle className="success" />}
                                    {exec.status === 'failed' && <XCircle className="error" />}
                                    {exec.status === 'running' && <AlertCircle className="running" />}
                                </div>
                                <div className="execution-item__info">
                                    <span className="time">
                                        {new Date(exec.createdAt).toLocaleString('zh-TW')}
                                    </span>
                                    <span className={`status-badge ${exec.status}`}>
                                        {exec.status === 'completed' && '成功'}
                                        {exec.status === 'failed' && '失敗'}
                                        {exec.status === 'running' && '執行中'}
                                    </span>
                                    {exec.durationMs && (
                                        <span className="duration">耗時 {(exec.durationMs / 1000).toFixed(1)}s</span>
                                    )}
                                </div>
                                {exec.outputPath && (
                                    <a href={exec.outputPath} className="download-btn" target="_blank" rel="noopener">
                                        <Download size={14} />
                                    </a>
                                )}
                                {exec.errorMessage && (
                                    <p className="error-message">{exec.errorMessage}</p>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
