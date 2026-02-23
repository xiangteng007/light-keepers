/**
 * TaskDispatchPage.tsx
 * 
 * C2 Domain - 任務指派頁面
 * 基於核心物件 Task 與 Incident 的完整功能實作 — connected to real API
 */
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
    Send, RefreshCw, Plus, CheckCircle, Clock, AlertTriangle,
    MapPin, User, Search, Zap, Loader2
} from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import { TaskModal, TaskFormData } from '../../components/TaskModal';
import api from '../../utils/api';
import { createLogger } from '../../utils/logger';
import './TaskDispatchPage.css';

const logger = createLogger('TaskDispatch');

interface Task {
    id: string;
    title: string;
    name?: string;
    status: string;
    priority: number;
    assignee?: string | null;
    assigneeName?: string;
    location?: string;
    createdAt?: string;
}

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type FilterType = 'all' | TaskStatus;

export default function TaskDispatchPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch tasks — use general listing endpoint
            const [tasksRes] = await Promise.allSettled([
                api.get('/tasks', { params: { limit: '100' } }),
            ]);

            if (tasksRes.status === 'fulfilled') {
                const data = tasksRes.value.data?.data || tasksRes.value.data || [];
                const items = Array.isArray(data) ? data : (data.tasks || data.items || []);
                setTasks(items);
            } else {
                console.error('Task fetch failed:', tasksRes.reason);
                setError('無法載入任務列表');
            }
        } catch (err: any) {
            console.error('Failed to fetch tasks:', err);
            setError(err?.response?.data?.message || '無法載入資料');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const filteredTasks = useMemo(() => {
        return tasks.filter(task => {
            if (filter !== 'all' && task.status !== filter) return false;
            if (searchQuery && !(task.title || task.name || '').toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [tasks, filter, searchQuery]);

    const taskCounts = useMemo(() => ({
        all: tasks.length,
        pending: tasks.filter(t => t.status === 'pending').length,
        in_progress: tasks.filter(t => t.status === 'in_progress').length,
        completed: tasks.filter(t => t.status === 'completed').length,
    }), [tasks]);

    const getStatusIcon = (status: TaskStatus) => {
        switch (status) {
            case 'pending': return <Clock className="status-icon pending" />;
            case 'in_progress': return <AlertTriangle className="status-icon in-progress" />;
            case 'completed': return <CheckCircle className="status-icon completed" />;
        }
    };

    const getStatusLabel = (status: TaskStatus) => {
        switch (status) {
            case 'pending': return '待派遣';
            case 'in_progress': return '執行中';
            case 'completed': return '已完成';
        }
    };

    const getPriorityClass = (priority: number) => {
        switch (priority) {
            case 1: return 'priority-critical';
            case 2: return 'priority-high';
            case 3: return 'priority-normal';
            default: return '';
        }
    };

    const handleCreateTask = async (task: TaskFormData) => {
        try {
            await api.post('/tasks', task);
            logger.debug('Task created successfully');
            fetchData();
        } catch (err: any) {
            logger.debug('Failed to create task:', err);
        }
    };

    const handleUpdateStatus = async (taskId: string, newStatus: string) => {
        try {
            await api.put(`/tasks/${taskId}/status`, { status: newStatus });
            fetchData();
        } catch (err: any) {
            console.error('Failed to update task status:', err);
        }
    };

    return (
        <PageTemplate
            title="任務指派"
            subtitle="即時派遣與追蹤任務執行狀態"
            icon={Send}
            domain="C2 指揮控制"
        >
            <div className="task-dispatch">
                {/* Stats Bar */}
                <div className="task-stats">
                    <div className={`stat-card ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
                        <span className="stat-count">{taskCounts.all}</span>
                        <span className="stat-label">全部任務</span>
                    </div>
                    <div className={`stat-card ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>
                        <span className="stat-count pending">{taskCounts.pending}</span>
                        <span className="stat-label">待派遣</span>
                    </div>
                    <div className={`stat-card ${filter === 'in_progress' ? 'active' : ''}`} onClick={() => setFilter('in_progress')}>
                        <span className="stat-count in-progress">{taskCounts.in_progress}</span>
                        <span className="stat-label">執行中</span>
                    </div>
                    <div className={`stat-card ${filter === 'completed' ? 'active' : ''}`} onClick={() => setFilter('completed')}>
                        <span className="stat-count completed">{taskCounts.completed}</span>
                        <span className="stat-label">已完成</span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="task-toolbar">
                    <div className="search-box">
                        <Search size={16} />
                        <input
                            type="text"
                            placeholder="搜尋任務..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="toolbar-actions">
                        <button className="btn-icon" title="重新整理" onClick={fetchData} disabled={loading}>
                            <RefreshCw size={18} className={loading ? 'spin' : ''} />
                        </button>
                        <button className="btn-primary" onClick={() => setShowNewTaskModal(true)}>
                            <Plus size={18} />
                            <span>新增任務</span>
                        </button>
                    </div>
                </div>

                {/* Error */}
                {error && (
                    <div style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <AlertTriangle size={16} /> {error}
                    </div>
                )}

                {/* Loading */}
                {loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem', gap: '0.5rem', color: '#94a3b8' }}>
                        <Loader2 size={24} className="spin" />
                        <span>載入任務中...</span>
                    </div>
                )}

                {/* Task List */}
                {!loading && (
                    <div className="task-list">
                        {filteredTasks.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                {error ? '載入失敗' : '暫無任務'}
                            </div>
                        ) : filteredTasks.map(task => (
                            <div key={task.id} className={`task-card ${getPriorityClass(task.priority)}`}>
                                <div className="task-header">
                                    {getStatusIcon(task.status as TaskStatus)}
                                    <span className="task-title">{task.title || task.name}</span>
                                    <span className={`task-status ${task.status}`}>
                                        {getStatusLabel(task.status as TaskStatus)}
                                    </span>
                                </div>
                                <div className="task-meta">
                                    <span className="meta-item">
                                        <MapPin size={14} />
                                        {task.location || '-'}
                                    </span>
                                    <span className="meta-item">
                                        <User size={14} />
                                        {task.assigneeName || task.assignee || '未指派'}
                                    </span>
                                    <span className="meta-item">
                                        <Clock size={14} />
                                        {task.createdAt ? new Date(task.createdAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                    </span>
                                </div>
                                <div className="task-actions">
                                    {task.status === 'pending' && (
                                        <button className="btn-dispatch" onClick={() => handleUpdateStatus(task.id, 'in_progress')}>
                                            <Zap size={14} />
                                            立即派遣
                                        </button>
                                    )}
                                    {task.status === 'in_progress' && (
                                        <button className="btn-complete" onClick={() => handleUpdateStatus(task.id, 'completed')}>
                                            <CheckCircle size={14} />
                                            標記完成
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Personnel panel removed mock data — will show only when API data available */}
            </div>

            {/* Task Modal */}
            <TaskModal
                isOpen={showNewTaskModal}
                onClose={() => setShowNewTaskModal(false)}
                onSubmit={handleCreateTask}
            />
        </PageTemplate>
    );
}
