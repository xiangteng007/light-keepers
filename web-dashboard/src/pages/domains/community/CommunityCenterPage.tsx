/**
 * CommunityCenterPage.tsx
 * 
 * Community Domain - 社區中心頁面
 * 展示社區聯絡點、受災戶追蹤、社區活動
 */
import React, { useState } from 'react';
import {
    Home, Users, Heart, MapPin, Phone, Calendar,
    AlertTriangle, CheckCircle, Clock, ChevronRight
} from 'lucide-react';
import { PageTemplate } from '../../components/PageTemplate';
import './CommunityCenterPage.css';

const MOCK_COMMUNITIES = [
    { id: '1', name: '中正里', households: 450, affected: 12, sheltered: 8, contactPerson: '王里長', phone: '0912-111-222', status: 'active' },
    { id: '2', name: '大安里', households: 680, affected: 25, sheltered: 20, contactPerson: '李里長', phone: '0923-222-333', status: 'active' },
    { id: '3', name: '信義里', households: 520, affected: 5, sheltered: 3, contactPerson: '張里長', phone: '0934-333-444', status: 'monitoring' },
    { id: '4', name: '松山里', households: 380, affected: 0, sheltered: 0, contactPerson: '陳里長', phone: '0945-444-555', status: 'normal' },
];

const MOCK_ACTIVITIES = [
    { id: '1', title: '物資發放 - 中正區', date: '2026/01/12', time: '10:00-16:00', location: '中正區公所', participants: 45 },
    { id: '2', title: '心理輔導服務', date: '2026/01/12', time: '14:00-17:00', location: '大安活動中心', participants: 12 },
    { id: '3', title: '社區重建說明會', date: '2026/01/13', time: '19:00-21:00', location: '信義區公所', participants: 0 },
];

export default function CommunityCenterPage() {
    const [selectedCommunity, setSelectedCommunity] = useState<string | null>(null);

    const totalStats = {
        communities: MOCK_COMMUNITIES.length,
        affected: MOCK_COMMUNITIES.reduce((sum, c) => sum + c.affected, 0),
        sheltered: MOCK_COMMUNITIES.reduce((sum, c) => sum + c.sheltered, 0),
        households: MOCK_COMMUNITIES.reduce((sum, c) => sum + c.households, 0),
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <AlertTriangle className="status-icon warning" />;
            case 'monitoring': return <Clock className="status-icon monitoring" />;
            case 'normal': return <CheckCircle className="status-icon normal" />;
            default: return null;
        }
    };

    return (
        <PageTemplate
            title="社區中心"
            subtitle="社區聯絡網絡與受災戶追蹤"
            icon={Home}
            domain="Community 社區治理"
        >
            <div className="community-center">
                {/* Summary Stats */}
                <div className="summary-stats">
                    <div className="summary-card">
                        <Home className="summary-icon" />
                        <div className="summary-content">
                            <span className="summary-value">{totalStats.communities}</span>
                            <span className="summary-label">聯繫社區</span>
                        </div>
                    </div>
                    <div className="summary-card warning">
                        <AlertTriangle className="summary-icon" />
                        <div className="summary-content">
                            <span className="summary-value">{totalStats.affected}</span>
                            <span className="summary-label">受災戶</span>
                        </div>
                    </div>
                    <div className="summary-card info">
                        <Users className="summary-icon" />
                        <div className="summary-content">
                            <span className="summary-value">{totalStats.sheltered}</span>
                            <span className="summary-label">收容中</span>
                        </div>
                    </div>
                    <div className="summary-card">
                        <Heart className="summary-icon" />
                        <div className="summary-content">
                            <span className="summary-value">{totalStats.households.toLocaleString()}</span>
                            <span className="summary-label">總戶數</span>
                        </div>
                    </div>
                </div>

                <div className="two-column">
                    {/* Community List */}
                    <div className="community-list">
                        <h3>社區清單</h3>
                        {MOCK_COMMUNITIES.map(community => (
                            <div
                                key={community.id}
                                className={`community-item ${selectedCommunity === community.id ? 'selected' : ''}`}
                                onClick={() => setSelectedCommunity(community.id)}
                            >
                                <div className="item-header">
                                    {getStatusIcon(community.status)}
                                    <span className="item-name">{community.name}</span>
                                    <ChevronRight size={16} />
                                </div>
                                <div className="item-stats">
                                    <span>總戶數: {community.households}</span>
                                    <span className={community.affected > 0 ? 'warning' : ''}>
                                        受災: {community.affected}
                                    </span>
                                    <span>收容: {community.sheltered}</span>
                                </div>
                                <div className="item-contact">
                                    <span><Users size={12} /> {community.contactPerson}</span>
                                    <span><Phone size={12} /> {community.phone}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Upcoming Activities */}
                    <div className="activities-panel">
                        <h3><Calendar size={18} /> 近期活動</h3>
                        {MOCK_ACTIVITIES.map(activity => (
                            <div key={activity.id} className="activity-card">
                                <div className="activity-header">
                                    <span className="activity-title">{activity.title}</span>
                                </div>
                                <div className="activity-details">
                                    <span><Calendar size={12} /> {activity.date} {activity.time}</span>
                                    <span><MapPin size={12} /> {activity.location}</span>
                                    {activity.participants > 0 && (
                                        <span><Users size={12} /> 已報名 {activity.participants} 人</span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </PageTemplate>
    );
}
