/**
 * 活動報名頁面
 * Activity Registration Page
 *
 * Archetype: List（DESIGN_LANGUAGE.md §7.1）— header + toolbar(tabs/篩選) + content(Card 列表)
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    getActivities,
    registerActivity,
    cancelRegistration,
    getUserActivityRegistrations,
    type Activity,
    type ActivityRegistration,
    type ActivityStatus,
    type ActivityCategory,
} from '../api/services';
import {
    Calendar,
    MapPin,
    Users,
    Clock,
    CheckCircle,
    AlertCircle,
    ChevronRight,
    Phone,
    Mail,
} from 'lucide-react';
import { Badge, Button, Modal, InputField } from '../design-system';
import type { BadgeProps } from '../design-system';
import {
    GraduationIcon,
    SupportIcon,
    HomeIcon,
    FlaskIcon,
    MoreIcon,
    type LkIcon,
} from '../design-system/icons';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import './ActivitiesPage.css';

// 分類選項（R5/T5c：B3c 教範圖例，不再使用 emoji）
const CATEGORY_OPTIONS: { value: ActivityCategory; label: string; Icon: LkIcon }[] = [
    { value: 'training', label: '培訓', Icon: GraduationIcon },
    { value: 'volunteer', label: '志工服務', Icon: SupportIcon },
    { value: 'community', label: '社區', Icon: HomeIcon },
    { value: 'drill', label: '演習', Icon: FlaskIcon },
    { value: 'other', label: '其他', Icon: MoreIcon },
];

// 狀態標籤（對照 DESIGN_LANGUAGE.md §3：success=可報名、warning=待處理/已截止、danger=已取消、default=中性）
const STATUS_MAP: Record<ActivityStatus, { label: string; variant: BadgeProps['variant'] }> = {
    draft: { label: '草稿', variant: 'default' },
    open: { label: '報名中', variant: 'success' },
    closed: { label: '已截止', variant: 'warning' },
    cancelled: { label: '已取消', variant: 'danger' },
    completed: { label: '已結束', variant: 'info' },
};

const REG_STATUS_MAP: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    confirmed: { label: '報名確認', variant: 'success' },
    pending: { label: '待確認', variant: 'warning' },
};

export default function ActivitiesPage() {
    const { user } = useAuth();

    const [activities, setActivities] = useState<Activity[]>([]);
    const [myRegistrations, setMyRegistrations] = useState<ActivityRegistration[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
    const [selectedCategory, setSelectedCategory] = useState<ActivityCategory | 'all'>('all');
    const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);

    // 載入活動
    const loadActivities = async () => {
        try {
            setLoading(true);
            const params: { category?: ActivityCategory; limit?: number } = { limit: 50 };
            if (selectedCategory !== 'all') {
                params.category = selectedCategory;
            }
            const res = await getActivities(params);
            setActivities(res.data.data || []);
        } catch (error) {
            console.error('Failed to load activities:', error);
        } finally {
            setLoading(false);
        }
    };

    // 載入我的報名
    const loadMyRegistrations = async () => {
        if (!user) return;
        try {
            const res = await getUserActivityRegistrations(user.id);
            setMyRegistrations(res.data.data || []);
        } catch (error) {
            console.error('Failed to load registrations:', error);
        }
    };

    useEffect(() => {
        loadActivities();
        if (user) {
            loadMyRegistrations();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCategory, user]);

    // 格式化日期
    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-TW', {
            month: 'short',
            day: 'numeric',
            weekday: 'short',
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    // 檢查是否已報名
    const isRegistered = (activityId: string) => {
        return myRegistrations.some(r => r.activityId === activityId && r.status !== 'cancelled');
    };

    // 取得分類資訊
    const getCategoryInfo = (category: ActivityCategory) => {
        return CATEGORY_OPTIONS.find(c => c.value === category) || { label: category, Icon: MoreIcon };
    };

    const myActiveRegistrations = myRegistrations.filter(r => r.status !== 'cancelled');

    return (
        <div className="activities-page">
            {/* page-header */}
            <header className="page-header">
                <div>
                    <h1>活動報名</h1>
                    <p className="page-header__subtitle">查看並報名志工活動</p>
                </div>
            </header>

            {/* toolbar：頁籤 + 分類篩選 chips */}
            <div className="panel activities-toolbar">
                <div className="activities-tabs" role="tablist" aria-label="活動檢視">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'all'}
                        className={`activities-tabs__btn ${activeTab === 'all' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('all')}
                    >
                        所有活動
                    </button>
                    <button
                        type="button"
                        role="tab"
                        aria-selected={activeTab === 'my'}
                        className={`activities-tabs__btn ${activeTab === 'my' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('my')}
                    >
                        我的報名 ({myActiveRegistrations.length})
                    </button>
                </div>

                {activeTab === 'all' && (
                    <div className="activities-filter" role="group" aria-label="分類篩選">
                        <button
                            type="button"
                            className={`filter-chip ${selectedCategory === 'all' ? 'is-active' : ''}`}
                            onClick={() => setSelectedCategory('all')}
                        >
                            全部
                        </button>
                        {CATEGORY_OPTIONS.map(cat => (
                            <button
                                key={cat.value}
                                type="button"
                                className={`filter-chip ${selectedCategory === cat.value ? 'is-active' : ''}`}
                                onClick={() => setSelectedCategory(cat.value)}
                            >
                                <cat.Icon size={16} aria-hidden="true" /> {cat.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* content */}
            {activeTab === 'all' && (
                <div className="panel activities-list">
                    {loading ? (
                        <div className="activities-list__skeleton">
                            <Skeleton variant="card" count={3} height={96} />
                        </div>
                    ) : activities.length === 0 ? (
                        <EmptyState
                            icon={Calendar}
                            title="目前沒有活動"
                            description="符合篩選條件的活動目前沒有資料"
                        />
                    ) : (
                        activities.map(activity => (
                            <article
                                key={activity.id}
                                className={`activity-card ${activity.status === 'cancelled' ? 'is-cancelled' : ''}`}
                                onClick={() => setSelectedActivity(activity)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter') setSelectedActivity(activity); }}
                            >
                                <div className="activity-card__date">
                                    <span className="activity-card__month">{formatDate(activity.startAt).split(' ')[0]}</span>
                                    <span className="activity-card__day">{new Date(activity.startAt).getDate()}</span>
                                </div>

                                <div className="activity-card__content">
                                    <div className="activity-card__header">
                                        <span className="activity-card__category">
                                            {(() => { const CatIcon = getCategoryInfo(activity.category).Icon; return <CatIcon size={16} aria-hidden="true" />; })()} {getCategoryInfo(activity.category).label}
                                        </span>
                                        <Badge variant={STATUS_MAP[activity.status].variant} size="sm">
                                            {STATUS_MAP[activity.status].label}
                                        </Badge>
                                    </div>

                                    <h3 className="activity-card__title">{activity.title}</h3>

                                    <div className="activity-card__info">
                                        <span><Clock size={14} aria-hidden="true" /> {formatTime(activity.startAt)} - {formatTime(activity.endAt)}</span>
                                        {activity.location && <span><MapPin size={14} aria-hidden="true" /> {activity.location}</span>}
                                        <span className="tabular-nums"><Users size={14} aria-hidden="true" /> {activity.currentParticipants}/{activity.maxParticipants} 人</span>
                                    </div>

                                    {isRegistered(activity.id) && (
                                        <div className="activity-card__registered">
                                            <CheckCircle size={14} aria-hidden="true" /> 已報名
                                        </div>
                                    )}
                                </div>

                                <ChevronRight size={20} className="activity-card__arrow" aria-hidden="true" />
                            </article>
                        ))
                    )}
                </div>
            )}

            {activeTab === 'my' && (
                <div className="panel activities-list">
                    {myActiveRegistrations.length === 0 ? (
                        <EmptyState
                            icon={Calendar}
                            title="你還沒有報名任何活動"
                            action={{ label: '瀏覽活動', onClick: () => setActiveTab('all') }}
                        />
                    ) : (
                        myActiveRegistrations.map(reg => (
                            <article
                                key={reg.id}
                                className="activity-card"
                                onClick={() => reg.activity && setSelectedActivity(reg.activity)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' && reg.activity) setSelectedActivity(reg.activity); }}
                            >
                                <div className="activity-card__reg-status" aria-hidden="true">
                                    {reg.status === 'confirmed' && <CheckCircle className="is-confirmed" />}
                                    {reg.status === 'pending' && <AlertCircle className="is-pending" />}
                                    {reg.attended && <CheckCircle className="is-attended" />}
                                </div>

                                <div className="activity-card__content">
                                    <h3 className="activity-card__title">{reg.activity?.title || '活動'}</h3>
                                    <div className="activity-card__info">
                                        <span><Calendar size={14} aria-hidden="true" /> {reg.activity?.startAt ? formatDate(reg.activity.startAt) : ''}</span>
                                        {reg.activity?.location && <span><MapPin size={14} aria-hidden="true" /> {reg.activity.location}</span>}
                                    </div>
                                    <div className="activity-card__badges">
                                        {reg.status in REG_STATUS_MAP && (
                                            <Badge variant={REG_STATUS_MAP[reg.status].variant} size="sm">
                                                {REG_STATUS_MAP[reg.status].label}
                                            </Badge>
                                        )}
                                        {reg.attended && <Badge variant="info" size="sm">已出席</Badge>}
                                    </div>
                                </div>
                            </article>
                        ))
                    )}
                </div>
            )}

            {/* 活動詳情 Modal */}
            {selectedActivity && (
                <ActivityDetailModal
                    activity={selectedActivity}
                    isRegistered={isRegistered(selectedActivity.id)}
                    onClose={() => setSelectedActivity(null)}
                    onRegister={async () => {
                        await loadMyRegistrations();
                        await loadActivities();
                    }}
                    user={user}
                />
            )}
        </div>
    );
}

// ===== 活動詳情 Modal =====
function ActivityDetailModal({
    activity,
    isRegistered,
    onClose,
    onRegister,
    user,
}: {
    activity: Activity;
    isRegistered: boolean;
    onClose: () => void;
    onRegister: () => void;
    user: any;
}) {
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [phone, setPhone] = useState(user?.phone || '');
    const [email, setEmail] = useState(user?.email || '');
    const [remarks, setRemarks] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const canRegister = activity.status === 'open' &&
        activity.currentParticipants < activity.maxParticipants &&
        (!activity.registrationDeadline || new Date(activity.registrationDeadline) > new Date());

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        try {
            setSubmitting(true);
            await registerActivity(activity.id, {
                userId: user.id,
                userName: user.displayName || user.email,
                userPhone: phone || undefined,
                userEmail: email || undefined,
                remarks: remarks || undefined,
            });
            alert('報名成功！');
            onRegister();
            onClose();
        } catch (error) {
            console.error('Registration failed:', error);
            alert('報名失敗，請稍後再試');
        } finally {
            setSubmitting(false);
        }
    };

    const handleCancel = async () => {
        if (!user || !confirm('確定要取消報名嗎？')) return;

        try {
            await cancelRegistration(activity.id, user.id);
            alert('已取消報名');
            onRegister();
            onClose();
        } catch (error) {
            console.error('Cancel failed:', error);
            alert('取消失敗，請稍後再試');
        }
    };

    return (
        <Modal isOpen onClose={onClose} title={activity.title} size="md">
            <div className="activity-detail__content">
                {activity.coverImage && (
                    <img src={activity.coverImage} alt={activity.title} className="activity-detail__image" />
                )}

                <div className="activity-detail__meta">
                    <div className="meta-item">
                        <Calendar size={18} aria-hidden="true" />
                        <div>
                            <span className="meta-item__label">日期時間</span>
                            <span className="meta-item__value tabular-nums">
                                {new Date(activity.startAt).toLocaleDateString('zh-TW')}
                                {' '}
                                {new Date(activity.startAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                                {' - '}
                                {new Date(activity.endAt).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    </div>

                    {activity.location && (
                        <div className="meta-item">
                            <MapPin size={18} aria-hidden="true" />
                            <div>
                                <span className="meta-item__label">地點</span>
                                <span className="meta-item__value">{activity.location}</span>
                            </div>
                        </div>
                    )}

                    <div className="meta-item">
                        <Users size={18} aria-hidden="true" />
                        <div>
                            <span className="meta-item__label">報名人數</span>
                            <span className="meta-item__value tabular-nums">{activity.currentParticipants} / {activity.maxParticipants} 人</span>
                        </div>
                    </div>

                    {activity.registrationDeadline && (
                        <div className="meta-item">
                            <Clock size={18} aria-hidden="true" />
                            <div>
                                <span className="meta-item__label">報名截止</span>
                                <span className="meta-item__value tabular-nums">{new Date(activity.registrationDeadline).toLocaleDateString('zh-TW')}</span>
                            </div>
                        </div>
                    )}
                </div>

                {activity.description && (
                    <div className="activity-detail__section">
                        <h4>活動說明</h4>
                        <p>{activity.description}</p>
                    </div>
                )}

                {(activity.contactPhone || activity.contactEmail) && (
                    <div className="activity-detail__section">
                        <h4>聯絡資訊</h4>
                        {activity.organizerName && <p>{activity.organizerName}</p>}
                        {activity.contactPhone && <p><Phone size={14} aria-hidden="true" /> {activity.contactPhone}</p>}
                        {activity.contactEmail && <p><Mail size={14} aria-hidden="true" /> {activity.contactEmail}</p>}
                    </div>
                )}

                <div className="activity-detail__actions">
                    {isRegistered ? (
                        <div className="registered-actions">
                            <div className="registered-badge">
                                <CheckCircle size={18} aria-hidden="true" /> 你已報名此活動
                            </div>
                            <Button variant="danger" size="md" onClick={handleCancel}>
                                取消報名
                            </Button>
                        </div>
                    ) : showRegisterForm ? (
                        <form className="register-form" onSubmit={handleRegister}>
                            <InputField
                                label="聯絡電話"
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="09xx-xxx-xxx"
                                prefix={<Phone size={14} aria-hidden="true" />}
                                fullWidth
                            />
                            <InputField
                                label="電子郵件"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="your@email.com"
                                prefix={<Mail size={14} aria-hidden="true" />}
                                fullWidth
                            />
                            <div className="form-group">
                                <label htmlFor="activity-remarks">備註（選填）</label>
                                <textarea
                                    id="activity-remarks"
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="有任何需要告知主辦單位的事項嗎？"
                                    rows={3}
                                />
                            </div>
                            <div className="form-actions">
                                <Button type="button" variant="secondary" onClick={() => setShowRegisterForm(false)}>
                                    返回
                                </Button>
                                <Button type="submit" variant="primary" loading={submitting}>
                                    確認報名
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <Button
                            variant="primary"
                            size="lg"
                            className="btn-register"
                            disabled={!canRegister}
                            onClick={() => setShowRegisterForm(true)}
                        >
                            {!canRegister
                                ? (activity.status !== 'open' ? '報名已關閉' : '已額滿')
                                : '立即報名'
                            }
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
}
