import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge } from '../design-system';

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

// 模擬志工資料
const MOCK_VOLUNTEERS = [
    { id: '1', name: '王大明', phone: '0912-345-678', region: '台北市', skills: ['medical', 'rescue'], status: 'available', serviceHours: 120, taskCount: 15 },
    { id: '2', name: '李小華', phone: '0923-456-789', region: '新北市', skills: ['logistics', 'driving'], status: 'busy', serviceHours: 85, taskCount: 10 },
    { id: '3', name: '張阿美', phone: '0934-567-890', region: '桃園市', skills: ['cooking', 'social'], status: 'available', serviceHours: 200, taskCount: 25 },
    { id: '4', name: '陳志強', phone: '0945-678-901', region: '台中市', skills: ['construction', 'logistics'], status: 'offline', serviceHours: 45, taskCount: 5 },
];

// 模擬任務指派資料
const MOCK_ASSIGNMENTS = [
    { id: 'a1', volunteerId: '2', taskTitle: '物資運送 - 新北市板橋區', status: 'in_progress', scheduledStart: '2024-12-23T09:00:00' },
];

type VolunteerStatus = 'available' | 'busy' | 'offline';

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
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState<VolunteerStatus | ''>('');
    const [searchQuery, setSearchQuery] = useState('');
    const [assignmentForm, setAssignmentForm] = useState<AssignmentForm>({
        volunteerId: '',
        volunteerName: '',
        taskTitle: '',
        taskDescription: '',
        location: '',
        scheduledStart: '',
    });
    const [successMessage, setSuccessMessage] = useState('');

    // 篩選志工
    const filteredVolunteers = MOCK_VOLUNTEERS.filter(v => {
        if (filterStatus && v.status !== filterStatus) return false;
        if (searchQuery && !v.name.includes(searchQuery) && !v.region.includes(searchQuery)) return false;
        return true;
    });

    // 統計
    const stats = {
        total: MOCK_VOLUNTEERS.length,
        available: MOCK_VOLUNTEERS.filter(v => v.status === 'available').length,
        busy: MOCK_VOLUNTEERS.filter(v => v.status === 'busy').length,
        totalHours: MOCK_VOLUNTEERS.reduce((sum, v) => sum + v.serviceHours, 0),
        activeAssignments: MOCK_ASSIGNMENTS.length,
    };

    const getSkillLabel = (skillValue: string) => {
        const skill = SKILL_OPTIONS.find(s => s.value === skillValue);
        return skill ? `${skill.icon} ${skill.label}` : skillValue;
    };

    // 開啟指派任務
    const openAssignModal = (volunteer: typeof MOCK_VOLUNTEERS[0]) => {
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

    return (
        <div className="page volunteers-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>👥 志工管理</h2>
                    <p className="page-subtitle">志工動員與調度系統</p>
                </div>
                <div className="page-header__right">
                    <Button onClick={() => setShowRegisterForm(true)}>
                        ➕ 新增志工
                    </Button>
                </div>
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
                    <div className="stat-card__value">{stats.totalHours}</div>
                    <div className="stat-card__label">總服務時數</div>
                </Card>
                <Card className="stat-card stat-card--primary" padding="md">
                    <div className="stat-card__value">{stats.activeAssignments}</div>
                    <div className="stat-card__label">進行中任務</div>
                </Card>
            </div>

            {/* 搜尋與篩選 */}
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

            {/* 志工列表 */}
            <div className="volunteers-list">
                {filteredVolunteers.length > 0 ? (
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
            </div>

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

            {/* 新增志工表單 Modal */}
            {showRegisterForm && (
                <div className="modal-overlay" onClick={() => setShowRegisterForm(false)}>
                    <Card className="modal-content" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>新增志工</h3>
                        <p className="modal-desc">志工註冊表單功能開發中...</p>
                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowRegisterForm(false)}>
                                關閉
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
