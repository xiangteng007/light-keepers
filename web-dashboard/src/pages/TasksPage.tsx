import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, X, CalendarClock, ArrowRight } from 'lucide-react';
import { getTaskKanban, createTask, updateTask, deleteTask } from '../api';
import type { Task } from '../api';
import { Button, Modal, InputField } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import './TasksPage.css';

/**
 * TasksPage — 任務佇列（R5 B3c：c1 佇列語言）
 * Archetype: Board（DESIGN_LANGUAGE.md §7.3 的範例頁）
 * 欄＝狀態（待指派/進行中/完成），chip＋形狀雙編碼（□/■/✓，MIL-STD-2525 色盲安全）；
 * 隊伍代號 .u-stencil、時間戳 .u-mono 右對齊、行動 CTA＝橄欖實心（紅色不出場）。
 * 行動端：頂部 segmented tabs 切換欄，不做水平多欄捲動；狀態變更用列上的快速按鈕（單手可及）。
 */

type ColumnStatus = 'pending' | 'in_progress' | 'completed';

const COLUMNS: {
    status: ColumnStatus;
    title: string;
    /** 拉丁小標（stencil）——與中文標題並置，chip 內做形狀雙編碼 */
    code: string;
    /** 形狀編碼：□ 待指派（描邊）/ ■ 進行中（實心）/ ✓ 完成 */
    glyph: string;
    chipClass: string;
}[] = [
    { status: 'pending', title: '待指派', code: 'PENDING', glyph: '□', chipClass: 'status-chip--pending' },
    { status: 'in_progress', title: '進行中', code: 'ACTIVE', glyph: '■', chipClass: 'status-chip--active' },
    { status: 'completed', title: '完成', code: 'DONE', glyph: '✓', chipClass: 'status-chip--done' },
];

/** 排印鐵律：stencil 寬字距只准用於拉丁/數字；中文代號退回一般字距 */
const isLatinCode = (value: string) => /^[\x20-\x7E]+$/.test(value);

const formatClock = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '--:--';
    return d.toLocaleTimeString('zh-TW', { hour12: false, hour: '2-digit', minute: '2-digit' });
};

export default function TasksPage() {
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', priority: 3 });
    const [activeColumn, setActiveColumn] = useState<ColumnStatus>('pending');

    // 獲取看板資料
    const { data: kanban, isLoading } = useQuery({
        queryKey: ['taskKanban'],
        queryFn: () => getTaskKanban().then(res => res.data.data),
    });

    // 新增任務
    const addTaskMutation = useMutation({
        mutationFn: (data: Partial<Task>) => createTask(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['taskKanban'] });
            queryClient.invalidateQueries({ queryKey: ['taskStats'] });
            setShowAddModal(false);
            setNewTask({ title: '', description: '', priority: 3 });
        },
    });

    // 更新任務狀態
    const updateTaskMutation = useMutation({
        mutationFn: ({ id, status }: { id: string; status: string }) => updateTask(id, { status }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['taskKanban'] });
            queryClient.invalidateQueries({ queryKey: ['taskStats'] });
        },
    });

    // 刪除任務（真正刪除）
    const deleteTaskMutation = useMutation({
        mutationFn: (id: string) => deleteTask(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['taskKanban'] });
            queryClient.invalidateQueries({ queryKey: ['taskStats'] });
        },
    });

    const handleAddTask = () => {
        if (!newTask.title.trim()) return;
        addTaskMutation.mutate(newTask);
    };

    const handleStatusChange = (taskId: string, newStatus: string) => {
        updateTaskMutation.mutate({ id: taskId, status: newStatus });
    };

    const handleDeleteTask = (taskId: string) => {
        // 確認刪除
        if (window.confirm('確定要刪除此任務嗎？此操作無法復原。')) {
            deleteTaskMutation.mutate(taskId);
        }
    };

    const columnTasks: Record<ColumnStatus, Task[]> = {
        pending: kanban?.pending || [],
        in_progress: kanban?.inProgress || [],
        completed: kanban?.completed || [],
    };

    const totalTasks = columnTasks.pending.length + columnTasks.in_progress.length + columnTasks.completed.length;

    return (
        <div className="tasks-page">
            <header className="tasks-page__top">
                <div className="tasks-page__brand">
                    <h1>任務管理</h1>
                    <span className="tasks-page__kicker u-stencil">OPS QUEUE</span>
                </div>
                <span className="tasks-page__total">
                    共 <b className="u-mono">{totalTasks}</b> 個任務
                </span>
                <button type="button" className="tasks-cta" onClick={() => setShowAddModal(true)}>
                    ＋ 新增任務
                </button>
            </header>

            {/* 行動端 segmented tabs：切換欄，不做水平多欄捲動 */}
            <div className="tasks-page__mobile-tabs" role="tablist" aria-label="任務狀態">
                {COLUMNS.map(col => (
                    <button
                        key={col.status}
                        type="button"
                        role="tab"
                        aria-selected={activeColumn === col.status}
                        className={`tasks-page__mobile-tab ${activeColumn === col.status ? 'is-active' : ''}`}
                        onClick={() => setActiveColumn(col.status)}
                    >
                        <span className="tasks-page__mobile-tab-glyph" aria-hidden="true">{col.glyph}</span>
                        {col.title}
                        <span className="tasks-page__mobile-tab-count u-mono">{columnTasks[col.status].length}</span>
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="task-board" aria-busy="true" aria-label="載入任務看板中">
                    {COLUMNS.map(col => (
                        <div key={col.status} className="task-column">
                            <div className="task-column__list">
                                <Skeleton variant="card" height={72} count={3} />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="task-board">
                    {COLUMNS.map(col => (
                        <TaskColumn
                            key={col.status}
                            column={col}
                            tasks={columnTasks[col.status]}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteTask}
                            className={activeColumn === col.status ? 'is-active-mobile' : ''}
                        />
                    ))}
                </div>
            )}

            {/* 圖例：狀態雙編碼（形狀＋顏色，不靠透明度） */}
            <footer className="tasks-page__legend">
                <span>
                    圖例 <i aria-hidden="true">□</i> 待指派 · <i aria-hidden="true" className="is-solid">■</i> 進行中 · <i aria-hidden="true">✓</i> 完成
                </span>
                <span className="tasks-page__legend-code u-stencil">TASK BOARD · B3C</span>
            </footer>

            {/* 新增任務 Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                title="新增任務"
                size="md"
                footer={(
                    <div className="tasks-page__modal-actions">
                        <Button variant="secondary" onClick={() => setShowAddModal(false)}>
                            取消
                        </Button>
                        <Button
                            variant="primary"
                            onClick={handleAddTask}
                            loading={addTaskMutation.isPending}
                        >
                            新增任務
                        </Button>
                    </div>
                )}
            >
                <div className="tasks-page__form">
                    <InputField
                        label="任務標題"
                        value={newTask.title}
                        onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                        placeholder="輸入任務標題"
                        fullWidth
                    />
                    <div className="form-group">
                        <label htmlFor="task-description">描述</label>
                        <textarea
                            id="task-description"
                            value={newTask.description}
                            onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                            placeholder="輸入任務描述（選填）"
                            rows={3}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="task-priority">優先級</label>
                        <select
                            id="task-priority"
                            value={newTask.priority}
                            onChange={e => setNewTask({ ...newTask, priority: Number(e.target.value) })}
                        >
                            <option value={5}>P5 - 緊急</option>
                            <option value={4}>P4 - 高</option>
                            <option value={3}>P3 - 中</option>
                            <option value={2}>P2 - 低</option>
                            <option value={1}>P1 - 最低</option>
                        </select>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

interface TaskColumnProps {
    column: (typeof COLUMNS)[number];
    tasks: Task[];
    onStatusChange: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    className?: string;
}

function TaskColumn({ column, tasks, onStatusChange, onDelete, className = '' }: TaskColumnProps) {
    const { status, title } = column;
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    };

    const nextStatus = status === 'pending' ? 'in_progress' : status === 'in_progress' ? 'completed' : null;
    const nextStatusLabel = nextStatus === 'in_progress' ? '開始處理' : '標記完成';

    // 紅色憲法：優先度不是生命安全語義，不用紅——高＝橄欖實心、中＝橄欖描邊、低＝灰描邊
    const getPriorityChip = (priority: number): { cls: string; glyph: string } => {
        if (priority >= 4) return { cls: 'prio-chip--high', glyph: '■' };
        if (priority === 3) return { cls: 'prio-chip--mid', glyph: '□' };
        return { cls: 'prio-chip--low', glyph: '□' };
    };

    const handleDelete = (e: React.MouseEvent, taskId: string, taskTitle: string) => {
        e.stopPropagation();
        if (confirm(`確定要刪除任務「${taskTitle}」嗎？`)) {
            onDelete(taskId);
        }
    };

    const handleQuickStatus = (e: React.MouseEvent, taskId: string) => {
        e.stopPropagation();
        if (nextStatus) onStatusChange(taskId, nextStatus);
    };

    return (
        <section className={`task-column ${className}`} role="tabpanel" aria-label={title}>
            <header className="task-column__header">
                <span className={`status-chip ${column.chipClass} u-stencil`} aria-hidden="true">
                    {column.glyph} {column.code}
                </span>
                <h2>{title}</h2>
                <span className="task-column__count u-mono" aria-label={`${title} ${tasks.length} 項`}>{tasks.length}</span>
            </header>
            <div className="task-column__list">
                {tasks.length === 0 && (
                    <EmptyState variant="minimal" title="無任務" />
                )}
                {tasks.map((task) => {
                    const isExpanded = expandedIds.has(task.id);
                    const prio = getPriorityChip(task.priority);
                    const clockIso = status === 'completed' && task.completedAt ? task.completedAt : task.createdAt;
                    return (
                        <article
                            key={task.id}
                            className={`task-card ${status === 'completed' ? 'task-card--completed' : ''} ${isExpanded ? 'task-card--expanded' : ''}`}
                        >
                            {/* 標題列：優先度 chip＋標題＋隊伍代號＋時間戳＋快速狀態按鈕（行動端單手可及）＋展開切換 */}
                            <div className="task-card__header">
                                <button
                                    type="button"
                                    className="task-card__toggle"
                                    onClick={() => toggleExpand(task.id)}
                                    aria-expanded={isExpanded}
                                >
                                    {isExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                                    <span className={`prio-chip ${prio.cls} u-stencil`}>
                                        {prio.glyph} P{task.priority}
                                    </span>
                                    <span className="task-card__title">{task.title}</span>
                                </button>
                                <div className="task-card__meta">
                                    {task.assignedTo && (
                                        <span
                                            className={`task-card__team ${isLatinCode(task.assignedTo) ? 'u-stencil' : ''}`}
                                            title={`指派：${task.assignedTo}`}
                                        >
                                            {task.assignedTo}
                                        </span>
                                    )}
                                    <time className="task-card__time u-mono" dateTime={clockIso}>
                                        {formatClock(clockIso)}
                                    </time>
                                    <div className="task-card__actions">
                                        {nextStatus && (
                                            <button
                                                type="button"
                                                className="task-card__quick-status"
                                                onClick={(e) => handleQuickStatus(e, task.id)}
                                                aria-label={`${task.title}：${nextStatusLabel}`}
                                                title={nextStatusLabel}
                                            >
                                                <ArrowRight size={16} aria-hidden="true" />
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            className="task-card__delete"
                                            onClick={(e) => handleDelete(e, task.id, task.title)}
                                            aria-label={`刪除任務：${task.title}`}
                                        >
                                            <X size={16} aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* 展開內容 */}
                            {isExpanded && (
                                <div className="task-card__content">
                                    {task.description && (
                                        <p className="task-card__desc">{task.description}</p>
                                    )}
                                    {task.dueAt && (
                                        <div className="task-card__due">
                                            <CalendarClock size={14} aria-hidden="true" />
                                            <span className="u-mono">截止：{new Date(task.dueAt).toLocaleDateString('zh-TW')}</span>
                                        </div>
                                    )}
                                    {nextStatus && (
                                        <button
                                            type="button"
                                            className="task-card__advance"
                                            onClick={() => onStatusChange(task.id, nextStatus)}
                                        >
                                            {nextStatusLabel} <span className="u-mono" aria-hidden="true">→</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </article>
                    );
                })}
            </div>
        </section>
    );
}
