/**
 * FeaturesPage.tsx
 * 
 * 功能開關頁面 - Core Domain
 * 功能：Feature Flags 管理、環境配置、灰度發布
 */
import { useState } from 'react';
import { ToggleLeft, Search, AlertTriangle, CheckCircle, Users, Percent, Calendar } from 'lucide-react';
import './FeaturesPage.css';

interface FeatureFlag {
    id: string;
    name: string;
    description: string;
    status: 'enabled' | 'disabled' | 'partial';
    environment: 'all' | 'production' | 'staging' | 'development';
    rolloutPercent: number;
    targetUsers?: string[];
    createdAt: string;
    modifiedAt: string;
}

const MOCK_FLAGS: FeatureFlag[] = [
    { id: 'FF-001', name: 'ai_summary', description: 'AI 自動彙整功能', status: 'enabled', environment: 'all', rolloutPercent: 100, createdAt: '2025-12-01', modifiedAt: '2026-01-10' },
    { id: 'FF-002', name: 'drone_control_v2', description: '無人機控制新界面', status: 'partial', environment: 'staging', rolloutPercent: 30, createdAt: '2026-01-05', modifiedAt: '2026-01-11' },
    { id: 'FF-003', name: 'realtime_chat', description: '即時聊天功能', status: 'enabled', environment: 'production', rolloutPercent: 100, createdAt: '2025-10-15', modifiedAt: '2025-11-20' },
    { id: 'FF-004', name: 'blockchain_tracking', description: '區塊鏈供應鏈追蹤', status: 'disabled', environment: 'development', rolloutPercent: 0, createdAt: '2026-01-08', modifiedAt: '2026-01-08' },
    { id: 'FF-005', name: 'ar_navigation', description: 'AR 現場導航', status: 'partial', environment: 'staging', rolloutPercent: 50, targetUsers: ['A組', 'B組'], createdAt: '2026-01-02', modifiedAt: '2026-01-12' },
];

export default function FeaturesPage() {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'enabled': return <CheckCircle size={14} className="status-icon enabled" />;
            case 'disabled': return <AlertTriangle size={14} className="status-icon disabled" />;
            case 'partial': return <Percent size={14} className="status-icon partial" />;
            default: return null;
        }
    };

    const getEnvColor = (env: string) => {
        switch (env) {
            case 'production': return '#ef4444';
            case 'staging': return '#eab308';
            case 'development': return '#22c55e';
            default: return '#3B82F6';
        }
    };

    const filteredFlags = MOCK_FLAGS.filter(flag =>
        (filterStatus === 'all' || flag.status === filterStatus) &&
        (flag.name.includes(searchTerm) || flag.description.includes(searchTerm))
    );

    return (
        <div className="features-page">
            <header className="features-header">
                <div className="header-title">
                    <ToggleLeft size={24} />
                    <div>
                        <h1>功能開關</h1>
                        <p>Feature Flags 管理與灰度發布</p>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat enabled">
                        <CheckCircle size={14} />
                        <span>{MOCK_FLAGS.filter(f => f.status === 'enabled').length}</span>
                        <label>已啟用</label>
                    </div>
                    <div className="stat partial">
                        <Percent size={14} />
                        <span>{MOCK_FLAGS.filter(f => f.status === 'partial').length}</span>
                        <label>灰度中</label>
                    </div>
                    <div className="stat disabled">
                        <AlertTriangle size={14} />
                        <span>{MOCK_FLAGS.filter(f => f.status === 'disabled').length}</span>
                        <label>已停用</label>
                    </div>
                </div>
            </header>

            <div className="features-toolbar">
                <div className="search-box">
                    <Search size={16} />
                    <input
                        type="text"
                        placeholder="搜尋功能名稱..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                    <option value="all">所有狀態</option>
                    <option value="enabled">已啟用</option>
                    <option value="partial">灰度中</option>
                    <option value="disabled">已停用</option>
                </select>
            </div>

            <div className="features-grid">
                {filteredFlags.map(flag => (
                    <div key={flag.id} className={`feature-card ${flag.status}`}>
                        <div className="card-header">
                            <div className="flag-name">
                                <code>{flag.name}</code>
                            </div>
                            <span className="env-badge" style={{ background: `${getEnvColor(flag.environment)}20`, color: getEnvColor(flag.environment) }}>
                                {flag.environment}
                            </span>
                        </div>

                        <p className="flag-desc">{flag.description}</p>

                        <div className="flag-status">
                            {getStatusIcon(flag.status)}
                            <span>
                                {flag.status === 'enabled' && '完全啟用'}
                                {flag.status === 'disabled' && '已停用'}
                                {flag.status === 'partial' && `灰度 ${flag.rolloutPercent}%`}
                            </span>
                        </div>

                        {flag.status === 'partial' && (
                            <div className="rollout-bar">
                                <div className="rollout-fill" style={{ width: `${flag.rolloutPercent}%` }} />
                            </div>
                        )}

                        {flag.targetUsers && (
                            <div className="target-users">
                                <Users size={12} />
                                <span>目標: {flag.targetUsers.join(', ')}</span>
                            </div>
                        )}

                        <div className="card-footer">
                            <span className="modified">
                                <Calendar size={12} />
                                {flag.modifiedAt}
                            </span>
                            <button className="btn-toggle">
                                {flag.status === 'enabled' ? '停用' : '啟用'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
