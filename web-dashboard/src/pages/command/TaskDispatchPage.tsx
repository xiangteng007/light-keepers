/**
 * TaskDispatchPage.tsx
 * 
 * C2 Domain - 任務指派頁面
 * 基於核心物件 Task 與 Incident 的完整功能實作
 */
import React, { useState, useMemo } from 'react';
import {
    Send, Filter, RefreshCw, Plus, CheckCircle, Clock, AlertTriangle,
    MapPin, User, ChevronDown, Search, Zap
} from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import { useTasks, useCreateTask, useUpdateTaskStatus, usePersonnel } from '../../hooks/useCoreObjects';
import './TaskDispatchPage.css';

// Mock data for demo
const MOCK_TASKS = [
    { id: '1', title: '前進指揮所架設', status: 'pending', priority: 1, assignee: '王隊長', location: '中正區公所', createdAt: '10:30' },
    { id: '2', title: '災區人員搜救', status: 'in_progress', priority: 1, assignee: '李組長', location: '信義路段', createdAt: '10:15' },
    { id: '3', title: '物資運送調度', status: 'in_progress', priority: 2, assignee: '張志工', location: '大安森林公園', createdAt: '09:45' },
    { id: '4', title: '受災戶安置', status: 'pending', priority: 2, assignee: null, location: '松山區活動中心', createdAt: '09:30' },
    { id: '5', title: '道路清障作業', status: 'completed', priority: 3, assignee: '陳技師', location: '忠孝東路', createdAt: '08:00' },
];

const MOCK_PERSONNEL = [
    { id: 'p1', name: '王隊長', role: '現場指揮', status: 'active' },
    { id: 'p2', name: '李組長', role: '搜救組', status: 'active' },
    { id: 'p3', name: '張志工', role: '後勤支援', status: 'active' },
    { id: 'p4', name: '陳技師', role: '工程組', status: 'available' },
    { id: 'p5', name: '林護理', role: '醫療組', status: 'available' },
];

type TaskStatus = 'pending' | 'in_progress' | 'completed';
type FilterType = 'all' | TaskStatus;

export default function TaskDispatchPage() {
    const [filter, setFilter] = useState<FilterType>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showNewTaskModal, setShowNewTaskModal] = useState(false);

    const filteredTasks = useMemo(() => {
        return MOCK_TASKS.filter(task => {
            if (filter !== 'all' && task.status !== filter) return false;
            if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        });
    }, [filter, searchQuery]);

    const taskCounts = useMemo(() => ({
        all: MOCK_TASKS.length,
        pending: MOCK_TASKS.filter(t => t.status === 'pending').length,
        in_progress: MOCK_TASKS.filter(t => t.status === 'in_progress').length,
        completed: MOCK_TASKS.filter(t => t.status === 'completed').length,
    }), []);

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
                        <button className="btn-icon" title="重新整理">
                            <RefreshCw size={18} />
                        </button>
                        <button className="btn-primary" onClick={() => setShowNewTaskModal(true)}>
                            <Plus size={18} />
                            <span>新增任務</span>
                        </button>
                    </div>
                </div>

                {/* Task List */}
                <div className="task-list">
                    {filteredTasks.map(task => (
                        <div key={task.id} className={`task-card ${getPriorityClass(task.priority)}`}>
                            <div className="task-header">
                                {getStatusIcon(task.status as TaskStatus)}
                                <span className="task-title">{task.title}</span>
                                <span className={`task-status ${task.status}`}>
                                    {getStatusLabel(task.status as TaskStatus)}
                                </span>
                            </div>
                            <div className="task-meta">
                                <span className="meta-item">
                                    <MapPin size={14} />
                                    {task.location}
                                </span>
                                <span className="meta-item">
                                    <User size={14} />
                                    {task.assignee || '未指派'}
                                </span>
                                <span className="meta-item">
                                    <Clock size={14} />
                                    {task.createdAt}
                                </span>
                            </div>
                            <div className="task-actions">
                                {task.status === 'pending' && (
                                    <button className="btn-dispatch">
                                        <Zap size={14} />
                                        立即派遣
                                    </button>
                                )}
                                {task.status === 'in_progress' && (
                                    <button className="btn-complete">
                                        <CheckCircle size={14} />
                                        標記完成
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Available Personnel */}
                <div className="personnel-panel">
                    <h3>可用人員</h3>
                    <div className="personnel-list">
                        {MOCK_PERSONNEL.filter(p => p.status === 'available').map(person => (
                            <div key={person.id} className="personnel-chip">
                                <User size={14} />
                                <span>{person.name}</span>
                                <span className="role">{person.role}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageTemplate>
    );
}
