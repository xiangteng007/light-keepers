/**
 * PersonnelManagementPage.tsx
 * 
 * HR Domain - 人員管理頁面
 * 展示人員列表、技能、可用性、指派歷史
 */
import React, { useState, useMemo } from 'react';
import {
    Users, UserCheck, UserX, Clock, Award, Search, Filter,
    Phone, Mail, MapPin, Shield, ChevronRight, Plus
} from 'lucide-react';
import { PageTemplate } from '../../../components/PageTemplate';
import './PersonnelManagementPage.css';

const MOCK_PERSONNEL = [
    { id: '1', name: '王大明', role: 'IncidentCommander', team: '指揮組', status: 'active', phone: '0912-345-678', skills: ['指揮', 'ICS'], level: 5, tasksCompleted: 45 },
    { id: '2', name: '李小華', role: 'TeamLeader', team: '搜救組', status: 'active', phone: '0923-456-789', skills: ['搜救', '急救'], level: 3, tasksCompleted: 32 },
    { id: '3', name: '張志明', role: 'Volunteer', team: '後勤組', status: 'available', phone: '0934-567-890', skills: ['駕駛', '機械'], level: 2, tasksCompleted: 18 },
    { id: '4', name: '陳美玲', role: 'MedicalOfficer', team: '醫療組', status: 'active', phone: '0945-678-901', skills: ['急救', '護理', 'ACLS'], level: 4, tasksCompleted: 56 },
    { id: '5', name: '林志偉', role: 'Volunteer', team: '通訊組', status: 'available', phone: '0956-789-012', skills: ['通訊', '電子'], level: 2, tasksCompleted: 12 },
    { id: '6', name: '黃雅婷', role: 'TeamLeader', team: '社區組', status: 'off_duty', phone: '0967-890-123', skills: ['社工', '心輔'], level: 3, tasksCompleted: 28 },
];

type StatusFilter = 'all' | 'active' | 'available' | 'off_duty';

export default function PersonnelManagementPage() {
    const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPerson, setSelectedPerson] = useState<string | null>(null);

    const filteredPersonnel = useMemo(() => {
        return MOCK_PERSONNEL.filter(p => {
            if (statusFilter !== 'all' && p.status !== statusFilter) return false;
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                return p.name.toLowerCase().includes(query) ||
                    p.team.toLowerCase().includes(query) ||
                    p.skills.some(s => s.toLowerCase().includes(query));
            }
            return true;
        });
    }, [statusFilter, searchQuery]);

    const stats = useMemo(() => ({
        total: MOCK_PERSONNEL.length,
        active: MOCK_PERSONNEL.filter(p => p.status === 'active').length,
        available: MOCK_PERSONNEL.filter(p => p.status === 'available').length,
        offDuty: MOCK_PERSONNEL.filter(p => p.status === 'off_duty').length,
    }), []);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <span className="status-badge active">執勤中</span>;
            case 'available': return <span className="status-badge available">待命</span>;
            case 'off_duty': return <span className="status-badge off-duty">休息</span>;
            default: return null;
        }
    };

    const getRoleLabel = (role: string) => {
        const roleMap: Record<string, string> = {
            'IncidentCommander': '事件指揮官',
            'TeamLeader': '組長',
            'Volunteer': '志工',
            'MedicalOfficer': '醫務官',
        };
        return roleMap[role] || role;
    };

    return (
        <PageTemplate
            title="人員管理"
            subtitle="管理人員資料、技能與調度狀態"
            icon={Users}
            domain="HR 人力動員"
        >
            <div className="personnel-management">
                {/* Stats Overview */}
                <div className="stats-row">
                    <div className={`stat-item ${statusFilter === 'all' ? 'active' : ''}`} onClick={() => setStatusFilter('all')}>
                        <Users size={20} />
                        <span className="stat-value">{stats.total}</span>
                        <span className="stat-label">總人數</span>
                    </div>
                    <div className={`stat-item ${statusFilter === 'active' ? 'active' : ''}`} onClick={() => setStatusFilter('active')}>
                        <UserCheck size={20} />
                        <span className="stat-value active-color">{stats.active}</span>
                        <span className="stat-label">執勤中</span>
                    </div>
                    <div className={`stat-item ${statusFilter === 'available' ? 'active' : ''}`} onClick={() => setStatusFilter('available')}>
                        <Clock size={20} />
                        <span className="stat-value available-color">{stats.available}</span>
                        <span className="stat-label">待命</span>
                    </div>
                    <div className={`stat-item ${statusFilter === 'off_duty' ? 'active' : ''}`} onClick={() => setStatusFilter('off_duty')}>
                        <UserX size={20} />
                        <span className="stat-value off-duty-color">{stats.offDuty}</span>
                        <span className="stat-label">休息</span>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="toolbar">
                    <div className="search-box">
                        <Search size={16} />
                        <input
                            placeholder="搜尋姓名、組別、技能..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button className="btn-add">
                        <Plus size={16} />
                        新增人員
                    </button>
                </div>

                {/* Personnel Grid */}
                <div className="personnel-grid">
                    {filteredPersonnel.map(person => (
                        <div
                            key={person.id}
                            className={`person-card ${selectedPerson === person.id ? 'selected' : ''}`}
                            onClick={() => setSelectedPerson(person.id)}
                        >
                            <div className="card-header">
                                <div className="avatar">
                                    {person.name.charAt(0)}
                                </div>
                                <div className="info">
                                    <h4>{person.name}</h4>
                                    <span className="role">{getRoleLabel(person.role)}</span>
                                </div>
                                {getStatusBadge(person.status)}
                            </div>

                            <div className="card-body">
                                <div className="detail-row">
                                    <Shield size={14} />
                                    <span>{person.team}</span>
                                </div>
                                <div className="detail-row">
                                    <Phone size={14} />
                                    <span>{person.phone}</span>
                                </div>
                                <div className="detail-row">
                                    <Award size={14} />
                                    <span>已完成 {person.tasksCompleted} 項任務</span>
                                </div>
                            </div>

                            <div className="skills-row">
                                {person.skills.map(skill => (
                                    <span key={skill} className="skill-tag">{skill}</span>
                                ))}
                            </div>

                            <div className="card-footer">
                                <span className="level">L{person.level}</span>
                                <ChevronRight size={16} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </PageTemplate>
    );
}
