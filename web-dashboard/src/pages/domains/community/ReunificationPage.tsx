/**
 * Reunification Page - 災民協尋與平安回�?
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import './ReunificationPage.css';

// ============ Types ============

interface MissingPerson {
    id: string;
    missionSessionId: string;
    name: string;
    age?: number;
    gender?: string;
    description?: string;
    lastKnownLocation?: string;
    lastSeenAt?: string;
    photoUrls?: string[];
    contactPhone?: string;
    status: 'MISSING' | 'FOUND_SAFE' | 'FOUND_INJURED' | 'FOUND_DECEASED' | 'REUNITED';
    foundLocation?: string;
    foundAt?: string;
    foundByVolunteerName?: string;
    reporterName?: string;
    reporterPhone?: string;
    reporterRelation?: string;
    queryCode: string;
    createdAt: string;
}

interface ReunificationStats {
    total: number;
    missing: number;
    foundSafe: number;
    foundInjured: number;
    reunited: number;
}

// ============ Component ============

export const ReunificationPage: React.FC = () => {
    const { missionSessionId } = useParams<{ missionSessionId: string }>();

    const [persons, setPersons] = useState<MissingPerson[]>([]);
    const [stats, setStats] = useState<ReunificationStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [showNewModal, setShowNewModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        age: '',
        gender: '',
        description: '',
        lastKnownLocation: '',
        contactPhone: '',
        reporterName: '',
        reporterPhone: '',
        reporterRelation: '',
    });

    // ============ Data Fetching ============

    const fetchPersons = useCallback(async () => {
        if (!missionSessionId) return;
        try {
            const response = await api.get(`/reunification/missions/${missionSessionId}`);
            setPersons(response.data);
        } catch (error) {
            console.error('Failed to fetch:', error);
        }
    }, [missionSessionId]);

    const fetchStats = useCallback(async () => {
        if (!missionSessionId) return;
        try {
            const response = await api.get(`/reunification/missions/${missionSessionId}/stats`);
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        }
    }, [missionSessionId]);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([fetchPersons(), fetchStats()]);
            setLoading(false);
        };
        loadData();
    }, [fetchPersons, fetchStats]);

    // ============ Handlers ============

    const handleCreate = async () => {
        if (!missionSessionId) return;
        try {
            await api.post('/reunification/reports', {
                missionSessionId,
                ...formData,
                age: formData.age ? parseInt(formData.age) : undefined,
            });
            setShowNewModal(false);
            setFormData({
                name: '', age: '', gender: '', description: '',
                lastKnownLocation: '', contactPhone: '',
                reporterName: '', reporterPhone: '', reporterRelation: '',
            });
            await Promise.all([fetchPersons(), fetchStats()]);
        } catch (error) {
            console.error('Failed to create:', error);
        }
    };

    const handleMarkFound = async (id: string, status: string) => {
        const location = prompt('發現地點:');
        if (!location) return;

        try {
            await api.put(`/reunification/${id}/found`, {
                status,
                foundLocation: location,
            });
            await Promise.all([fetchPersons(), fetchStats()]);
        } catch (error) {
            console.error('Failed to mark found:', error);
        }
    };

    const handleMarkReunited = async (id: string) => {
        if (!confirm('確認已與家屬團聚�?)) return;
        try {
            await api.put(`/reunification/${id}/reunited`);
            await Promise.all([fetchPersons(), fetchStats()]);
        } catch (error) {
            console.error('Failed to mark reunited:', error);
        }
    };

    // ============ Filtering ============

    const filteredPersons = persons.filter(p => {
        if (filterStatus !== 'ALL' && p.status !== filterStatus) return false;
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
    });

    // ============ Render Helpers ============

    const getStatusBadge = (status: string) => {
        const styles: Record<string, { bg: string; label: string }> = {
            MISSING: { bg: '#ef4444', label: '搜尋�? },
            FOUND_SAFE: { bg: '#22c55e', label: '已尋�?- 平安' },
            FOUND_INJURED: { bg: '#f59e0b', label: '已尋�?- 受傷' },
            FOUND_DECEASED: { bg: '#1a1a1a', label: '罹難' },
            REUNITED: { bg: '#3b82f6', label: '已團�? },
        };
        const s = styles[status] || { bg: '#888', label: status };
        return <span className="status-badge" style={{ background: s.bg }}>{s.label}</span>;
    };

    // ============ Render ============

    if (loading) {
        return <div className="reunification-page loading">載入�?..</div>;
    }

    return (
        <div className="reunification-page">
            <header className="page-header">
                <h1>🔍 災民協尋</h1>
                <button className="btn-new" onClick={() => setShowNewModal(true)}>
                    + 新增報案
                </button>
            </header>

            {/* Stats */}
            {stats && (
                <div className="stats-panel">
                    <div className="stat-card total"><span>總登�?/span><span>{stats.total}</span></div>
                    <div className="stat-card missing"><span>搜尋�?/span><span>{stats.missing}</span></div>
                    <div className="stat-card found"><span>已尋�?�?</span><span>{stats.foundSafe}</span></div>
                    <div className="stat-card injured"><span>已尋�?�?</span><span>{stats.foundInjured}</span></div>
                    <div className="stat-card reunited"><span>已團�?/span><span>{stats.reunited}</span></div>
                </div>
            )}

            {/* Search & Filter */}
            <div className="filter-bar">
                <input
                    type="text"
                    placeholder="搜尋姓名..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                />
                <select title="篩選失蹤者狀�? value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                    <option value="ALL">全部狀�?/option>
                    <option value="MISSING">搜尋�?/option>
                    <option value="FOUND_SAFE">已尋�?- 平安</option>
                    <option value="FOUND_INJURED">已尋�?- 受傷</option>
                    <option value="REUNITED">已團�?/option>
                </select>
            </div>

            {/* Person List */}
            <div className="person-list">
                {filteredPersons.map(person => (
                    <div key={person.id} className="person-card">
                        <div className="card-header">
                            <h3>{person.name}</h3>
                            {getStatusBadge(person.status)}
                        </div>

                        <div className="person-info">
                            {person.age && <span>🎂 {person.age}�?/span>}
                            {person.gender && <span>👤 {person.gender}</span>}
                        </div>

                        {person.description && (
                            <p className="description">{person.description}</p>
                        )}

                        <p className="location">📍 最後地�? {person.lastKnownLocation || '未知'}</p>

                        <div className="query-code">
                            查詢�? <strong>{person.queryCode}</strong>
                        </div>

                        {person.status === 'MISSING' && (
                            <div className="card-actions">
                                <button onClick={() => handleMarkFound(person.id, 'FOUND_SAFE')}>
                                    尋獲 (平安)
                                </button>
                                <button className="warning" onClick={() => handleMarkFound(person.id, 'FOUND_INJURED')}>
                                    尋獲 (受傷)
                                </button>
                            </div>
                        )}

                        {(person.status === 'FOUND_SAFE' || person.status === 'FOUND_INJURED') && (
                            <div className="card-actions">
                                <button onClick={() => handleMarkReunited(person.id)}>
                                    確認團聚
                                </button>
                            </div>
                        )}

                        {person.foundAt && (
                            <p className="found-info">
                                �?�?{new Date(person.foundAt).toLocaleString()} 尋獲�?{person.foundLocation}
                            </p>
                        )}
                    </div>
                ))}
            </div>

            {/* New Report Modal */}
            {showNewModal && (
                <div className="modal-overlay" onClick={() => setShowNewModal(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <h2>新增失蹤者報�?/h2>

                        <div className="form-row">
                            <div className="form-section">
                                <label>姓名 *</label>
                                <input
                                    type="text"
                                    placeholder="失蹤者姓�?
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div className="form-section half">
                                <label>年齡</label>
                                <input
                                    type="number"
                                    placeholder="年齡"
                                    value={formData.age}
                                    onChange={e => setFormData({ ...formData, age: e.target.value })}
                                />
                            </div>
                            <div className="form-section half">
                                <label>性別</label>
                                <select title="性別" value={formData.gender} onChange={e => setFormData({ ...formData, gender: e.target.value })}>
                                    <option value="">-</option>
                                    <option value="�?>�?/option>
                                    <option value="�?>�?/option>
                                </select>
                            </div>
                        </div>

                        <div className="form-section">
                            <label>外觀特徵</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                placeholder="身高、體型、穿著、特殊記號等"
                            />
                        </div>

                        <div className="form-section">
                            <label>最後出現地�?/label>
                            <input
                                type="text"
                                value={formData.lastKnownLocation}
                                onChange={e => setFormData({ ...formData, lastKnownLocation: e.target.value })}
                            />
                        </div>

                        <hr />

                        <h4>報案人資�?/h4>
                        <div className="form-row">
                            <div className="form-section">
                                <label>姓名</label>
                                <input
                                    type="text"
                                    placeholder="報案人姓�?
                                    value={formData.reporterName}
                                    onChange={e => setFormData({ ...formData, reporterName: e.target.value })}
                                />
                            </div>
                            <div className="form-section">
                                <label>電話</label>
                                <input
                                    type="tel"
                                    placeholder="聯絡電話"
                                    value={formData.reporterPhone}
                                    onChange={e => setFormData({ ...formData, reporterPhone: e.target.value })}
                                />
                            </div>
                            <div className="form-section">
                                <label>關係</label>
                                <input
                                    type="text"
                                    value={formData.reporterRelation}
                                    onChange={e => setFormData({ ...formData, reporterRelation: e.target.value })}
                                    placeholder="�? 配偶、子�?
                                />
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button className="btn-cancel" onClick={() => setShowNewModal(false)}>取消</button>
                            <button className="btn-save" onClick={handleCreate}>提交報案</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ReunificationPage;
