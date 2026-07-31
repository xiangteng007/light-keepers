/* eslint-disable no-restricted-syntax -- FE-4 遷移待辦（工作項 3.2）：本檔裸 fetch 待遷移至 src/api/client；見 docs/architecture/API_CLIENT_CONSOLIDATION.md */
/**
 * Scheduler Management Page
 * Admin page for managing scheduled tasks
 */

import React, { useState, useEffect } from 'react';
import './SchedulerPage.css';

interface ScheduledTask {
    id: string;
    name: string;
    handler: string;
    schedule: string;
    enabled: boolean;
    lastRun?: string;
    nextRun?: string;
    runCount: number;
    lastError?: string;
}

const AVAILABLE_HANDLERS = [
    { id: 'health-check', name: '健康檢查', description: '檢查系統狀態' },
    { id: 'cleanup-old-data', name: '清理舊資料', description: '刪除過期資料' },
    { id: 'sync-external-data', name: '同步外部資料', description: '同步 NCDR 警報等' },
    { id: 'generate-daily-report', name: '生成日報表', description: '自動產生每日報表' },
];

const CRON_PRESETS = [
    { label: '每分鐘', value: '* * * * *' },
    { label: '每5分鐘', value: '*/5 * * * *' },
    { label: '每小時', value: '0 * * * *' },
    { label: '每天午夜', value: '0 0 * * *' },
    { label: '每天早上8點', value: '0 8 * * *' },
    { label: '每週一', value: '0 0 * * 1' },
];

const SchedulerPage: React.FC = () => {
    const [tasks, setTasks] = useState<ScheduledTask[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        handler: 'health-check',
        schedule: '*/5 * * * *',
    });

    useEffect(() => {
        loadTasks();
    }, []);

    const loadTasks = async () => {
        try {
            const response = await fetch('/api/scheduler/tasks');
            if (response.ok) {
                const data = await response.json();
                setTasks(data.data || []);
            }
        } catch (error) {
            console.error('Failed to load tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const createTask = async () => {
        try {
            const response = await fetch('/api/scheduler/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            if (response.ok) {
                setShowModal(false);
                loadTasks();
            }
        } catch (error) {
            console.error('Failed to create task:', error);
        }
    };

    const toggleTask = async (id: string) => {
        try {
            await fetch(`/api/scheduler/tasks/${id}/toggle`, { method: 'POST' });
            loadTasks();
        } catch (error) {
            console.error('Failed to toggle task:', error);
        }
    };

    const runTask = async (id: string) => {
        try {
            const response = await fetch(`/api/scheduler/tasks/${id}/run`, { method: 'POST' });
            if (response.ok) {
                alert('任務已觸發');
                loadTasks();
            }
        } catch (error) {
            console.error('Failed to run task:', error);
        }
    };

    const deleteTask = async (id: string) => {
        if (!confirm('確定要刪除此排程任務？')) return;

        try {
            await fetch(`/api/scheduler/tasks/${id}`, { method: 'DELETE' });
            loadTasks();
        } catch (error) {
            console.error('Failed to delete task:', error);
        }
    };

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return '-';
        return new Date(dateStr).toLocaleString('zh-TW');
    };

    if (loading) {
        return <div className="scheduler-loading">載入中...</div>;
    }

    return (
        <div className="scheduler-page">
            <header className="scheduler-header">
                <div>
                    <h1>⏰ 排程任務管理</h1>
                    <p>自動化系統維護與資料處理</p>
                </div>
                <button className="create-btn" onClick={() => setShowModal(true)}>
                    ➕ 新增任務
                </button>
            </header>

            <div className="task-list">
                {tasks.length === 0 ? (
                    <div className="empty-state">
                        <p>尚未設定任何排程任務</p>
                        <button onClick={() => setShowModal(true)}>建立第一個任務</button>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className={`task-card ${task.enabled ? '' : 'disabled'}`}>
                            <div className="task-status">
                                <span className={`status-dot ${task.enabled ? 'active' : 'inactive'}`} />
                            </div>
                            <div className="task-info">
                                <h3>{task.name}</h3>
                                <p className="task-handler">
                                    {AVAILABLE_HANDLERS.find(h => h.id === task.handler)?.name || task.handler}
                                </p>
                                <div className="task-schedule">
                                    <code>{task.schedule}</code>
                                </div>
                                <div className="task-stats">
                                    <span>🏃 執行次數: {task.runCount}</span>
                                    <span>⏱️ 上次執行: {formatDate(task.lastRun)}</span>
                                    {task.lastError && (
                                        <span className="error">❌ {task.lastError}</span>
                                    )}
                                </div>
                            </div>
                            <div className="task-actions">
                                <button
                                    className="action-btn run"
                                    onClick={() => runTask(task.id)}
                                    title="立即執行"
                                >
                                    ▶️ 執行
                                </button>
                                <button
                                    className={`action-btn toggle ${task.enabled ? 'off' : 'on'}`}
                                    onClick={() => toggleTask(task.id)}
                                >
                                    {task.enabled ? '⏸️ 停用' : '▶️ 啟用'}
                                </button>
                                <button
                                    className="action-btn delete"
                                    onClick={() => deleteTask(task.id)}
                                >
                                    🗑️ 刪除
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>新增排程任務</h2>

                        <div className="form-group">
                            <label>任務名稱</label>
                            <input
                                type="text"
                                value={formData.name}
                                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                placeholder="例如：每小時同步警報"
                            />
                        </div>

                        <div className="form-group">
                            <label>處理器</label>
                            <select
                                value={formData.handler}
                                onChange={e => setFormData(prev => ({ ...prev, handler: e.target.value }))}
                            >
                                {AVAILABLE_HANDLERS.map(handler => (
                                    <option key={handler.id} value={handler.id}>
                                        {handler.name} - {handler.description}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-group">
                            <label>排程 (Cron 表達式)</label>
                            <div className="cron-presets">
                                {CRON_PRESETS.map(preset => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        className={`preset-btn ${formData.schedule === preset.value ? 'active' : ''}`}
                                        onClick={() => setFormData(prev => ({ ...prev, schedule: preset.value }))}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                type="text"
                                value={formData.schedule}
                                onChange={e => setFormData(prev => ({ ...prev, schedule: e.target.value }))}
                                placeholder="* * * * *"
                            />
                            <small>格式: 分 時 日 月 週</small>
                        </div>

                        <div className="modal-actions">
                            <button className="cancel-btn" onClick={() => setShowModal(false)}>
                                取消
                            </button>
                            <button className="save-btn" onClick={createTask}>
                                建立任務
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SchedulerPage;
