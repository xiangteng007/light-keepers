import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTaskKanban, createTask, updateTask } from '../api';
import type { Task } from '../api';

export default function TasksPage() {
    const queryClient = useQueryClient();
    const [showAddModal, setShowAddModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', description: '', priority: 3 });

    // 獲取看板資料
    const { data: kanban, isLoading } = useQuery({
        queryKey: ['taskKanban'],
        queryFn: () => getTaskKanban().then(res => res.data),
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

    const handleAddTask = () => {
        if (!newTask.title.trim()) return;
        addTaskMutation.mutate(newTask);
    };

    const handleStatusChange = (taskId: string, newStatus: string) => {
        updateTaskMutation.mutate({ id: taskId, status: newStatus });
    };

    if (isLoading) {
        return <div className="page tasks-page"><div className="loading">載入中...</div></div>;
    }

    return (
        <div className="page tasks-page">
            <div className="page-header">
                <h2>任務管理</h2>
                <button className="btn-primary" onClick={() => setShowAddModal(true)}>+ 新增任務</button>
            </div>

            <div className="task-board">
                <TaskColumn
                    title="待處理"
                    status="pending"
                    tasks={kanban?.pending || []}
                    onStatusChange={handleStatusChange}
                />
                <TaskColumn
                    title="進行中"
                    status="in_progress"
                    tasks={kanban?.inProgress || []}
                    onStatusChange={handleStatusChange}
                />
                <TaskColumn
                    title="已完成"
                    status="completed"
                    tasks={kanban?.completed || []}
                    onStatusChange={handleStatusChange}
                />
            </div>

            {/* 新增任務 Modal */}
            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
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
                            <button className="btn-secondary" onClick={() => setShowAddModal(false)}>取消</button>
                            <button
                                className="btn-primary"
                                onClick={handleAddTask}
                                disabled={addTaskMutation.isPending}
                            >
                                {addTaskMutation.isPending ? '新增中...' : '新增任務'}
                            </button>
                        </div>
                    </div>
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
}

function TaskColumn({ title, status, tasks, onStatusChange }: TaskColumnProps) {
    const nextStatus = status === 'pending' ? 'in_progress' : status === 'in_progress' ? 'completed' : null;

    return (
        <div className="task-column">
            <div className={`column-header ${status.replace('_', '-')}`}>
                <span>{title}</span>
                <span className="count">{tasks.length}</span>
            </div>
            <div className="task-list">
                {tasks.length === 0 && (
                    <div className="empty-column">無任務</div>
                )}
                {tasks.map((task) => (
                    <div key={task.id} className={`task-card ${status === 'completed' ? 'completed' : ''}`}>
                        <div className="task-priority">P{task.priority}</div>
                        <div className="task-title">{task.title}</div>
                        {task.description && <div className="task-desc">{task.description}</div>}
                        {nextStatus && (
                            <button
                                className="btn-small"
                                onClick={() => onStatusChange(task.id, nextStatus)}
                            >
                                {nextStatus === 'in_progress' ? '開始處理' : '標記完成'}
                            </button>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
