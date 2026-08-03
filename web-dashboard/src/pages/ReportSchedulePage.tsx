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
/* Trash2(刪除) 無 B3c 對應，誠實保留（見 notes）；
   EmptyState 的 icon prop 型別鎖 LucideIcon（Calendar/FileText 於該處暫留） */
import {
    Calendar,
    Trash2,
    FileText,
} from 'lucide-react';
import { Button, Badge, Modal, InputField } from '../design-system';
import {
    iconRegistry,
    ClockIcon,
    PlusIcon,
    FilesIcon,
    CheckIcon,
    CloseIcon,
    SyncIcon,
    AuditIcon,
    MailIcon,
    DownloadIcon,
    PlayIcon,
    PauseIcon,
} from '../design-system/icons';
import type { BadgeProps } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import './ReportSchedulePage.css';

// 執行狀態 Badge 對照（DESIGN_LANGUAGE.md §3）
const EXECUTION_STATUS: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    completed: { label: '成功', variant: 'success' },
    failed: { label: '失敗', variant: 'danger' },
    running: { label: '執行中', variant: 'warning' },
};

// 報表類型選項（R5/T5c：icon 為 B3c iconRegistry 語意名，卡片以查表渲染；option 純文字）
const REPORT_TYPES = [
    { value: 'volunteer_hours', label: '志工時數報表', icon: 'teams' },
    { value: 'disaster', label: '災害統計報表', icon: 'siren' },
    { value: 'inventory', label: '物資庫存報表', icon: 'inventory' },
    { value: 'inventory_transaction', label: '物資異動報表', icon: 'analytics' },
    { value: 'activity_attendance', label: '活動出席報表', icon: 'calendar' },
];

// 頻率選項
const FREQUENCY_OPTIONS = [
    { value: 'daily', label: '每日' },
    { value: 'weekly', label: '每週' },
    { value: 'monthly', label: '每月' },
];

// 遞送方式
const DELIVERY_METHODS = [
    { value: 'email', label: '電子郵件', icon: MailIcon },
    { value: 'download', label: '下載', icon: DownloadIcon },
    { value: 'storage', label: '雲端儲存', icon: FilesIcon },
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
        return REPORT_TYPES.find(r => r.value === type) || { label: type, icon: 'files' };
    };

    return (
        <div className="report-schedule-page">
            {/* page-header（DESIGN_LANGUAGE.md §7.1） */}
            <header className="schedule-header">
                <div className="schedule-header__title">
                    <h1>報表排程</h1>
                    <p>自動化報表生成與發送</p>
                </div>
                <Button
                    variant="primary"
                    icon={<PlusIcon size={18} aria-hidden="true" />}
                    onClick={() => setShowCreateModal(true)}
                >
                    新增排程
                </Button>
            </header>

            {/* 排程列表 */}
            {loading ? (
                <div className="schedules-grid" aria-busy="true" aria-label="載入排程中">
                    <Skeleton variant="card" height={220} count={3} />
                </div>
            ) : schedules.length === 0 ? (
                <EmptyState
                    icon={Calendar}
                    title="尚無報表排程"
                    description="建立排程以自動化生成與發送報表"
                    action={{ label: '建立第一個排程', onClick: () => setShowCreateModal(true) }}
                />
            ) : (
                <div className="schedules-grid">
                    {schedules.map(schedule => (
                        <article
                            key={schedule.id}
                            className={`schedule-card ${schedule.isActive ? 'is-active' : 'is-inactive'}`}
                        >
                            <div className="schedule-card__header">
                                <span className="schedule-card__icon" aria-hidden="true">
                                    {(() => {
                                        const TypeIcon = iconRegistry[getReportTypeInfo(schedule.reportType).icon] ?? iconRegistry.files;
                                        return <TypeIcon size={24} />;
                                    })()}
                                </span>
                                <div className="schedule-card__title">
                                    <h3>{schedule.name}</h3>
                                    <span className="schedule-card__type">
                                        {getReportTypeInfo(schedule.reportType).label}
                                    </span>
                                </div>
                                <button
                                    type="button"
                                    className={`toggle-btn ${schedule.isActive ? 'is-on' : 'is-off'}`}
                                    onClick={() => handleToggle(schedule)}
                                    aria-pressed={schedule.isActive}
                                    aria-label={schedule.isActive ? `停用「${schedule.name}」排程` : `啟用「${schedule.name}」排程`}
                                    title={schedule.isActive ? '點擊停用' : '點擊啟用'}
                                >
                                    {schedule.isActive ? <PlayIcon size={16} aria-hidden="true" /> : <PauseIcon size={16} aria-hidden="true" />}
                                </button>
                            </div>

                            <div className="schedule-card__status">
                                <Badge variant={schedule.isActive ? 'success' : 'default'} size="sm">
                                    {schedule.isActive ? '啟用中' : '已停用'}
                                </Badge>
                            </div>

                            <div className="schedule-card__info">
                                <div className="info-item">
                                    <ClockIcon size={14} aria-hidden="true" />
                                    <span className="tabular-nums">{formatFrequency(schedule)}</span>
                                </div>
                                <div className="info-item">
                                    {(() => {
                                        const DeliveryIcon = DELIVERY_METHODS.find(d => d.value === schedule.deliveryMethod)?.icon || MailIcon;
                                        return <DeliveryIcon size={14} aria-hidden="true" />;
                                    })()}
                                    <span>{DELIVERY_METHODS.find(d => d.value === schedule.deliveryMethod)?.label || schedule.deliveryMethod}</span>
                                </div>
                            </div>

                            {schedule.description && (
                                <p className="schedule-card__desc">{schedule.description}</p>
                            )}

                            <div className="schedule-card__actions">
                                <button
                                    type="button"
                                    className="action-btn execute"
                                    onClick={() => handleExecute(schedule)}
                                    title="立即執行"
                                >
                                    <PlayIcon size={14} aria-hidden="true" /> 執行
                                </button>
                                <button
                                    type="button"
                                    className="action-btn history"
                                    onClick={() => {
                                        setSelectedSchedule(schedule);
                                        loadExecutions(schedule.id);
                                    }}
                                    title="查看記錄"
                                >
                                    <AuditIcon size={14} aria-hidden="true" /> 記錄
                                </button>
                                <button
                                    type="button"
                                    className="action-btn delete"
                                    onClick={() => handleDelete(schedule)}
                                    aria-label={`刪除「${schedule.name}」排程`}
                                    title="刪除"
                                >
                                    <Trash2 size={14} aria-hidden="true" />
                                </button>
                            </div>
                        </article>
                    ))}
                </div>
            )}

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
        <Modal isOpen onClose={onClose} title="新增報表排程" size="md">
            <form className="create-schedule-form" onSubmit={handleSubmit}>
                <InputField
                    label="排程名稱 *"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="例：每週志工時數統計"
                    required
                    fullWidth
                />

                <div className="form-group">
                    <label htmlFor="report-type">報表類型</label>
                    <select id="report-type" value={reportType} onChange={e => setReportType(e.target.value)}>
                        {REPORT_TYPES.map(type => (
                            <option key={type.value} value={type.value}>
                                {type.label}
                            </option>
                        ))}
                    </select>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="report-frequency">執行頻率</label>
                        <select id="report-frequency" value={frequency} onChange={e => setFrequency(e.target.value)}>
                            {FREQUENCY_OPTIONS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>
                    </div>

                    {frequency === 'weekly' && (
                        <div className="form-group">
                            <label htmlFor="report-day-of-week">週幾</label>
                            <select id="report-day-of-week" value={dayOfWeek} onChange={e => setDayOfWeek(Number(e.target.value))}>
                                {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
                                    <option key={idx} value={idx}>週{day}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {frequency === 'monthly' && (
                        <div className="form-group">
                            <label htmlFor="report-day-of-month">日期</label>
                            <select id="report-day-of-month" value={dayOfMonth} onChange={e => setDayOfMonth(Number(e.target.value))}>
                                {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                                    <option key={day} value={day}>{day} 日</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <InputField
                        label="執行時間"
                        type="time"
                        value={executeAt}
                        onChange={e => setExecuteAt(e.target.value)}
                        fullWidth
                    />
                </div>

                <div className="form-group">
                    <span id="delivery-method-label">遞送方式</span>
                    <div className="delivery-options" role="group" aria-labelledby="delivery-method-label">
                        {DELIVERY_METHODS.map(method => (
                            <button
                                key={method.value}
                                type="button"
                                aria-pressed={deliveryMethod === method.value}
                                className={`delivery-option ${deliveryMethod === method.value ? 'is-selected' : ''}`}
                                onClick={() => setDeliveryMethod(method.value)}
                            >
                                <method.icon size={18} aria-hidden="true" />
                                {method.label}
                            </button>
                        ))}
                    </div>
                </div>

                {deliveryMethod === 'email' && (
                    <InputField
                        label="收件人（多個用逗號分隔）"
                        value={recipients}
                        onChange={e => setRecipients(e.target.value)}
                        placeholder="email1@example.com, email2@example.com"
                        fullWidth
                    />
                )}

                <div className="modal-actions">
                    <Button type="button" variant="secondary" onClick={onClose}>
                        取消
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={!name.trim()}
                        loading={submitting}
                    >
                        建立排程
                    </Button>
                </div>
            </form>
        </Modal>
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
        <Modal isOpen onClose={onClose} title={`${schedule.name} - 執行記錄`} size="md">
            <div className="executions-list">
                {executions.length === 0 ? (
                    <EmptyState icon={FileText} title="尚無執行記錄" variant="minimal" />
                ) : (
                    executions.map(exec => {
                        const statusInfo = EXECUTION_STATUS[exec.status];
                        return (
                            <div key={exec.id} className={`execution-item execution-item--${exec.status}`}>
                                <div className="execution-item__status" aria-hidden="true">
                                    {exec.status === 'completed' && <CheckIcon className="is-success" />}
                                    {exec.status === 'failed' && <CloseIcon className="is-error" />}
                                    {exec.status === 'running' && <SyncIcon className="is-running" />}
                                </div>
                                <div className="execution-item__info">
                                    <span className="time tabular-nums">
                                        {new Date(exec.createdAt).toLocaleString('zh-TW')}
                                    </span>
                                    {statusInfo && (
                                        <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
                                    )}
                                    {exec.durationMs && (
                                        <span className="duration tabular-nums">耗時 {(exec.durationMs / 1000).toFixed(1)}s</span>
                                    )}
                                </div>
                                {exec.outputPath && (
                                    <a href={exec.outputPath} className="download-btn" target="_blank" rel="noopener" aria-label="下載報表">
                                        <DownloadIcon size={14} aria-hidden="true" />
                                    </a>
                                )}
                                {exec.errorMessage && (
                                    <p className="error-message">{exec.errorMessage}</p>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </Modal>
    );
}
