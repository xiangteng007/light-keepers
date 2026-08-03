import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
// 保留 lucide（R5/T6 誠實清單）：MessageCircle（LINE 訊息）、Trash2（刪除）
import { MessageCircle, Trash2 } from 'lucide-react';
import {
    ChevronLeftIcon,
    CameraIcon,
    EditIcon,
    CalendarIcon,
    LocationIcon,
    ClockIcon,
    CheckIcon,
    CloseIcon,
} from '../design-system/icons';
import { getVolunteer } from '../api/services';
import type { Volunteer as VolunteerType } from '../api/services';
import { Badge, Button, Card, Tag, Alert } from '../design-system';
import type { BadgeProps } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import './VolunteerDetailPage.css';

/**
 * VolunteerDetailPage — 志工詳情
 * Archetype: Detail（DESIGN_LANGUAGE.md §7.2）
 * ← 返回 + h1 姓名 + 狀態 Badge + 操作群(≤3) / 2 欄 8+4 桌機、行動端直落。
 */

interface ServiceRecord {
    id: string;
    taskTitle: string;
    date: string;
    hours: number;
    status: 'completed' | 'cancelled';
    location: string;
}

// 模擬服務紀錄 (未來可改為真實 API)
const MOCK_SERVICE_RECORDS: ServiceRecord[] = [
    { id: '1', taskTitle: '0403 花蓮地震救災支援', date: '2024-04-05', hours: 12, status: 'completed', location: '花蓮縣花蓮市' },
    { id: '2', taskTitle: '社區防災演習協助', date: '2024-03-20', hours: 4, status: 'completed', location: '台北市中正區' },
    { id: '3', taskTitle: '物資發放站志工', date: '2024-02-28', hours: 6, status: 'completed', location: '台北市萬華區' },
    { id: '4', taskTitle: '颱風災前準備作業', date: '2024-07-22', hours: 8, status: 'completed', location: '新北市板橋區' },
];

// 狀態 Badge 對照（DESIGN_LANGUAGE.md §3：success=可用、info=進行中(執勤)、default=中性(離線)）
const STATUS_CONFIG: Record<string, { label: string; variant: BadgeProps['variant'] }> = {
    available: { label: '可用', variant: 'success' },
    busy: { label: '執勤中', variant: 'info' },
    offline: { label: '離線', variant: 'default' },
};

export default function VolunteerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [volunteer, setVolunteer] = useState<VolunteerType | null>(null);
    const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'info' | 'records' | 'settings'>('info');

    // 模擬管理員權限檢查
    const isAdmin = true; // 實際應從 auth context 取得

    useEffect(() => {
        const fetchVolunteer = async () => {
            if (!id) return;
            setIsLoading(true);
            setError(null);
            try {
                const response = await getVolunteer(id);
                setVolunteer(response.data.data);
                setServiceRecords(MOCK_SERVICE_RECORDS); // 服務紀錄暫用 mock
            } catch (err) {
                console.error('Failed to fetch volunteer:', err);
                setError('載入志工資料失敗');
            } finally {
                setIsLoading(false);
            }
        };
        fetchVolunteer();
    }, [id]);

    if (isLoading) {
        return (
            <div className="volunteer-detail-page">
                <div className="volunteer-detail-page__skeleton" aria-busy="true" aria-label="載入志工資料中">
                    <Skeleton variant="card" height={200} />
                    <Skeleton variant="card" height={280} />
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="volunteer-detail-page">
                <Alert variant="danger" title={error}>
                    <Link to="/volunteers" className="volunteer-detail-page__back-link">
                        <ChevronLeftIcon size={16} aria-hidden="true" /> 返回志工列表
                    </Link>
                </Alert>
            </div>
        );
    }

    if (!volunteer) {
        return (
            <div className="volunteer-detail-page">
                <EmptyState
                    title="找不到志工資料"
                    action={{ label: '返回志工列表', onClick: () => navigate('/volunteers') }}
                />
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[volunteer.status] || STATUS_CONFIG.offline;
    const completedRecords = serviceRecords.filter(r => r.status === 'completed');
    const totalHours = completedRecords.reduce((sum, r) => sum + r.hours, 0);

    return (
        <div className="volunteer-detail-page">
            {/* page-header：← 返回 | h1 姓名 + 狀態 Badge | 操作群(≤3) */}
            <div className="page-header">
                <div className="page-header__title">
                    <button onClick={() => navigate('/volunteers')} className="back-link">
                        <ChevronLeftIcon size={16} aria-hidden="true" /> 返回列表
                    </button>
                    <div className="page-header__name-row">
                        <h1>{volunteer.name}</h1>
                        <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                    </div>
                </div>
                {isAdmin && (
                    <div className="page-header__actions">
                        <Button variant="secondary" size="sm" icon={<EditIcon size={16} aria-hidden="true" />}>編輯</Button>
                        <Button variant="danger" size="sm" icon={<Trash2 size={14} aria-hidden="true" />}>刪除</Button>
                    </div>
                )}
            </div>

            {/* 2 欄：桌機 8+4 / 行動端直落 */}
            <div className="volunteer-detail-page__layout">
                {/* 主欄：分段內容（tabs） */}
                <div className="volunteer-detail-page__main">
                    <div className="tabs-nav" role="tablist" aria-label="志工詳情分頁">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'info'}
                            className={`tab-btn ${activeTab === 'info' ? 'is-active' : ''}`}
                            onClick={() => setActiveTab('info')}
                        >
                            個人資料
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={activeTab === 'records'}
                            className={`tab-btn ${activeTab === 'records' ? 'is-active' : ''}`}
                            onClick={() => setActiveTab('records')}
                        >
                            服務紀錄
                        </button>
                        {isAdmin && (
                            <button
                                type="button"
                                role="tab"
                                aria-selected={activeTab === 'settings'}
                                className={`tab-btn ${activeTab === 'settings' ? 'is-active' : ''}`}
                                onClick={() => setActiveTab('settings')}
                            >
                                管理設定
                            </button>
                        )}
                    </div>

                    <div className="tab-content">
                        {activeTab === 'info' && (
                            <div className="info-tab">
                                <Card padding="md" className="info-section">
                                    <h3>敏感資料（僅管理員可見）</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>電話</label>
                                            <span>{volunteer.phone}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>Email</label>
                                            <span>{volunteer.email}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>詳細地址</label>
                                            <span>{volunteer.address}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>LINE ID</label>
                                            <span>{volunteer.lineUserId || '未綁定'}</span>
                                        </div>
                                    </div>
                                </Card>

                                <Card padding="md" className="info-section">
                                    <h3>緊急聯絡人</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>姓名</label>
                                            <span>{volunteer.emergencyContact}</span>
                                        </div>
                                        <div className="info-item">
                                            <label>電話</label>
                                            <span>{volunteer.emergencyPhone}</span>
                                        </div>
                                    </div>
                                </Card>

                                <Card padding="md" className="info-section">
                                    <h3>備註</h3>
                                    <p className="notes">{volunteer.notes || '（無）'}</p>
                                </Card>

                                <Card padding="md" className="info-section">
                                    <h3>帳號資訊</h3>
                                    <div className="info-grid">
                                        <div className="info-item">
                                            <label>註冊日期</label>
                                            <span className="tabular-nums">{new Date(volunteer.createdAt).toLocaleDateString('zh-TW')}</span>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'records' && (
                            <div className="records-tab">
                                <div className="records-summary">
                                    <Card padding="md" className="summary-card">
                                        <span className="summary-value tabular-nums">{completedRecords.length}</span>
                                        <span className="summary-label">完成任務</span>
                                    </Card>
                                    <Card padding="md" className="summary-card">
                                        <span className="summary-value tabular-nums">{totalHours}</span>
                                        <span className="summary-label">總服務時數</span>
                                    </Card>
                                </div>

                                {serviceRecords.length === 0 ? (
                                    <EmptyState title="尚無服務紀錄" />
                                ) : (
                                    <div className="records-list">
                                        {serviceRecords.map(record => (
                                            <Card key={record.id} padding="md" className={`record-item ${record.status === 'cancelled' ? 'is-cancelled' : ''}`}>
                                                <div className="record-header">
                                                    <span className="record-title">{record.taskTitle}</span>
                                                    <Badge variant={record.status === 'completed' ? 'success' : 'danger'} size="sm" icon={record.status === 'completed' ? <CheckIcon size={12} aria-hidden="true" /> : <CloseIcon size={12} aria-hidden="true" />}>
                                                        {record.status === 'completed' ? '完成' : '取消'}
                                                    </Badge>
                                                </div>
                                                <div className="record-details">
                                                    <span className="tabular-nums"><CalendarIcon size={16} aria-hidden="true" /> {record.date}</span>
                                                    <span><LocationIcon size={16} aria-hidden="true" /> {record.location}</span>
                                                    <span className="tabular-nums"><ClockIcon size={16} aria-hidden="true" /> {record.hours} 小時</span>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'settings' && isAdmin && (
                            <div className="settings-tab">
                                <Card padding="md" className="settings-section">
                                    <h3>管理員操作</h3>
                                    <div className="settings-actions">
                                        <Button variant="secondary" size="sm">發送訊息</Button>
                                        <Button variant="secondary" size="sm">重設密碼</Button>
                                        <Button variant="secondary" size="sm">指派任務</Button>
                                        <Button variant="secondary" size="sm">停用帳號</Button>
                                    </div>
                                </Card>

                                <Card padding="md" className="settings-section settings-section--danger">
                                    <h3>危險區域</h3>
                                    <p>以下操作不可逆，請謹慎操作</p>
                                    <Button variant="danger" size="sm" icon={<Trash2 size={14} aria-hidden="true" />}>永久刪除志工資料</Button>
                                </Card>
                            </div>
                        )}
                    </div>
                </div>

                {/* 側欄：狀態卡（頭像/地區/技能/統計） */}
                <aside className="volunteer-detail-page__side">
                    <Card padding="md" className="volunteer-profile-card">
                        <div className="avatar-section">
                            {volunteer.photoUrl ? (
                                <img
                                    src={volunteer.photoUrl}
                                    alt={volunteer.name}
                                    className="avatar-large avatar-photo"
                                />
                            ) : (
                                <div className="avatar-large" aria-hidden="true">
                                    {volunteer.name.charAt(0)}
                                </div>
                            )}

                            {/* 照片上傳選項 - 志工可自行操作 */}
                            <div className="photo-actions">
                                <label className="photo-upload-btn">
                                    <CameraIcon size={16} aria-hidden="true" /> 上傳照片
                                    <input
                                        type="file"
                                        accept="image/*"
                                        hidden
                                        onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const reader = new FileReader();
                                                reader.onloadend = () => {
                                                    // 預覽並模擬上傳
                                                    alert(`照片已選擇: ${file.name}\n\n實際上傳功能需連接後端 API`);
                                                };
                                                reader.readAsDataURL(file);
                                            }
                                        }}
                                    />
                                </label>

                                {volunteer.lineUserId && (
                                    <button
                                        type="button"
                                        className="photo-line-btn"
                                        onClick={() => {
                                            alert(`將從 LINE 帳號引入照片\n\nLINE User ID: ${volunteer.lineUserId}\n\n實際功能需整合 LINE Messaging API`);
                                        }}
                                    >
                                        <MessageCircle size={14} aria-hidden="true" /> 使用 LINE 照片
                                    </button>
                                )}
                            </div>
                        </div>

                        <p className="region"><LocationIcon size={16} aria-hidden="true" /> {volunteer.region}</p>

                        <div className="profile-stats">
                            <div className="stat-item">
                                <span className="stat-value tabular-nums">{volunteer.serviceHours}</span>
                                <span className="stat-label">服務時數</span>
                            </div>
                            <div className="stat-item">
                                <span className="stat-value tabular-nums">{volunteer.taskCount}</span>
                                <span className="stat-label">完成任務</span>
                            </div>
                        </div>

                        <div className="skills-section">
                            <h4>專長技能</h4>
                            <div className="skills-list">
                                {volunteer.skills.length === 0 ? (
                                    <span className="skills-empty">尚未設定</span>
                                ) : (
                                    volunteer.skills.map((skill, idx) => (
                                        <Tag key={idx} size="sm">{skill}</Tag>
                                    ))
                                )}
                            </div>
                        </div>
                    </Card>
                </aside>
            </div>
        </div>
    );
}
