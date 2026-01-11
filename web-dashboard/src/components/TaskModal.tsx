/**
 * TaskModal.tsx
 * 
 * Modal for creating and editing tasks
 * Used in TaskDispatchPage and other task management interfaces
 */
import React, { useState } from 'react';
import { X, MapPin, Calendar, Clock, Users, AlertTriangle } from 'lucide-react';
import './TaskModal.css';

interface TaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (task: TaskFormData) => void;
    initialData?: Partial<TaskFormData>;
}

export interface TaskFormData {
    title: string;
    description: string;
    type: string;
    priority: string;
    location: string;
    assignedTeam: string;
    estimatedDuration: number;
    scheduledStart: string;
}

const TASK_TYPES = [
    { value: 'search', label: '搜索' },
    { value: 'rescue', label: '救援' },
    { value: 'medical', label: '醫療' },
    { value: 'evacuation', label: '疏散' },
    { value: 'logistics', label: '後勤' },
    { value: 'assessment', label: '評估' },
    { value: 'patrol', label: '巡邏' },
];

const PRIORITIES = [
    { value: 'critical', label: '緊急', color: '#ef4444' },
    { value: 'high', label: '高', color: '#f97316' },
    { value: 'medium', label: '中', color: '#f59e0b' },
    { value: 'low', label: '低', color: '#22c55e' },
];

const MOCK_TEAMS = [
    { id: 'team1', name: 'A小隊 - 搜救' },
    { id: 'team2', name: 'B小隊 - 醫療' },
    { id: 'team3', name: 'C小隊 - 後勤' },
    { id: 'team4', name: 'D小隊 - 通訊' },
];

export function TaskModal({ isOpen, onClose, onSubmit, initialData }: TaskModalProps) {
    const [formData, setFormData] = useState<TaskFormData>({
        title: initialData?.title || '',
        description: initialData?.description || '',
        type: initialData?.type || 'rescue',
        priority: initialData?.priority || 'medium',
        location: initialData?.location || '',
        assignedTeam: initialData?.assignedTeam || '',
        estimatedDuration: initialData?.estimatedDuration || 60,
        scheduledStart: initialData?.scheduledStart || '',
    });

    const handleChange = (field: keyof TaskFormData, value: string | number) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="task-modal-overlay" onClick={onClose}>
            <div className="task-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>新增任務</h2>
                    <button className="close-btn" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-section">
                        <label className="form-label">任務名稱 *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.title}
                            onChange={e => handleChange('title', e.target.value)}
                            placeholder="輸入任務名稱"
                            required
                        />
                    </div>

                    <div className="form-section">
                        <label className="form-label">任務描述</label>
                        <textarea
                            className="form-textarea"
                            value={formData.description}
                            onChange={e => handleChange('description', e.target.value)}
                            placeholder="描述任務內容與目標"
                            rows={3}
                        />
                    </div>

                    <div className="form-row">
                        <div className="form-section">
                            <label className="form-label">任務類型</label>
                            <select
                                className="form-select"
                                value={formData.type}
                                onChange={e => handleChange('type', e.target.value)}
                            >
                                {TASK_TYPES.map(t => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="form-section">
                            <label className="form-label">優先級</label>
                            <div className="priority-options">
                                {PRIORITIES.map(p => (
                                    <button
                                        key={p.value}
                                        type="button"
                                        className={`priority-btn ${formData.priority === p.value ? 'active' : ''}`}
                                        style={{ '--priority-color': p.color } as React.CSSProperties}
                                        onClick={() => handleChange('priority', p.value)}
                                    >
                                        {p.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="form-section">
                        <label className="form-label"><MapPin size={14} /> 地點</label>
                        <input
                            type="text"
                            className="form-input"
                            value={formData.location}
                            onChange={e => handleChange('location', e.target.value)}
                            placeholder="任務執行地點"
                        />
                    </div>

                    <div className="form-section">
                        <label className="form-label"><Users size={14} /> 指派小隊</label>
                        <select
                            className="form-select"
                            value={formData.assignedTeam}
                            onChange={e => handleChange('assignedTeam', e.target.value)}
                        >
                            <option value="">選擇小隊</option>
                            {MOCK_TEAMS.map(t => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="form-row">
                        <div className="form-section">
                            <label className="form-label"><Clock size={14} /> 預估時長（分鐘）</label>
                            <input
                                type="number"
                                className="form-input"
                                value={formData.estimatedDuration}
                                onChange={e => handleChange('estimatedDuration', parseInt(e.target.value) || 0)}
                                min={15}
                                step={15}
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label"><Calendar size={14} /> 預定開始時間</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={formData.scheduledStart}
                                onChange={e => handleChange('scheduledStart', e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-cancel" onClick={onClose}>
                            取消
                        </button>
                        <button type="submit" className="btn-submit">
                            建立任務
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
