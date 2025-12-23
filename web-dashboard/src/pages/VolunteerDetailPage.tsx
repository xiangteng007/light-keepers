import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import './VolunteerDetailPage.css';

// 模擬志工詳細資料
interface Volunteer {
    id: string;
    name: string;
    email: string;
    phone: string;
    region: string;
    address: string;
    skills: string[];
    status: 'available' | 'busy' | 'offline';
    emergencyContact: string;
    emergencyPhone: string;
    notes: string;
    serviceHours: number;
    taskCount: number;
    lineUserId?: string;
    photoUrl?: string; // 📷 志工照片
    createdAt: string;
}

interface ServiceRecord {
    id: string;
    taskTitle: string;
    date: string;
    hours: number;
    status: 'completed' | 'cancelled';
    location: string;
}

// 模擬資料
const MOCK_VOLUNTEER: Volunteer = {
    id: '1',
    name: '王大明',
    email: 'wang.daming@example.com',
    phone: '0912-345-678',
    region: '台北市中正區',
    address: '台北市中正區忠孝東路一段100號',
    skills: ['急救', '搜救', '通訊'],
    status: 'available',
    emergencyContact: '王媽媽',
    emergencyPhone: '0923-456-789',
    notes: '具有 EMT-1 證照，曾參與多次災害救援',
    serviceHours: 120,
    taskCount: 15,
    lineUserId: 'U1234567890',
    photoUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=WangDaming', // 📷 預設頭像
    createdAt: '2024-06-15T10:30:00Z',
};

const MOCK_SERVICE_RECORDS: ServiceRecord[] = [
    { id: '1', taskTitle: '0403 花蓮地震救災支援', date: '2024-04-05', hours: 12, status: 'completed', location: '花蓮縣花蓮市' },
    { id: '2', taskTitle: '社區防災演習協助', date: '2024-03-20', hours: 4, status: 'completed', location: '台北市中正區' },
    { id: '3', taskTitle: '物資發放站志工', date: '2024-02-28', hours: 6, status: 'completed', location: '台北市萬華區' },
    { id: '4', taskTitle: '颱風災前準備作業', date: '2024-07-22', hours: 8, status: 'completed', location: '新北市板橋區' },
    { id: '5', taskTitle: '臨時取消的活動', date: '2024-01-15', hours: 0, status: 'cancelled', location: '台北市信義區' },
];

const STATUS_CONFIG = {
    available: { label: '可用', color: '#22c55e', bgColor: '#dcfce7' },
    busy: { label: '執勤中', color: '#f59e0b', bgColor: '#fef3c7' },
    offline: { label: '離線', color: '#6b7280', bgColor: '#f3f4f6' },
};

export default function VolunteerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [volunteer, setVolunteer] = useState<Volunteer | null>(null);
    const [serviceRecords, setServiceRecords] = useState<ServiceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'info' | 'records' | 'settings'>('info');

    // 模擬管理員權限檢查
    const isAdmin = true; // 實際應從 auth context 取得

    useEffect(() => {
        // 模擬 API 載入
        setTimeout(() => {
            setVolunteer(MOCK_VOLUNTEER);
            setServiceRecords(MOCK_SERVICE_RECORDS);
            setIsLoading(false);
        }, 500);
    }, [id]);

    if (isLoading) {
        return (
            <div className="page volunteer-detail-page">
                <div className="loading-container">
                    <div className="loading-spinner"></div>
                    <p>載入志工資料中...</p>
                </div>
            </div>
        );
    }

    if (!volunteer) {
        return (
            <div className="page volunteer-detail-page">
                <div className="error-container">
                    <h2>找不到志工資料</h2>
                    <Link to="/volunteers" className="btn btn-primary">返回志工列表</Link>
                </div>
            </div>
        );
    }

    const statusConfig = STATUS_CONFIG[volunteer.status];
    const completedRecords = serviceRecords.filter(r => r.status === 'completed');
    const totalHours = completedRecords.reduce((sum, r) => sum + r.hours, 0);

    return (
        <div className="page volunteer-detail-page">
            {/* 頁首 */}
            <div className="page-header">
                <button onClick={() => navigate('/volunteers')} className="back-btn">
                    ← 返回列表
                </button>
                <h1>👤 志工詳情</h1>
                {isAdmin && (
                    <div className="header-actions">
                        <button className="btn btn-outline">✏️ 編輯</button>
                        <button className="btn btn-danger">🗑️ 刪除</button>
                    </div>
                )}
            </div>

            {/* 志工基本資訊卡片 */}
            <div className="volunteer-profile-card">
                <div className="profile-header">
                    {/* 📷 志工照片區塊 - 可自行上傳或使用 LINE 照片 */}
                    <div className="avatar-section">
                        {volunteer.photoUrl ? (
                            <img
                                src={volunteer.photoUrl}
                                alt={volunteer.name}
                                className="avatar-large avatar-photo"
                            />
                        ) : (
                            <div className="avatar-large">
                                {volunteer.name.charAt(0)}
                            </div>
                        )}

                        {/* 照片上傳選項 - 志工可自行操作 */}
                        <div className="photo-actions">
                            {/* 自行上傳照片 */}
                            <label className="photo-upload-btn">
                                📷 上傳照片
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
                                                alert(`✅ 照片已選擇: ${file.name}\n\n實際上傳功能需連接後端 API`);
                                            };
                                            reader.readAsDataURL(file);
                                        }
                                    }}
                                />
                            </label>

                            {/* 使用 LINE 帳號照片 */}
                            {volunteer.lineUserId && (
                                <button
                                    className="photo-line-btn"
                                    onClick={() => {
                                        // 模擬引入 LINE 照片
                                        // 實際需呼叫 LINE API 取得使用者頭像
                                        alert(`📱 將從 LINE 帳號引入照片\n\nLINE User ID: ${volunteer.lineUserId}\n\n實際功能需整合 LINE Messaging API`);
                                    }}
                                >
                                    💚 使用 LINE 照片
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="profile-info">
                        <h2>{volunteer.name}</h2>
                        <span
                            className="status-badge"
                            style={{
                                backgroundColor: statusConfig.bgColor,
                                color: statusConfig.color
                            }}
                        >
                            {statusConfig.label}
                        </span>
                        <p className="region">📍 {volunteer.region}</p>
                    </div>
                    <div className="profile-stats">
                        <div className="stat-item">
                            <span className="stat-value">{volunteer.serviceHours}</span>
                            <span className="stat-label">服務時數</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{volunteer.taskCount}</span>
                            <span className="stat-label">完成任務</span>
                        </div>
                    </div>
                </div>

                {/* 技能標籤 */}
                <div className="skills-section">
                    <h4>專長技能</h4>
                    <div className="skills-list">
                        {volunteer.skills.map((skill, idx) => (
                            <span key={idx} className="skill-tag">{skill}</span>
                        ))}
                    </div>
                </div>
            </div>

            {/* 標籤頁導航 */}
            <div className="tabs-nav">
                <button
                    className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
                    onClick={() => setActiveTab('info')}
                >
                    📋 個人資料
                </button>
                <button
                    className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
                    onClick={() => setActiveTab('records')}
                >
                    📊 服務紀錄
                </button>
                {isAdmin && (
                    <button
                        className={`tab-btn ${activeTab === 'settings' ? 'active' : ''}`}
                        onClick={() => setActiveTab('settings')}
                    >
                        ⚙️ 管理設定
                    </button>
                )}
            </div>

            {/* 標籤內容 */}
            <div className="tab-content">
                {activeTab === 'info' && (
                    <div className="info-tab">
                        <div className="info-section">
                            <h3>🔐 敏感資料 (僅管理員可見)</h3>
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
                        </div>

                        <div className="info-section">
                            <h3>🆘 緊急聯絡人</h3>
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
                        </div>

                        <div className="info-section">
                            <h3>📝 備註</h3>
                            <p className="notes">{volunteer.notes}</p>
                        </div>

                        <div className="info-section">
                            <h3>📅 帳號資訊</h3>
                            <div className="info-grid">
                                <div className="info-item">
                                    <label>註冊日期</label>
                                    <span>{new Date(volunteer.createdAt).toLocaleDateString('zh-TW')}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'records' && (
                    <div className="records-tab">
                        <div className="records-summary">
                            <div className="summary-card">
                                <span className="summary-value">{completedRecords.length}</span>
                                <span className="summary-label">完成任務</span>
                            </div>
                            <div className="summary-card">
                                <span className="summary-value">{totalHours}</span>
                                <span className="summary-label">總服務時數</span>
                            </div>
                        </div>

                        <div className="records-list">
                            {serviceRecords.map(record => (
                                <div key={record.id} className={`record-item ${record.status}`}>
                                    <div className="record-header">
                                        <span className="record-title">{record.taskTitle}</span>
                                        <span className={`record-status ${record.status}`}>
                                            {record.status === 'completed' ? '✅ 完成' : '❌ 取消'}
                                        </span>
                                    </div>
                                    <div className="record-details">
                                        <span>📅 {record.date}</span>
                                        <span>📍 {record.location}</span>
                                        <span>⏱️ {record.hours} 小時</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && isAdmin && (
                    <div className="settings-tab">
                        <div className="settings-section">
                            <h3>⚙️ 管理員操作</h3>
                            <div className="settings-actions">
                                <button className="btn btn-outline">📧 發送訊息</button>
                                <button className="btn btn-outline">🔄 重設密碼</button>
                                <button className="btn btn-outline">📋 指派任務</button>
                                <button className="btn btn-warning">⏸️ 停用帳號</button>
                            </div>
                        </div>

                        <div className="settings-section danger-zone">
                            <h3>🚨 危險區域</h3>
                            <p>以下操作不可逆，請謹慎操作</p>
                            <button className="btn btn-danger">🗑️ 永久刪除志工資料</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
