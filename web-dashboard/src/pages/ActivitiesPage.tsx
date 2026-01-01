/**
 * 活動報名頁面
 * Activity Registration Page
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
    Filter,
    X,
    Phone,
    Mail,
} from 'lucide-react';
import './ActivitiesPage.css';

// 分類選項
const CATEGORY_OPTIONS: { value: ActivityCategory; label: string; emoji: string }[] = [
    { value: 'training', label: '培訓', emoji: '📚' },
    { value: 'volunteer', label: '志工服務', emoji: '🙋' },
    { value: 'community', label: '社區', emoji: '🏘️' },
    { value: 'drill', label: '演習', emoji: '🚨' },
    { value: 'other', label: '其他', emoji: '📋' },
];

// 狀態標籤
const STATUS_MAP: Record<ActivityStatus, { label: string; color: string }> = {
    draft: { label: '草稿', color: '#9ca3af' },
    open: { label: '報名中', color: '#22c55e' },
    closed: { label: '已截止', color: '#f59e0b' },
    cancelled: { label: '已取消', color: '#ef4444' },
    completed: { label: '已結束', color: '#6b7280' },
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
        return CATEGORY_OPTIONS.find(c => c.value === category) || { label: category, emoji: '📋' };
    };

    return (
        <div className="activities-page">
            {/* 頁面標題 */}
            <header className="activities-header">
                <div className="activities-header__title">
                    <h1>📅 活動報名</h1>
                    <p>查看並報名志工活動</p>
                </div>
            </header>

            {/* Tab 切換 */}
            <div className="activities-tabs">
                <button
                    className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    所有活動
                </button>
                <button
                    className={`tab-btn ${activeTab === 'my' ? 'active' : ''}`}
                    onClick={() => setActiveTab('my')}
                >
                    我的報名 ({myRegistrations.filter(r => r.status !== 'cancelled').length})
                </button>
            </div>

            {activeTab === 'all' && (
                <>
                    {/* 分類篩選 */}
                    <div className="activities-filter">
                        <Filter size={16} />
                        <button
                            className={`filter-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('all')}
                        >
                            全部
                        </button>
                        {CATEGORY_OPTIONS.map(cat => (
                            <button
                                key={cat.value}
                                className={`filter-btn ${selectedCategory === cat.value ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(cat.value)}
                            >
                                {cat.emoji} {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* 活動列表 */}
                    <div className="activities-list">
                        {loading ? (
                            <div className="loading">載入中...</div>
                        ) : activities.length === 0 ? (
                            <div className="empty">
                                <Calendar size={48} />
                                <p>目前沒有活動</p>
                            </div>
                        ) : (
                            activities.map(activity => (
                                <article
                                    key={activity.id}
                                    className={`activity-card ${activity.status}`}
                                    onClick={() => setSelectedActivity(activity)}
                                >
                                    <div className="activity-card__date">
                                        <span className="month">{formatDate(activity.startAt).split(' ')[0]}</span>
                                        <span className="day">{new Date(activity.startAt).getDate()}</span>
                                    </div>

                                    <div className="activity-card__content">
                                        <div className="activity-card__header">
                                            <span className={`category cat-${activity.category}`}>
                                                {getCategoryInfo(activity.category).emoji} {getCategoryInfo(activity.category).label}
                                            </span>
                                            <span
                                                className="status"
                                                style={{ background: STATUS_MAP[activity.status].color }}
                                            >
                                                {STATUS_MAP[activity.status].label}
                                            </span>
                                        </div>

                                        <h3 className="activity-card__title">{activity.title}</h3>

                                        <div className="activity-card__info">
                                            <span><Clock size={14} /> {formatTime(activity.startAt)} - {formatTime(activity.endAt)}</span>
                                            {activity.location && <span><MapPin size={14} /> {activity.location}</span>}
                                            <span><Users size={14} /> {activity.currentParticipants}/{activity.maxParticipants} 人</span>
                                        </div>

                                        {isRegistered(activity.id) && (
                                            <div className="activity-card__registered">
                                                <CheckCircle size={14} /> 已報名
                                            </div>
                                        )}
                                    </div>

                                    <ChevronRight size={20} className="activity-card__arrow" />
                                </article>
                            ))
                        )}
                    </div>
                </>
            )}

            {activeTab === 'my' && (
                <div className="my-registrations">
                    {myRegistrations.filter(r => r.status !== 'cancelled').length === 0 ? (
                        <div className="empty">
                            <Calendar size={48} />
                            <p>你還沒有報名任何活動</p>
                            <button onClick={() => setActiveTab('all')}>瀏覽活動</button>
                        </div>
                    ) : (
                        myRegistrations
                            .filter(r => r.status !== 'cancelled')
                            .map(reg => (
                                <article
                                    key={reg.id}
                                    className="registration-card"
                                    onClick={() => reg.activity && setSelectedActivity(reg.activity)}
                                >
                                    <div className="registration-card__status">
                                        {reg.status === 'confirmed' && <CheckCircle className="confirmed" />}
                                        {reg.status === 'pending' && <AlertCircle className="pending" />}
                                        {reg.attended && <CheckCircle className="attended" />}
                                    </div>

                                    <div className="registration-card__content">
                                        <h3>{reg.activity?.title || '活動'}</h3>
                                        <div className="registration-card__info">
                                            <span><Calendar size={14} /> {reg.activity?.startAt ? formatDate(reg.activity.startAt) : ''}</span>
                                            {reg.activity?.location && <span><MapPin size={14} /> {reg.activity.location}</span>}
                                        </div>
                                        <span className={`registration-status ${reg.status}`}>
                                            {reg.status === 'confirmed' && '報名確認'}
                                            {reg.status === 'pending' && '待確認'}
                                            {reg.attended && '已出席'}
                                        </span>
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
            // 找到報名 ID
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
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content activity-detail-modal" onClick={e => e.stopPropagation()}>
                <header className="modal-header">
                    <h2>{activity.title}</h2>
                    <button className="modal-close" onClick={onClose}>
                        <X size={20} />
                    </button>
                </header>

                <div className="activity-detail__content">
                    {activity.coverImage && (
                        <img src={activity.coverImage} alt={activity.title} className="activity-detail__image" />
                    )}

                    <div className="activity-detail__meta">
                        <div className="meta-item">
                            <Calendar size={18} />
                            <div>
                                <span className="label">日期時間</span>
                                <span className="value">
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
                                <MapPin size={18} />
                                <div>
                                    <span className="label">地點</span>
                                    <span className="value">{activity.location}</span>
                                </div>
                            </div>
                        )}

                        <div className="meta-item">
                            <Users size={18} />
                            <div>
                                <span className="label">報名人數</span>
                                <span className="value">{activity.currentParticipants} / {activity.maxParticipants} 人</span>
                            </div>
                        </div>

                        {activity.registrationDeadline && (
                            <div className="meta-item">
                                <Clock size={18} />
                                <div>
                                    <span className="label">報名截止</span>
                                    <span className="value">{new Date(activity.registrationDeadline).toLocaleDateString('zh-TW')}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {activity.description && (
                        <div className="activity-detail__description">
                            <h4>活動說明</h4>
                            <p>{activity.description}</p>
                        </div>
                    )}

                    {(activity.contactPhone || activity.contactEmail) && (
                        <div className="activity-detail__contact">
                            <h4>聯絡資訊</h4>
                            {activity.organizerName && <p>{activity.organizerName}</p>}
                            {activity.contactPhone && <p><Phone size={14} /> {activity.contactPhone}</p>}
                            {activity.contactEmail && <p><Mail size={14} /> {activity.contactEmail}</p>}
                        </div>
                    )}
                </div>

                <div className="activity-detail__actions">
                    {isRegistered ? (
                        <div className="registered-actions">
                            <div className="registered-badge">
                                <CheckCircle size={18} /> 你已報名此活動
                            </div>
                            <button className="btn-cancel" onClick={handleCancel}>
                                取消報名
                            </button>
                        </div>
                    ) : showRegisterForm ? (
                        <form className="register-form" onSubmit={handleRegister}>
                            <div className="form-group">
                                <label><Phone size={14} /> 聯絡電話</label>
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={e => setPhone(e.target.value)}
                                    placeholder="09xx-xxx-xxx"
                                />
                            </div>
                            <div className="form-group">
                                <label><Mail size={14} /> 電子郵件</label>
                                <input
                                    type="email"
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    placeholder="your@email.com"
                                />
                            </div>
                            <div className="form-group">
                                <label>備註（選填）</label>
                                <textarea
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="有任何需要告知主辦單位的事項嗎？"
                                    rows={3}
                                />
                            </div>
                            <div className="form-actions">
                                <button type="button" className="btn-secondary" onClick={() => setShowRegisterForm(false)}>
                                    返回
                                </button>
                                <button type="submit" className="btn-primary" disabled={submitting}>
                                    {submitting ? '報名中...' : '確認報名'}
                                </button>
                            </div>
                        </form>
                    ) : (
                        <button
                            className="btn-primary btn-register"
                            disabled={!canRegister}
                            onClick={() => setShowRegisterForm(true)}
                        >
                            {!canRegister
                                ? (activity.status !== 'open' ? '報名已關閉' : '已額滿')
                                : '立即報名'
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
