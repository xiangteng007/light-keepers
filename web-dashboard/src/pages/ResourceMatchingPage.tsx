/**
 * ResourceMatchingPage.tsx
 * 
 * 資源媒合頁面 - Logistics Domain
 * 功能：需求登記、供給登記、AI 配對建議、資源分配狀態
 */
import { useState } from 'react';
import {
    GitMerge, Package, TrendingUp, AlertCircle, CheckCircle,
    Clock, MapPin, Users, Search, Filter, Plus, Zap
} from 'lucide-react';
import './ResourceMatchingPage.css';

interface ResourceRequest {
    id: string;
    type: string;
    category: string;
    quantity: number;
    unit: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    location: string;
    requestedBy: string;
    requestedAt: string;
    status: 'pending' | 'matched' | 'fulfilled';
    matchScore?: number;
}

interface ResourceSupply {
    id: string;
    type: string;
    category: string;
    available: number;
    unit: string;
    location: string;
    provider: string;
    expiresAt?: string;
}

const MOCK_REQUESTS: ResourceRequest[] = [
    { id: 'REQ-001', type: '飲用水', category: '生活物資', quantity: 500, unit: '箱', priority: 'critical', location: '信義區避難所', requestedBy: '李協調員', requestedAt: '2026-01-12 08:30', status: 'pending' },
    { id: 'REQ-002', type: '睡袋', category: '住宿設備', quantity: 100, unit: '個', priority: 'high', location: '大安區收容中心', requestedBy: '王志工', requestedAt: '2026-01-12 09:15', status: 'matched', matchScore: 95 },
    { id: 'REQ-003', type: '急救包', category: '醫療用品', quantity: 50, unit: '組', priority: 'high', location: '中正區醫療站', requestedBy: '張護理師', requestedAt: '2026-01-12 10:00', status: 'fulfilled' },
    { id: 'REQ-004', type: '發電機', category: '設備器材', quantity: 5, unit: '台', priority: 'medium', location: '松山區指揮所', requestedBy: '陳指揮官', requestedAt: '2026-01-12 10:30', status: 'pending' },
];

const MOCK_SUPPLIES: ResourceSupply[] = [
    { id: 'SUP-001', type: '飲用水', category: '生活物資', available: 800, unit: '箱', location: '內湖物流中心', provider: '台北市政府' },
    { id: 'SUP-002', type: '睡袋', category: '住宿設備', available: 150, unit: '個', location: '南港倉庫', provider: '紅十字會' },
    { id: 'SUP-003', type: '急救包', category: '醫療用品', available: 200, unit: '組', location: '衛生局備品', provider: '衛生福利部' },
    { id: 'SUP-004', type: '發電機', category: '設備器材', available: 10, unit: '台', location: '消防局倉庫', provider: '消防署' },
];

const AI_MATCHES = [
    { requestId: 'REQ-001', supplyId: 'SUP-001', score: 92, distance: '4.2km', eta: '25分鐘' },
    { requestId: 'REQ-004', supplyId: 'SUP-004', score: 88, distance: '6.8km', eta: '35分鐘' },
];

type ViewMode = 'requests' | 'supplies' | 'matches';

export default function ResourceMatchingPage() {
    const [viewMode, setViewMode] = useState<ViewMode>('matches');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('all');

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'critical': return '#ef4444';
            case 'high': return '#f97316';
            case 'medium': return '#eab308';
            default: return '#22c55e';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'fulfilled': return <CheckCircle size={16} className="status-icon fulfilled" />;
            case 'matched': return <GitMerge size={16} className="status-icon matched" />;
            default: return <Clock size={16} className="status-icon pending" />;
        }
    };

    return (
        <div className="resource-matching-page">
            {/* Header */}
            <header className="matching-header">
                <div className="header-title">
                    <GitMerge size={24} className="title-icon" />
                    <div>
                        <h1>資源媒合中心</h1>
                        <p>AI 驅動的需求與供給智慧配對</p>
                    </div>
                </div>
                <div className="header-stats">
                    <div className="stat-card">
                        <AlertCircle size={16} />
                        <span className="stat-value">{MOCK_REQUESTS.filter(r => r.status === 'pending').length}</span>
                        <span className="stat-label">待配對</span>
                    </div>
                    <div className="stat-card success">
                        <CheckCircle size={16} />
                        <span className="stat-value">{MOCK_REQUESTS.filter(r => r.status === 'fulfilled').length}</span>
                        <span className="stat-label">已完成</span>
                    </div>
                    <div className="stat-card info">
                        <TrendingUp size={16} />
                        <span className="stat-value">91%</span>
                        <span className="stat-label">配對率</span>
                    </div>
                </div>
            </header>

            {/* Toolbar */}
            <div className="matching-toolbar">
                <div className="view-tabs">
                    <button
                        className={`tab ${viewMode === 'matches' ? 'active' : ''}`}
                        onClick={() => setViewMode('matches')}
                    >
                        <Zap size={14} />
                        AI 配對建議
                    </button>
                    <button
                        className={`tab ${viewMode === 'requests' ? 'active' : ''}`}
                        onClick={() => setViewMode('requests')}
                    >
                        <Package size={14} />
                        需求列表
                    </button>
                    <button
                        className={`tab ${viewMode === 'supplies' ? 'active' : ''}`}
                        onClick={() => setViewMode('supplies')}
                    >
                        <TrendingUp size={14} />
                        供給庫存
                    </button>
                </div>
                <div className="toolbar-actions">
                    <div className="search-box">
                        <Search size={14} />
                        <input
                            type="text"
                            placeholder="搜尋物資..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="filter-select"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option value="all">所有類別</option>
                        <option value="生活物資">生活物資</option>
                        <option value="醫療用品">醫療用品</option>
                        <option value="住宿設備">住宿設備</option>
                        <option value="設備器材">設備器材</option>
                    </select>
                    <button className="btn-add">
                        <Plus size={14} />
                        新增需求
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="matching-content">
                {viewMode === 'matches' && (
                    <div className="ai-matches-view">
                        <div className="ai-header">
                            <Zap size={18} />
                            <span>AI 智慧配對建議</span>
                            <span className="ai-badge">powered by LightKeepers AI</span>
                        </div>
                        {AI_MATCHES.map(match => {
                            const request = MOCK_REQUESTS.find(r => r.id === match.requestId);
                            const supply = MOCK_SUPPLIES.find(s => s.id === match.supplyId);
                            if (!request || !supply) return null;
                            return (
                                <div key={match.requestId} className="match-card">
                                    <div className="match-score">
                                        <div className="score-circle" style={{ '--score': `${match.score}%` } as any}>
                                            <span>{match.score}</span>
                                        </div>
                                        <span className="score-label">配對分數</span>
                                    </div>
                                    <div className="match-request">
                                        <div className="match-badge request">需求</div>
                                        <h4>{request.type} × {request.quantity} {request.unit}</h4>
                                        <p><MapPin size={12} /> {request.location}</p>
                                        <p><Users size={12} /> {request.requestedBy}</p>
                                    </div>
                                    <div className="match-arrow">
                                        <GitMerge size={24} />
                                        <span>{match.distance}</span>
                                        <span>ETA: {match.eta}</span>
                                    </div>
                                    <div className="match-supply">
                                        <div className="match-badge supply">供給</div>
                                        <h4>{supply.type} × {supply.available} {supply.unit}</h4>
                                        <p><MapPin size={12} /> {supply.location}</p>
                                        <p><Package size={12} /> {supply.provider}</p>
                                    </div>
                                    <div className="match-actions">
                                        <button className="btn-approve">確認配對</button>
                                        <button className="btn-reject">略過</button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {viewMode === 'requests' && (
                    <div className="requests-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>編號</th>
                                    <th>物資</th>
                                    <th>數量</th>
                                    <th>優先級</th>
                                    <th>地點</th>
                                    <th>申請人</th>
                                    <th>狀態</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                {MOCK_REQUESTS.map(req => (
                                    <tr key={req.id}>
                                        <td className="id-cell">{req.id}</td>
                                        <td>
                                            <div className="item-info">
                                                <span className="item-name">{req.type}</span>
                                                <span className="item-category">{req.category}</span>
                                            </div>
                                        </td>
                                        <td>{req.quantity} {req.unit}</td>
                                        <td>
                                            <span className="priority-badge" style={{ background: getPriorityColor(req.priority) }}>
                                                {req.priority}
                                            </span>
                                        </td>
                                        <td>{req.location}</td>
                                        <td>{req.requestedBy}</td>
                                        <td>
                                            <span className={`status-badge ${req.status}`}>
                                                {getStatusIcon(req.status)}
                                                {req.status === 'pending' && '待配對'}
                                                {req.status === 'matched' && `已配對 (${req.matchScore}%)`}
                                                {req.status === 'fulfilled' && '已完成'}
                                            </span>
                                        </td>
                                        <td>
                                            <button className="btn-action">查看</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode === 'supplies' && (
                    <div className="supplies-grid">
                        {MOCK_SUPPLIES.map(supply => (
                            <div key={supply.id} className="supply-card">
                                <div className="supply-header">
                                    <Package size={20} />
                                    <span className="supply-id">{supply.id}</span>
                                </div>
                                <h3>{supply.type}</h3>
                                <div className="supply-quantity">
                                    <span className="quantity-value">{supply.available}</span>
                                    <span className="quantity-unit">{supply.unit}</span>
                                </div>
                                <div className="supply-details">
                                    <p><MapPin size={12} /> {supply.location}</p>
                                    <p><Users size={12} /> {supply.provider}</p>
                                </div>
                                <div className="supply-category">{supply.category}</div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
