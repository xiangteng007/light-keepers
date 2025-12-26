import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTaskKanban, createTask, updateTask, deleteTask } from '../api';
import type { Task } from '../api';
import { Button, Card, Tag, Badge } from '../design-system';

export default function TasksPage() {
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', priority: 3 });

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

    // 刪除任務
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
        deleteTaskMutation.mutate(taskId);
    };

    if (isLoading) {
        return <div className="page tasks-page"><div className="loading">載入中...</div></div>;
    }

    const totalTasks = (kanban?.pending?.length || 0) + (kanban?.inProgress?.length || 0) + (kanban?.completed?.length || 0);

    return (
        <div className="page tasks-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>任務管理</h2>
                    <Badge variant="default">共 {totalTasks} 個任務</Badge>
                </div>
                <Button variant="primary" onClick={() => setShowAddModal(true)}>
                    + 新增任務
                </Button>
            </div>

            <div className="task-board">
                <TaskColumn
                    title="待處理"
                    status="pending"
                    tasks={kanban?.pending || []}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                    color="warning"
                />
                <TaskColumn
                    title="進行中"
                    status="in_progress"
                    tasks={kanban?.inProgress || []}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                    color="info"
                />
                <TaskColumn
                    title="已完成"
                    status="completed"
                    tasks={kanban?.completed || []}
                    onStatusChange={handleStatusChange}
                    onDelete={handleDeleteTask}
                    color="success"
                />
            </div>

            {/* 新增任務 Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <Card className="modal" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>新增任務</h3>
                        <div className="form-group">
                            <label>任務標題</label>
                            <input
                                type="text"
                                value={newTask.title}
                                onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                                placeholder="輸入任務標題"
                            />
                        </div>
                        <div className="form-group">
                            <label>描述</label>
                            <textarea
                                value={newTask.description}
                                onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                                placeholder="輸入任務描述（選填）"
                            />
                        </div>
                        <div className="form-group">
                            <label>優先級</label>
                            <select
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
                        <div className="modal-actions">
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
                    </Card>
                </div>
            )}
        </div>
    );
}

interface TaskColumnProps {
    title: string;
    status: string;
    tasks: Task[];
    onStatusChange: (id: string, status: string) => void;
    onDelete: (id: string) => void;
    color: 'warning' | 'info' | 'success';
}

function TaskColumn({ title, status, tasks, onStatusChange, onDelete, color }: TaskColumnProps) {
    const nextStatus = status === 'pending' ? 'in_progress' : status === 'in_progress' ? 'completed' : null;

    const getPriorityColor = (priority: number): 'danger' | 'warning' | 'success' | 'default' => {
        if (priority >= 4) return 'danger';
        if (priority === 3) return 'warning';
        return 'default';
    };

    const handleDelete = (taskId: string, taskTitle: string) => {
        if (confirm(`確定要刪除任務「${taskTitle}」嗎？`)) {
            onDelete(taskId);
        }
    };

    return (
        <div className="task-column">
            <div className={`column-header ${status.replace('_', '-')}`}>
                <span>{title}</span>
                <Badge variant={color} size="sm">{tasks.length}</Badge>
            </div>
            <div className="task-list">
                {tasks.length === 0 && (
                    <div className="empty-column">無任務</div>
                )}
                {tasks.map((task) => (
                    <Card
                        key={task.id}
                        className={`task-card-vi ${status === 'completed' ? 'task-card-vi--completed' : ''}`}
                        padding="sm"
                    >
                        <div className="task-card-vi__header">
                            <Tag color={getPriorityColor(task.priority)} size="sm">
                                P{task.priority}
                            </Tag>
                            <button
                                className="task-delete-btn"
                                onClick={() => handleDelete(task.id, task.title)}
                                title="刪除任務"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="task-card-vi__title">{task.title}</div>
                        {task.description && (
                            <div className="task-card-vi__desc">{task.description}</div>
                        )}
                        {nextStatus && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => onStatusChange(task.id, nextStatus)}
                            >
                                {nextStatus === 'in_progress' ? '開始處理' : '標記完成'}
                            </Button>
                        )}
                    </Card>
                ))}
            </div>
        </div>
    );
}
