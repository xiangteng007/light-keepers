import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge } from '../design-system';
import { getApprovedVolunteers, getVolunteerStats, getPendingVolunteers, approveVolunteer, rejectVolunteer } from '../api/services';
import { useAuth } from '../context/AuthContext';
import type { Volunteer as VolunteerType, VolunteerStatus } from '../api/services';

// 技能選項
const SKILL_OPTIONS = [
    { value: 'medical', label: '醫療救護', icon: '🏥' },
    { value: 'rescue', label: '搜救救難', icon: '🚒' },
    { value: 'logistics', label: '物資運送', icon: '📦' },
    { value: 'cooking', label: '炊事料理', icon: '🍳' },
    { value: 'communication', label: '通訊聯絡', icon: '📡' },
    { value: 'driving', label: '駕駛運輸', icon: '🚗' },
    { value: 'construction', label: '土木修繕', icon: '🔧' },
    { value: 'social', label: '社工關懷', icon: '💝' },
];

const STATUS_CONFIG: Record<VolunteerStatus, { label: string; color: string; bgColor: string }> = {
    available: { label: '可用', color: '#4CAF50', bgColor: 'rgba(76, 175, 80, 0.15)' },
    busy: { label: '執勤中', color: '#FF9800', bgColor: 'rgba(255, 152, 0, 0.15)' },
    offline: { label: '離線', color: '#9E9E9E', bgColor: 'rgba(158, 158, 158, 0.15)' },
};

interface AssignmentForm {
    volunteerId: string;
    volunteerName: string;
    taskTitle: string;
    taskDescription: string;
    location: string;
    scheduledStart: string;
}

export default function VolunteersPage() {
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<'pending' | 'list'>('list');
    const [volunteers, setVolunteers] = useState<VolunteerType[]>([]);
    const [pendingVolunteers, setPendingVolunteers] = useState<VolunteerType[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        available: 0,
        busy: 0,
        offline: 0,
        totalServiceHours: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showAssignModal, setShowAssignModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState<VolunteerStatus | ''>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [processingId, setProcessingId] = useState<string | null>(null);
    const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({
        volunteerId: '',
        volunteerName: '',
        taskTitle: '',
        taskDescription: '',
        location: '',
        scheduledStart: '',
    });
    const [successMessage, setSuccessMessage] = useState('');

    // 載入志工資料
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [volunteersRes, statsRes, pendingRes] = await Promise.all([
                    getApprovedVolunteers({ status: filterStatus || undefined }),
                    getVolunteerStats(),
                    getPendingVolunteers(),
                ]);
                setVolunteers(volunteersRes.data.data);
                setStats(statsRes.data.data);
                setPendingVolunteers(pendingRes.data.data || []);
            } catch (err) {
                console.error('Failed to fetch volunteers:', err);
                setError('載入志工資料失敗');
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [filterStatus]);

    // 篩選志工 (搜尋)
    const filteredVolunteers = volunteers.filter(v => {
        if (searchQuery && !v.name.includes(searchQuery) && !v.region.includes(searchQuery)) return false;
        return true;
    });

    const getSkillLabel = (skillValue: string) => {
        const skill = SKILL_OPTIONS.find(s => s.value === skillValue);
        return skill ? `${skill.icon} ${skill.label}` : skillValue;
    };


    // 開啟指派任務
    const openAssignModal = (volunteer: VolunteerType) => {
        setAssignmentForm({
            volunteerId: volunteer.id,
            volunteerName: volunteer.name,
            taskTitle: '',
            taskDescription: '',
            location: '',
            scheduledStart: new Date().toISOString().slice(0, 16),
        });
        setShowAssignModal(true);
    };

    // 提交任務指派
    const handleAssign = async () => {
        if (!assignmentForm.taskTitle) {
            alert('請輸入任務標題');
            return;
        }

        // 實際應呼叫 API
        // await fetch('/api/v1/volunteer-assignments', { method: 'POST', body: JSON.stringify(assignmentForm) });

        setShowAssignModal(false);
        setSuccessMessage(`已成功指派任務給 ${assignmentForm.volunteerName}`);
        setTimeout(() => setSuccessMessage(''), 3000);
    };

    // 審核通過
    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            await approveVolunteer(id, user?.id || '', '管理員核准');
            setPendingVolunteers(prev => prev.filter(v => v.id !== id));
            setSuccessMessage('志工已核准');
            setTimeout(() => setSuccessMessage(''), 3000);
            // 重新載入列表
            const res = await getApprovedVolunteers({});
            setVolunteers(res.data.data);
        } catch (err) {
            console.error('Failed to approve volunteer:', err);
            setError('核准失敗');
        } finally {
            setProcessingId(null);
        }
    };

    // 拒絕申請
    const handleReject = async (id: string) => {
        const note = prompt('請輸入拒絕原因（選填）');
        setProcessingId(id);
        try {
            await rejectVolunteer(id, user?.id || '', note || '');
            setPendingVolunteers(prev => prev.filter(v => v.id !== id));
            setSuccessMessage('志工申請已拒絕');
            setTimeout(() => setSuccessMessage(''), 3000);
        } catch (err) {
            console.error('Failed to reject volunteer:', err);
            setError('拒絕失敗');
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="page volunteers-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>👥 志工管理</h2>
                    <p className="page-subtitle">志工動員與調度系統</p>
                </div>
            </div>

            {/* Tab 切換 */}
            <div className="volunteers-tabs">
                <button
                    className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    ⏳ 待審核 {pendingVolunteers.length > 0 && <Badge variant="warning" size="sm">{pendingVolunteers.length}</Badge>}
                </button>
                <button
                    className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                >
                    👥 志工名單
                </button>
            </div>

            {/* 成功訊息 */}
            {successMessage && (
                <div className="success-toast">
                    ✅ {successMessage}
                </div>
            )}

            {/* 統計卡片 */}
            <div className="volunteers-stats">
                <Card className="stat-card" padding="md">
                    <div className="stat-card__value">{stats.total}</div>
                    <div className="stat-card__label">總志工數</div>
                </Card>
                <Card className="stat-card stat-card--success" padding="md">
                    <div className="stat-card__value">{stats.available}</div>
                    <div className="stat-card__label">可用</div>
                </Card>
                <Card className="stat-card stat-card--warning" padding="md">
                    <div className="stat-card__value">{stats.busy}</div>
                    <div className="stat-card__label">執勤中</div>
                </Card>
                <Card className="stat-card stat-card--info" padding="md">
                    <div className="stat-card__value">{stats.totalServiceHours}</div>
                    <div className="stat-card__label">總服務時數</div>
                </Card>
                <Card className="stat-card stat-card--primary" padding="md">
                    <div className="stat-card__value">{stats.offline}</div>
                    <div className="stat-card__label">離線</div>
                </Card>
            </div>

            {/* 搜尋與篩選 - 只在志工名單 Tab 顯示 */}
            {activeTab === 'list' && (
                <div className="volunteers-filters">
                    <input
                        type="text"
                        className="form-input volunteers-search"
                        placeholder="搜尋姓名或地區..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="volunteers-status-filters">
                        <button
                            className={`status-filter-btn ${filterStatus === '' ? 'active' : ''}`}
                            onClick={() => setFilterStatus('')}
                        >
                            全部
                        </button>
                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                            <button
                                key={key}
                                className={`status-filter-btn ${filterStatus === key ? 'active' : ''}`}
                                style={{
                                    borderColor: filterStatus === key ? config.color : undefined,
                                    backgroundColor: filterStatus === key ? config.bgColor : undefined,
                                }}
                                onClick={() => setFilterStatus(key as VolunteerStatus)}
                            >
                                {config.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 待審核志工列表 */}
            {activeTab === 'pending' && (
                <div className="pending-volunteers-list">
                    {pendingVolunteers.length === 0 ? (
                        <div className="volunteers-empty">
                            <span>✅</span>
                            <p>沒有待審核的志工申請</p>
                        </div>
                    ) : (
                        pendingVolunteers.map(volunteer => (
                            <Card key={volunteer.id} className="pending-volunteer-card" padding="md">
                                <div className="pending-volunteer-info">
                                    <div className="pending-volunteer-avatar">
                                        {volunteer.name.charAt(0)}
                                    </div>
                                    <div className="pending-volunteer-details">
                                        <h4>{volunteer.name}</h4>
                                        <p>📍 {volunteer.region}</p>
                                        <p>📞 {volunteer.phone}</p>
                                        <p className="pending-volunteer-skills">
                                            {volunteer.skills.map(skill => (
                                                <span key={skill} className="skill-tag">{getSkillLabel(skill)}</span>
                                            ))}
                                        </p>
                                    </div>
                                </div>
                                <div className="pending-volunteer-actions">
                                    <Button
                                        variant="primary"
                                        size="sm"
                                        onClick={() => handleApprove(volunteer.id)}
                                        disabled={processingId === volunteer.id}
                                    >
                                        {processingId === volunteer.id ? '處理中...' : '✅ 核准'}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => handleReject(volunteer.id)}
                                        disabled={processingId === volunteer.id}
                                    >
                                        ❌ 拒絕
                                    </Button>
                                </div>
                            </Card>
                        ))
                    )}
                </div>
            )}

            {/* 志工列表 - 只在志工名單 Tab 顯示 */}
            {activeTab === 'list' && (<div className="volunteers-list">
                {isLoading ? (
                    <div className="volunteers-empty">
                        <span>⏳</span>
                        <p>載入志工資料中...</p>
                    </div>
                ) : error ? (
                    <div className="volunteers-empty">
                        <span>⚠️</span>
                        <p>{error}</p>
                        <Button variant="secondary" onClick={() => window.location.reload()}>
                            重新載入
                        </Button>
                    </div>
                ) : filteredVolunteers.length > 0 ? (
                    filteredVolunteers.map(volunteer => (
                        <Card key={volunteer.id} className="volunteer-card" padding="md">
                            <div className="volunteer-card__header">
                                <div className="volunteer-card__avatar">
                                    {volunteer.name.charAt(0)}
                                </div>
                                <div className="volunteer-card__info">
                                    <h4 className="volunteer-card__name">{volunteer.name}</h4>
                                    <p className="volunteer-card__region">📍 {volunteer.region}</p>
                                </div>
                                <Badge
                                    variant={
                                        volunteer.status === 'available' ? 'success' :
                                            volunteer.status === 'busy' ? 'warning' : 'default'
                                    }
                                >
                                    {STATUS_CONFIG[volunteer.status as VolunteerStatus].label}
                                </Badge>
                            </div>

                            <div className="volunteer-card__skills">
                                {volunteer.skills.map(skill => (
                                    <span key={skill} className="skill-tag">
                                        {getSkillLabel(skill)}
                                    </span>
                                ))}
                            </div>

                            <div className="volunteer-card__stats">
                                <span>📞 {volunteer.phone}</span>
                                <span>⏱️ {volunteer.serviceHours} 小時</span>
                                <span>📋 {volunteer.taskCount} 次任務</span>
                            </div>

                            <div className="volunteer-card__actions">
                                <Link to={`/volunteers/${volunteer.id}`}>
                                    <Button variant="secondary" size="sm">
                                        檢視詳情
                                    </Button>
                                </Link>
                                <Button
                                    variant="primary"
                                    size="sm"
                                    onClick={() => openAssignModal(volunteer)}
                                    disabled={volunteer.status !== 'available'}
                                >
                                    📋 指派任務
                                </Button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <div className="volunteers-empty">
                        <span>👥</span>
                        <p>沒有符合條件的志工</p>
                    </div>
                )}
            </div>)}

            {/* 指派任務 Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <Card className="modal-content modal-content--lg" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>📋 指派任務給 {assignmentForm.volunteerName}</h3>

                        <div className="form-section">
                            <label className="form-label">任務標題 *</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="例如：物資運送 - 新北市板橋區"
                                value={assignmentForm.taskTitle}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, taskTitle: e.target.value })}
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label">任務描述</label>
                            <textarea
                                className="form-textarea"
                                placeholder="詳細說明任務內容..."
                                value={assignmentForm.taskDescription}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, taskDescription: e.target.value })}
                                rows={3}
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label">地點</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="任務地點"
                                value={assignmentForm.location}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, location: e.target.value })}
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label">預定開始時間</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={assignmentForm.scheduledStart}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, scheduledStart: e.target.value })}
                            />
                        </div>

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowAssignModal(false)}>
                                取消
                            </Button>
                            <Button onClick={handleAssign}>
                                確認指派
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}

