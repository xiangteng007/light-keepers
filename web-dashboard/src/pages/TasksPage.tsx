import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronRight, X, CalendarClock, ArrowRight } from 'lucide-react';
import { getTaskKanban, createTask, updateTask, deleteTask } from '../api';
import type { Task } from '../api';
import { Button, Card, Tag, Badge, Modal, InputField } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import './TasksPage.css';

/**
 * TasksPage — 任務看板
 * Archetype: Board（DESIGN_LANGUAGE.md §7.3 的範例頁）
 * 欄＝狀態（待處理/進行中/已完成），欄頭計數 Badge；卡片＝任務（優先度＋標題＋截止時間＋快速狀態按鈕）。
 * 行動端：頂部 segmented tabs 切換欄，不做水平多欄捲動；狀態變更用卡片上的快速按鈕（單手可及）。
 */

type ColumnStatus = 'pending' | 'in_progress' | 'completed';

const COLUMNS: { status: ColumnStatus; title: string; badgeVariant: 'warning' | 'info' | 'success' }[] = [
    { status: 'pending', title: '待處理', badgeVariant: 'warning' },
    { status: 'in_progress', title: '進行中', badgeVariant: 'info' },
    { status: 'completed', title: '已完成', badgeVariant: 'success' },
];

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
            <div className="page-header">
                <div className="page-header__left">
                    <h1>任務管理</h1>
                    <Badge variant="default">共 {totalTasks} 個任務</Badge>
                </div>
                <Button variant="primary" onClick={() => setShowAddModal(true)}>
                    + 新增任務
                </Button>
            </div>

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
                        {col.title}
                        <span className="tasks-page__mobile-tab-count tabular-nums">{columnTasks[col.status].length}</span>
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="task-board" aria-busy="true" aria-label="載入任務看板中">
                    {COLUMNS.map(col => (
                        <div key={col.status} className="task-column">
                            <Skeleton variant="card" height={72} count={3} />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="task-board">
                    {COLUMNS.map(col => (
                        <TaskColumn
                            key={col.status}
                            title={col.title}
                            status={col.status}
                            tasks={columnTasks[col.status]}
                            onStatusChange={handleStatusChange}
                            onDelete={handleDeleteTask}
                            badgeVariant={col.badgeVariant}
                            className={activeColumn === col.status ? 'is-active-mobile' : ''}
                        />
                    ))}
                </div>
            )}

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
    title: string;
    status: ColumnStatus;
    tasks: Task[];
    onStatusChange: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    badgeVariant: 'warning' | 'info' | 'success';
    className?: string;
}

function TaskColumn({ title, status, tasks, onStatusChange, onDelete, badgeVariant, className = '' }: TaskColumnProps) {
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

    const getPriorityTagColor = (priority: number): 'danger' | 'warning' | 'success' | 'default' => {
        if (priority >= 4) return 'danger';
        if (priority === 3) return 'warning';
        return 'default';
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
        <div className={`task-column ${className}`} role="tabpanel" aria-label={title}>
            <div className="task-column__header">
                <span>{title}</span>
                <Badge variant={badgeVariant} size="sm">{tasks.length}</Badge>
            </div>
            <div className="task-column__list">
                {tasks.length === 0 && (
                    <EmptyState variant="minimal" title="無任務" />
                )}
                {tasks.map((task) => {
                    const isExpanded = expandedIds.has(task.id);
                    return (
                        <Card
                            key={task.id}
                            className={`task-card ${status === 'completed' ? 'task-card--completed' : ''} ${isExpanded ? 'task-card--expanded' : ''}`}
                            padding="sm"
                        >
                            {/* 標題列：優先度＋標題＋快速狀態按鈕（行動端單手可及）＋展開切換 */}
                            <div className="task-card__header">
                                <button
                                    type="button"
                                    className="task-card__toggle"
                                    onClick={() => toggleExpand(task.id)}
                                    aria-expanded={isExpanded}
                                >
                                    {isExpanded ? <ChevronDown size={16} aria-hidden="true" /> : <ChevronRight size={16} aria-hidden="true" />}
                                    <Tag color={getPriorityTagColor(task.priority)} size="sm">
                                        P{task.priority}
                                    </Tag>
                                    <span className="task-card__title">{task.title}</span>
                                </button>
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

                            {/* 展開內容 */}
                            {isExpanded && (
                                <div className="task-card__content">
                                    {task.description && (
                                        <p className="task-card__desc">{task.description}</p>
                                    )}
                                    {task.dueAt && (
                                        <div className="task-card__due">
                                            <CalendarClock size={14} aria-hidden="true" />
                                            <span className="tabular-nums">截止：{new Date(task.dueAt).toLocaleDateString('zh-TW')}</span>
                                        </div>
                                    )}
                                    {nextStatus && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => onStatusChange(task.id, nextStatus)}
                                        >
                                            {nextStatusLabel}
                                        </Button>
                                    )}
                                </div>
                            )}
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
