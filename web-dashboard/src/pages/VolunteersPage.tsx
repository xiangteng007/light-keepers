import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Phone, Clock, ClipboardList, Users, Check, X } from 'lucide-react';
import { Card, Button, Badge, Alert, ToastContainer, StatIndicator } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import { getApprovedVolunteers, getVolunteerStats, getPendingVolunteers, approveVolunteer, rejectVolunteer } from '../api/services';
import { useAuth } from '../context/AuthContext';
import type { Volunteer as VolunteerType, VolunteerStatus } from '../api/services';
import './VolunteersPage.css';

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

// 狀態語意對照（DESIGN_LANGUAGE.md §3）：available→success、busy→warning、offline→default(中性)
// 顏色一律交給 design-system 的 Badge variant 處理，頁面不再持有色碼。
const STATUS_LABEL: Record<VolunteerStatus, string> = {
    available: '可用',
    busy: '執勤中',
    offline: '離線',
};

const STATUS_BADGE_VARIANT: Record<VolunteerStatus, 'success' | 'warning' | 'default'> = {
    available: 'success',
    busy: 'warning',
    offline: 'default',
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
    };

    // 審核通過
    const handleApprove = async (id: string) => {
        setProcessingId(id);
        try {
            await approveVolunteer(id, user?.id || '', '管理員核准');
            setPendingVolunteers(prev => prev.filter(v => v.id !== id));
            setSuccessMessage('志工已核准');
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
                    <h1>志工管理</h1>
                    <p className="page-subtitle">志工動員與調度系統</p>
                </div>
            </div>

            {/* Tab 切換 */}
            <div className="volunteers-tabs" role="tablist" aria-label="志工檢視">
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'pending'}
                    className={`tab-btn ${activeTab === 'pending' ? 'active' : ''}`}
                    onClick={() => setActiveTab('pending')}
                >
                    待審核 {pendingVolunteers.length > 0 && <Badge variant="warning" size="sm">{pendingVolunteers.length}</Badge>}
                </button>
                <button
                    type="button"
                    role="tab"
                    aria-selected={activeTab === 'list'}
                    className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
                    onClick={() => setActiveTab('list')}
                >
                    <Users size={14} aria-hidden="true" /> 志工名單
                </button>
            </div>

            {/* 成功訊息 */}
            <ToastContainer
                toasts={successMessage ? [{
                    id: 'volunteers-success',
                    variant: 'success',
                    message: successMessage,
                    duration: 3000,
                    onClose: () => setSuccessMessage(''),
                }] : []}
                onClose={() => setSuccessMessage('')}
            />

            {/* 統計卡片（非清單，是摘要指標群組；role="group" 而非 "list" 避免 aria-required-children 違規） */}
            <div className="volunteers-stats" role="group" aria-label="志工統計摘要">
                <StatIndicator label="總志工數" value={stats.total} />
                <StatIndicator variant="success" label="可用" value={stats.available} />
                <StatIndicator variant="warning" label="執勤中" value={stats.busy} />
                <StatIndicator label="總服務時數" value={stats.totalServiceHours} />
                <StatIndicator label="離線" value={stats.offline} />
            </div>

            {/* 搜尋與篩選 - 只在志工名單 Tab 顯示 */}
            {activeTab === 'list' && (
                <div className="volunteers-filters">
                    <input
                        type="text"
                        className="form-input volunteers-search"
                        placeholder="搜尋姓名或地區..."
                        aria-label="搜尋姓名或地區"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <div className="volunteers-status-filters" role="group" aria-label="依狀態篩選">
                        <button
                            type="button"
                            className={`status-filter-btn ${filterStatus === '' ? 'status-filter-btn--active' : ''}`}
                            aria-pressed={filterStatus === ''}
                            onClick={() => setFilterStatus('')}
                        >
                            全部
                        </button>
                        {(Object.keys(STATUS_LABEL) as VolunteerStatus[]).map((status) => (
                            <button
                                key={status}
                                type="button"
                                className={`status-filter-btn ${filterStatus === status ? 'status-filter-btn--active' : ''}`}
                                aria-pressed={filterStatus === status}
                                onClick={() => setFilterStatus(status)}
                            >
                                <Badge variant={STATUS_BADGE_VARIANT[status]} size="sm" dot>
                                    {STATUS_LABEL[status]}
                                </Badge>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* 待審核志工列表 */}
            {activeTab === 'pending' && (
                <div className="pending-volunteers-list">
                    {pendingVolunteers.length === 0 ? (
                        <EmptyState title="沒有待審核的志工申請" variant="minimal" />
                    ) : (
                        pendingVolunteers.map(volunteer => (
                            <Card key={volunteer.id} className="pending-volunteer-card" padding="md">
                                <div className="pending-volunteer-info">
                                    <div className="pending-volunteer-avatar" aria-hidden="true">
                                        {volunteer.name.charAt(0)}
                                    </div>
                                    <div className="pending-volunteer-details">
                                        <h3>{volunteer.name}</h3>
                                        <p><MapPin size={14} aria-hidden="true" /> {volunteer.region}</p>
                                        <p><Phone size={14} aria-hidden="true" /> {volunteer.phone}</p>
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
                                        icon={<Check size={16} aria-hidden="true" />}
                                        onClick={() => handleApprove(volunteer.id)}
                                        disabled={processingId === volunteer.id}
                                    >
                                        {processingId === volunteer.id ? '處理中...' : '核准'}
                                    </Button>
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        icon={<X size={16} aria-hidden="true" />}
                                        onClick={() => handleReject(volunteer.id)}
                                        disabled={processingId === volunteer.id}
                                    >
                                        拒絕
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
                    <div className="volunteers-list__skeleton">
                        <Skeleton variant="card" count={3} height={180} />
                    </div>
                ) : error ? (
                    <div className="volunteers-list__error">
                        <Alert variant="danger" title="載入失敗">
                            {error}
                        </Alert>
                        <Button variant="secondary" onClick={() => window.location.reload()}>
                            重新載入
                        </Button>
                    </div>
                ) : filteredVolunteers.length > 0 ? (
                    filteredVolunteers.map(volunteer => (
                        <Card key={volunteer.id} className="volunteer-card" padding="md">
                            <div className="volunteer-card__header">
                                <div className="volunteer-card__avatar" aria-hidden="true">
                                    {volunteer.name.charAt(0)}
                                </div>
                                <div className="volunteer-card__info">
                                    <h3 className="volunteer-card__name">{volunteer.name}</h3>
                                    <p className="volunteer-card__region"><MapPin size={13} aria-hidden="true" /> {volunteer.region}</p>
                                </div>
                                <Badge variant={STATUS_BADGE_VARIANT[volunteer.status as VolunteerStatus]} dot>
                                    {STATUS_LABEL[volunteer.status as VolunteerStatus]}
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
                                <span><Phone size={13} aria-hidden="true" /> {volunteer.phone}</span>
                                <span className="tabular-nums"><Clock size={13} aria-hidden="true" /> {volunteer.serviceHours} 小時</span>
                                <span className="tabular-nums"><ClipboardList size={13} aria-hidden="true" /> {volunteer.taskCount} 次任務</span>
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
                                    icon={<ClipboardList size={16} aria-hidden="true" />}
                                    onClick={() => openAssignModal(volunteer)}
                                    disabled={volunteer.status !== 'available'}
                                >
                                    指派任務
                                </Button>
                            </div>
                        </Card>
                    ))
                ) : (
                    <EmptyState title="沒有符合條件的志工" description="試試調整搜尋或篩選條件" />
                )}
            </div>)}

            {/* 指派任務 Modal */}
            {showAssignModal && (
                <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
                    <Card className="modal-content modal-content--lg" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>指派任務給 {assignmentForm.volunteerName}</h3>

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
