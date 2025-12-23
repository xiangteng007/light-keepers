import { useState } from 'react';
import { Card, Button, Badge } from '../design-system';
import './TrainingPage.css';

// 🏷️ 爬取課程分類
const SCRAPED_CATEGORY_CONFIG = {
    all: { label: '全部', icon: '📋', color: '#64748b' },
    emt: { label: 'EMT 救護', icon: '🚑', color: '#DC2626' },
    tecc: { label: 'TECC', icon: '⚔️', color: '#7C3AED' },
    tccc: { label: 'TCCC', icon: '🎖️', color: '#059669' },
    drone: { label: '無人機', icon: '🚁', color: '#2563EB' },
    rescue: { label: '搜救', icon: '🔍', color: '#EA580C' },
    first_aid: { label: '急救', icon: '🏥', color: '#10B981' },
    disaster: { label: '防災', icon: '🌊', color: '#0891B2' },
    other: { label: '其他', icon: '📚', color: '#6B7280' },
};

// 內部課程分類
const CATEGORY_CONFIG = {
    disaster_basics: { label: '災害基礎', icon: '📚', color: '#2196F3' },
    first_aid: { label: '急救技能', icon: '🏥', color: '#4CAF50' },
    rescue: { label: '搜救技術', icon: '🚒', color: '#FF5722' },
    logistics: { label: '物資調度', icon: '📦', color: '#FF9800' },
    communication: { label: '通訊聯絡', icon: '📡', color: '#9C27B0' },
    leadership: { label: '領導管理', icon: '👔', color: '#607D8B' },
};

const LEVEL_CONFIG = {
    beginner: { label: '初級', color: '#4CAF50' },
    intermediate: { label: '中級', color: '#FF9800' },
    advanced: { label: '高級', color: '#F44336' },
};

// 模擬內部課程
const MOCK_COURSES = [
    { id: '1', title: '地震應變基礎', category: 'disaster_basics', level: 'beginner', durationMinutes: 30, isRequired: true, description: '學習地震發生時的基本應變措施' },
    { id: '2', title: '急救技能入門', category: 'first_aid', level: 'beginner', durationMinutes: 45, isRequired: true, description: 'CPR、止血、包紮等基本急救技能' },
    { id: '3', title: '搜救裝備操作', category: 'rescue', level: 'intermediate', durationMinutes: 60, isRequired: false, description: '搜救裝備的正確使用方式' },
    { id: '4', title: '物資管理實務', category: 'logistics', level: 'beginner', durationMinutes: 40, isRequired: false, description: '物資點收、存放、發放流程' },
];

// 模擬進度
const MOCK_PROGRESS: Record<string, { status: string; progress: number }> = {
    '1': { status: 'completed', progress: 100 },
    '2': { status: 'in_progress', progress: 60 },
};

// 模擬爬取的外部課程
const MOCK_SCRAPED_COURSES = [
    { id: 's1', title: 'EMT-1 初級救護技術員訓練班', category: 'emt', organizer: '緊急醫療救護學會', courseDate: '2025/01/15-20', location: '台北市', originalUrl: 'https://www.emt.org.tw' },
    { id: 's2', title: 'TECC 戰術緊急傷患照護課程', category: 'tecc', organizer: '中華搜救總隊', courseDate: '2025/02/01-02', location: '新北市', originalUrl: 'https://www.sfast.org' },
    { id: 's3', title: 'TCCC 戰術戰傷救護訓練', category: 'tccc', organizer: '天使之翼協會', courseDate: '2025/01/25', location: '高雄市', originalUrl: 'https://angel-wings.tw' },
    { id: 's4', title: '無人機 G2 證照考取班', category: 'drone', organizer: '無人機訓練中心', courseDate: '2025/02/10-12', location: '台中市', originalUrl: '#' },
    { id: 's5', title: '山域搜救技術研習', category: 'rescue', organizer: '王英基金會', courseDate: '2025/01/30', location: '南投縣', originalUrl: 'https://www.wangyingfoundation.org' },
    { id: 's6', title: 'AED+CPR 認證班', category: 'first_aid', organizer: '紅十字會', courseDate: '每月開班', location: '全台', originalUrl: '#' },
];

interface ScrapedCourse {
    id: string;
    title: string;
    category: string;
    organizer: string;
    courseDate?: string;
    location?: string;
    originalUrl: string;
}

export default function TrainingPage() {
    const [activeTab, setActiveTab] = useState<'internal' | 'external'>('external');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [scrapedCategory, setScrapedCategory] = useState<string>('all');
    const [showCourseDetail, setShowCourseDetail] = useState<string | null>(null);
    const [scrapedCourses] = useState<ScrapedCourse[]>(MOCK_SCRAPED_COURSES);
    const [isLoading, setIsLoading] = useState(false);

    // 統計
    const stats = {
        total: MOCK_COURSES.length,
        external: scrapedCourses.length,
        completed: Object.values(MOCK_PROGRESS).filter(p => p.status === 'completed').length,
        inProgress: Object.values(MOCK_PROGRESS).filter(p => p.status === 'in_progress').length,
    };

    // 篩選內部課程
    const filteredCourses = selectedCategory
        ? MOCK_COURSES.filter(c => c.category === selectedCategory)
        : MOCK_COURSES;

    // 篩選外部課程
    const filteredScrapedCourses = scrapedCategory === 'all'
        ? scrapedCourses
        : scrapedCourses.filter(c => c.category === scrapedCategory);

    const getCourseProgress = (courseId: string) => {
        return MOCK_PROGRESS[courseId] || { status: 'not_started', progress: 0 };
    };

    const selectedCourse = showCourseDetail
        ? MOCK_COURSES.find(c => c.id === showCourseDetail)
        : null;

    // 手動觸發爬取 (連接後端 API)
    const handleRefreshCourses = async () => {
        setIsLoading(true);
        try {
            // TODO: 連接實際 API
            // const response = await fetch('/api/v1/training/scraper/scrape', { method: 'POST' });
            await new Promise(resolve => setTimeout(resolve, 1500)); // 模擬延遲
            alert('✅ 課程資料已更新！');
        } catch (error) {
            alert('❌ 更新失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="page training-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📚 培訓中心</h2>
                    <p className="page-subtitle">線上課程與外部培訓資源</p>
                </div>
                <div className="page-header__right">
                    <Button
                        variant="secondary"
                        onClick={handleRefreshCourses}
                        disabled={isLoading}
                    >
                        {isLoading ? '🔄 更新中...' : '🔄 更新課程'}
                    </Button>
                </div>
            </div>

            {/* 統計卡片 */}
            <div className="training-stats">
                <Card className="stat-card" padding="md">
                    <div className="stat-card__value">{stats.total}</div>
                    <div className="stat-card__label">內部課程</div>
                </Card>
                <Card className="stat-card stat-card--info" padding="md">
                    <div className="stat-card__value">{stats.external}</div>
                    <div className="stat-card__label">外部課程</div>
                </Card>
                <Card className="stat-card stat-card--success" padding="md">
                    <div className="stat-card__value">{stats.completed}</div>
                    <div className="stat-card__label">已完成</div>
                </Card>
                <Card className="stat-card stat-card--warning" padding="md">
                    <div className="stat-card__value">{stats.inProgress}</div>
                    <div className="stat-card__label">進行中</div>
                </Card>
            </div>

            {/* Tab 切換 */}
            <div className="training-tabs">
                <button
                    className={`training-tab ${activeTab === 'external' ? 'active' : ''}`}
                    onClick={() => setActiveTab('external')}
                >
                    🌐 外部課程查詢
                </button>
                <button
                    className={`training-tab ${activeTab === 'internal' ? 'active' : ''}`}
                    onClick={() => setActiveTab('internal')}
                >
                    📖 內部線上課程
                </button>
            </div>

            {/* ====== 外部課程區塊 ====== */}
            {activeTab === 'external' && (
                <>
                    {/* 分類篩選 - 爬蟲課程 */}
                    <div className="scraped-categories">
                        {Object.entries(SCRAPED_CATEGORY_CONFIG).map(([key, config]) => (
                            <button
                                key={key}
                                className={`scraped-category-btn ${scrapedCategory === key ? 'active' : ''}`}
                                style={{
                                    '--cat-color': config.color,
                                } as React.CSSProperties}
                                onClick={() => setScrapedCategory(key)}
                            >
                                <span className="scraped-category-icon">{config.icon}</span>
                                <span>{config.label}</span>
                            </button>
                        ))}
                    </div>

                    {/* 外部課程列表 */}
                    <div className="scraped-courses-grid">
                        {filteredScrapedCourses.length === 0 ? (
                            <div className="empty-state">
                                <span className="empty-icon">🔍</span>
                                <p>尚無此分類的課程</p>
                            </div>
                        ) : (
                            filteredScrapedCourses.map(course => {
                                const cat = SCRAPED_CATEGORY_CONFIG[course.category as keyof typeof SCRAPED_CATEGORY_CONFIG] || SCRAPED_CATEGORY_CONFIG.other;
                                return (
                                    <Card key={course.id} className="scraped-course-card" padding="md">
                                        <div className="scraped-course-header">
                                            <span
                                                className="scraped-badge"
                                                style={{ background: cat.color, color: 'white', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 500 }}
                                            >
                                                {cat.icon} {cat.label}
                                            </span>
                                        </div>
                                        <h4 className="scraped-course-title">{course.title}</h4>
                                        <div className="scraped-course-meta">
                                            <span>🏢 {course.organizer}</span>
                                            {course.courseDate && <span>📅 {course.courseDate}</span>}
                                            {course.location && <span>📍 {course.location}</span>}
                                        </div>
                                        <div className="scraped-course-actions">
                                            <Button
                                                size="sm"
                                                onClick={() => window.open(course.originalUrl, '_blank')}
                                            >
                                                🔗 查看詳情
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })
                        )}
                    </div>

                    {/* 資料來源說明 */}
                    <div className="data-source-info">
                        <p>📡 資料來源：天使之翼協會、中華搜救總隊、王英基金會、緊急醫療救護學會</p>
                        <p>⏰ 每日早上 6:00 自動更新 • 資料保留 24 小時</p>
                    </div>
                </>
            )}

            {/* ====== 內部課程區塊 ====== */}
            {activeTab === 'internal' && (
                <>
                    {/* 分類篩選 */}
                    <div className="training-categories">
                        <button
                            className={`category-btn ${selectedCategory === '' ? 'active' : ''}`}
                            onClick={() => setSelectedCategory('')}
                        >
                            全部
                        </button>
                        {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                            <button
                                key={key}
                                className={`category-btn ${selectedCategory === key ? 'active' : ''}`}
                                onClick={() => setSelectedCategory(key)}
                            >
                                {config.icon} {config.label}
                            </button>
                        ))}
                    </div>

                    {/* 課程列表 */}
                    <div className="courses-grid">
                        {filteredCourses.map(course => {
                            const progress = getCourseProgress(course.id);
                            const category = CATEGORY_CONFIG[course.category as keyof typeof CATEGORY_CONFIG];
                            const level = LEVEL_CONFIG[course.level as keyof typeof LEVEL_CONFIG];

                            return (
                                <Card key={course.id} className="course-card" padding="md">
                                    <div className="course-card__header">
                                        <span className="course-card__icon" style={{ background: category.color }}>
                                            {category.icon}
                                        </span>
                                        {course.isRequired && (
                                            <Badge variant="danger" size="sm">必修</Badge>
                                        )}
                                    </div>

                                    <h4 className="course-card__title">{course.title}</h4>
                                    <p className="course-card__desc">{course.description}</p>

                                    <div className="course-card__meta">
                                        <span style={{ color: level.color }}>{level.label}</span>
                                        <span>⏱️ {course.durationMinutes} 分鐘</span>
                                    </div>

                                    {/* 進度條 */}
                                    <div className="progress-bar">
                                        <div
                                            className="progress-bar__fill"
                                            style={{
                                                width: `${progress.progress}%`,
                                                background: progress.status === 'completed' ? '#4CAF50' : '#2196F3',
                                            }}
                                        />
                                    </div>

                                    <div className="course-card__actions">
                                        <span className="progress-text">
                                            {progress.status === 'completed' ? '✅ 已完成' :
                                                progress.status === 'in_progress' ? `${progress.progress}%` : '未開始'}
                                        </span>
                                        <Button
                                            size="sm"
                                            variant={progress.status === 'completed' ? 'secondary' : 'primary'}
                                            onClick={() => setShowCourseDetail(course.id)}
                                        >
                                            {progress.status === 'completed' ? '複習' :
                                                progress.status === 'in_progress' ? '繼續' : '開始'}
                                        </Button>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}

            {/* 課程詳情 Modal */}
            {selectedCourse && (
                <div className="modal-overlay" onClick={() => setShowCourseDetail(null)}>
                    <Card className="modal-content modal-content--lg" padding="lg" onClick={e => e.stopPropagation()}>
                        <h3>{selectedCourse.title}</h3>
                        <p className="modal-desc">{selectedCourse.description}</p>

                        <div className="course-content">
                            <h4>課程內容</h4>
                            <p>課程內容載入中... (實際整合後從 API 載入)</p>
                        </div>

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowCourseDetail(null)}>
                                關閉
                            </Button>
                            <Button>
                                ▶️ 開始學習
                            </Button>
                        </div>
                    </Card>
                </div>
            )}
        </div>
    );
}
