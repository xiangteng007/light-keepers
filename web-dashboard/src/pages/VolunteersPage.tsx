import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, Button, Badge } from '../design-system';
import { getVolunteers, getVolunteerStats } from '../api/services';
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

interface VolunteerForm {
    name: string;
    phone: string;
    email: string;
    region: string;
    address: string;
    skills: string[];
    emergencyContact: string;
    emergencyPhone: string;
    notes: string;
}

const INITIAL_VOLUNTEER_FORM: VolunteerForm = {
    name: '',
    phone: '',
    email: '',
    region: '',
    address: '',
    skills: [],
    emergencyContact: '',
    emergencyPhone: '',
    notes: '',
};

export default function VolunteersPage() {
    const [volunteers, setVolunteers] = useState<VolunteerType[]>([]);
    const [stats, setStats] = useState({
        total: 0,
        available: 0,
        busy: 0,
        offline: 0,
        totalServiceHours: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

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
    const [volunteerForm, setVolunteerForm] = useState<VolunteerForm>(INITIAL_VOLUNTEER_FORM);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    // 載入志工資料
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const [volunteersRes, statsRes] = await Promise.all([
                    getVolunteers({ status: filterStatus || undefined }),
                    getVolunteerStats(),
                ]);
                setVolunteers(volunteersRes.data);
                setStats(statsRes.data);
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

    // 提交志工註冊
    const handleRegisterVolunteer = async () => {
        if (!volunteerForm.name || !volunteerForm.phone || !volunteerForm.region) {
            alert('請填寫必填欄位：姓名、電話、所在地區');
            return;
        }

        setIsSubmitting(true);
        try {
            // 呼叫後端 API 建立志工
            const response = await fetch(`${import.meta.env.VITE_API_URL || 'https://light-keepers-api-955234851806.asia-east1.run.app/api/v1'}/volunteers`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...volunteerForm,
                    status: 'available',
                    serviceHours: 0,
                    taskCount: 0,
                }),
            });

            if (!response.ok) throw new Error('Failed to create volunteer');

            setShowRegisterForm(false);
            setVolunteerForm(INITIAL_VOLUNTEER_FORM);
            setSuccessMessage(`志工 ${volunteerForm.name} 已成功註冊！`);
            setTimeout(() => setSuccessMessage(''), 3000);

            // 重新載入資料
            window.location.reload();
        } catch (err) {
            console.error('Failed to register volunteer:', err);
            alert('註冊失敗，請稍後再試');
        } finally {
            setIsSubmitting(false);
        }
    };

    // 技能選擇切換
    const toggleSkill = (skillValue: string) => {
        setVolunteerForm(prev => ({
            ...prev,
            skills: prev.skills.includes(skillValue)
                ? prev.skills.filter(s => s !== skillValue)
                : [...prev.skills, skillValue]
        }));
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
                    <div className="stat-card__value">{stats.totalServiceHours}</div>
                    <div className="stat-card__label">總服務時數</div>
                </Card>
                <Card className="stat-card stat-card--primary" padding="md">
                    <div className="stat-card__value">{stats.offline}</div>
                    <div className="stat-card__label">離線</div>
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
                    <Card className="modal-content modal-content--lg" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>➕ 新增志工</h3>

                        <div className="form-row">
                            <div className="form-section">
                                <label className="form-label">姓名 *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="請輸入姓名"
                                    value={volunteerForm.name}
                                    onChange={e => setVolunteerForm({ ...volunteerForm, name: e.target.value })}
                                />
                            </div>
                            <div className="form-section">
                                <label className="form-label">電話 *</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="09XX-XXX-XXX"
                                    value={volunteerForm.phone}
                                    onChange={e => setVolunteerForm({ ...volunteerForm, phone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-section">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-input"
                                    placeholder="volunteer@email.com"
                                    value={volunteerForm.email}
                                    onChange={e => setVolunteerForm({ ...volunteerForm, email: e.target.value })}
                                />
                            </div>
                            <div className="form-section">
                                <label className="form-label">所在地區 *</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="例如：台北市中山區"
                                    value={volunteerForm.region}
                                    onChange={e => setVolunteerForm({ ...volunteerForm, region: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <label className="form-label">詳細地址</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="詳細地址（選填）"
                                value={volunteerForm.address}
                                onChange={e => setVolunteerForm({ ...volunteerForm, address: e.target.value })}
                            />
                        </div>

                        <div className="form-section">
                            <label className="form-label">專長技能</label>
                            <div className="skills-grid">
                                {SKILL_OPTIONS.map(skill => (
                                    <button
                                        key={skill.value}
                                        type="button"
                                        className={`skill-btn ${volunteerForm.skills.includes(skill.value) ? 'active' : ''}`}
                                        onClick={() => toggleSkill(skill.value)}
                                    >
                                        {skill.icon} {skill.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-section">
                                <label className="form-label">緊急聯絡人</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder="聯絡人姓名"
                                    value={volunteerForm.emergencyContact}
                                    onChange={e => setVolunteerForm({ ...volunteerForm, emergencyContact: e.target.value })}
                                />
                            </div>
                            <div className="form-section">
                                <label className="form-label">緊急聯絡電話</label>
                                <input
                                    type="tel"
                                    className="form-input"
                                    placeholder="緊急聯絡電話"
                                    value={volunteerForm.emergencyPhone}
                                    onChange={e => setVolunteerForm({ ...volunteerForm, emergencyPhone: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="form-section">
                            <label className="form-label">備註</label>
                            <textarea
                                className="form-textarea"
                                placeholder="其他說明事項..."
                                value={volunteerForm.notes}
                                onChange={e => setVolunteerForm({ ...volunteerForm, notes: e.target.value })}
                                rows={2}
                            />
                        </div>

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => {
                                setShowRegisterForm(false);
                                setVolunteerForm(INITIAL_VOLUNTEER_FORM);
                            }}>
                                取消
                            </Button>
                            <Button onClick={handleRegisterVolunteer} disabled={isSubmitting}>
                                {isSubmitting ? '註冊中...' : '✅ 確認註冊'}
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
