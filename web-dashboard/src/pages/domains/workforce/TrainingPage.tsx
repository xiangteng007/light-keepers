import { useState, useEffect } from 'react';
import { Card, Button, Badge, Modal, InputField } from '../design-system';
import { getScrapedCourses, triggerScrape } from '../api/services';
import type { ScrapedCourse } from '../api/services';
import { useAuth } from '../../../context/AuthContext';
import { Plus } from 'lucide-react';
import './TrainingPage.css';

// 🏷�?爬取課程分類
const SCRAPED_CATEGORY_CONFIG = {
    all: { label: '全部', icon: '📋', color: '#64748b' },
    emt: { label: 'EMT 救護', icon: '🚑', color: '#DC2626' },
    tecc: { label: 'TECC', icon: '⚔️', color: '#7C3AED' },
    tccc: { label: 'TCCC', icon: '🎖�?, color: '#059669' },
    drone: { label: '無人�?, icon: '🚁', color: '#2563EB' },
    rescue: { label: '搜救', icon: '🔍', color: '#EA580C' },
    first_aid: { label: '急救', icon: '🏥', color: '#10B981' },
    disaster: { label: '防災', icon: '🌊', color: '#0891B2' },
    other: { label: '其他', icon: '📚', color: '#6B7280' },
};

// 內部課程分類
const INTERNAL_CATEGORY_CONFIG = {
    disaster_basics: { label: '災害基礎', icon: '📚', color: '#2196F3' },
    first_aid: { label: '急救技�?, icon: '🏥', color: '#4CAF50' },
    rescue: { label: '搜救技�?, icon: '🚒', color: '#FF5722' },
    logistics: { label: '物資調度', icon: '📦', color: '#FF9800' },
    communication: { label: '通訊聯絡', icon: '📡', color: '#9C27B0' },
    leadership: { label: '領導管理', icon: '👔', color: '#607D8B' },
};

const LEVEL_CONFIG = {
    beginner: { label: '初級', color: '#4CAF50' },
    intermediate: { label: '中級', color: '#FF9800' },
    advanced: { label: '高級', color: '#F44336' },
};

// 內部課程類型
interface InternalCourse {
    id: string;
    title: string;
    category: string;
    level: string;
    durationMinutes: number;
    isRequired: boolean;
    description: string;
    externalUrl?: string;
}

export default function TrainingPage() {
    const { user } = useAuth();
    const userLevel = user?.roleLevel ?? 1;
    const canManageCourses = userLevel >= 3; // 常務理事及以�?

    const [activeTab, setActiveTab] = useState<'external' | 'internal'>('external');
    const [scrapedCategory, setScrapedCategory] = useState<string>('all');
    const [scrapedCourses, setScrapedCourses] = useState<ScrapedCourse[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingCourses, setIsLoadingCourses] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 新增課程 Modal 狀�?
    const [showAddCourseModal, setShowAddCourseModal] = useState(false);
    const [newCourse, setNewCourse] = useState<Partial<InternalCourse>>({
        category: 'disaster_basics',
        level: 'beginner',
        isRequired: false,
        durationMinutes: 30,
    });

    // 內部課程列表 (未來�?API 載入)
    const [internalCourses] = useState<InternalCourse[]>([]);

    // 載入爬取的課�?
    useEffect(() => {
        const fetchCourses = async () => {
            setIsLoadingCourses(true);
            setError(null);
            try {
                const response = await getScrapedCourses();
                setScrapedCourses(response.data.data);
            } catch (err) {
                console.error('Failed to fetch scraped courses:', err);
                setError('載入外部課程失敗');
            } finally {
                setIsLoadingCourses(false);
            }
        };
        fetchCourses();
    }, []);

    // 統計
    const stats = {
        internal: internalCourses.length,
        external: scrapedCourses.length,
    };

    // 篩選外部課程
    const filteredScrapedCourses = scrapedCategory === 'all'
        ? scrapedCourses
        : scrapedCourses.filter(c => c.category === scrapedCategory);

    // 手動觸發爬取 (連接後端 API)
    const handleRefreshCourses = async () => {
        setIsLoading(true);
        try {
            const response = await triggerScrape();
            const result = response.data.data;
            alert(`�?課程資料已更新！\n成功: ${result.success} 個來源\n失敗: ${result.failed} 個來源`);
            // 重新載入課程
            const coursesResponse = await getScrapedCourses();
            setScrapedCourses(coursesResponse.data.data);
        } catch (err) {
            console.error('Scrape trigger failed:', err);
            alert('�?更新失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    // 新增課程處理
    const handleAddCourse = async () => {
        if (!newCourse.title) {
            alert('請輸入課程標�?);
            return;
        }
        // TODO: 連接後端 API 新增課程
        console.log('New course:', newCourse);
        alert('📚 課程功能開發中，敬請期待�?);
        setShowAddCourseModal(false);
        setNewCourse({
            category: 'disaster_basics',
            level: 'beginner',
            isRequired: false,
            durationMinutes: 30,
        });
    };

    return (
        <div className="page training-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📚 培訓中心</h2>
                    <p className="page-subtitle">線上課程與外部培訓資�?/p>
                </div>
                <div className="page-header__right">
                    {canManageCourses && (
                        <Button
                            variant="primary"
                            onClick={() => setShowAddCourseModal(true)}
                        >
                            <Plus size={18} /> 新增課程
                        </Button>
                    )}
                    <Button
                        variant="secondary"
                        onClick={handleRefreshCourses}
                        disabled={isLoading}
                    >
                        {isLoading ? '🔄 更新�?..' : '🔄 更新課程'}
                    </Button>
                </div>
            </div>

            {/* 統計卡片 */}
            <div className="training-stats">
                <Card className="stat-card" padding="md">
                    <div className="stat-card__value">{stats.internal}</div>
                    <div className="stat-card__label">內部課程</div>
                </Card>
                <Card className="stat-card stat-card--info" padding="md">
                    <div className="stat-card__value">{stats.external}</div>
                    <div className="stat-card__label">外部課程</div>
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

            {/* ====== 外部課程區�?====== */}
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
                        {isLoadingCourses ? (
                            <div className="empty-state">
                                <span className="empty-icon">�?/span>
                                <p>載入外部課程�?..</p>
                            </div>
                        ) : error ? (
                            <div className="empty-state">
                                <span className="empty-icon">⚠️</span>
                                <p>{error}</p>
                            </div>
                        ) : filteredScrapedCourses.length === 0 ? (
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
                        <p>📡 資料來源：天使之翼協會、中華搜救總隊、王英基金會、緊急醫療救護學�?/p>
                        <p>�?每日早上 6:00 自動更新 �?資料保留 24 小時</p>
                    </div>
                </>
            )}

            {/* ====== 內部課程區�?====== */}
            {activeTab === 'internal' && (
                <div className="internal-courses-section">
                    {internalCourses.length === 0 ? (
                        <div className="empty-state empty-state--large">
                            <span className="empty-icon">📚</span>
                            <h3>內部課程籌備�?/h3>
                            <p>我們正在努力準備內部培訓課程，敬請期待�?/p>
                            {canManageCourses && (
                                <Button
                                    variant="primary"
                                    onClick={() => setShowAddCourseModal(true)}
                                    style={{ marginTop: '1rem' }}
                                >
                                    <Plus size={18} /> 新增第一堂課�?
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="courses-grid">
                            {internalCourses.map(course => {
                                const category = INTERNAL_CATEGORY_CONFIG[course.category as keyof typeof INTERNAL_CATEGORY_CONFIG];
                                const level = LEVEL_CONFIG[course.level as keyof typeof LEVEL_CONFIG];

                                return (
                                    <Card key={course.id} className="course-card" padding="md">
                                        <div className="course-card__header">
                                            <span className="course-card__icon" style={{ background: category?.color }}>
                                                {category?.icon}
                                            </span>
                                            {course.isRequired && (
                                                <Badge variant="danger" size="sm">必修</Badge>
                                            )}
                                        </div>
                                        <h4 className="course-card__title">{course.title}</h4>
                                        <p className="course-card__desc">{course.description}</p>
                                        <div className="course-card__meta">
                                            <span style={{ color: level?.color }}>{level?.label}</span>
                                            <span>⏱️ {course.durationMinutes} 分鐘</span>
                                        </div>
                                        <div className="course-card__actions">
                                            <Button
                                                size="sm"
                                                onClick={() => course.externalUrl && window.open(course.externalUrl, '_blank')}
                                            >
                                                開始學習
                                            </Button>
                                        </div>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* 新增課程 Modal */}
            {showAddCourseModal && (
                <Modal
                    isOpen={showAddCourseModal}
                    onClose={() => setShowAddCourseModal(false)}
                    title="新增內部課程"
                >
                    <div className="add-course-form">
                        <InputField
                            label="課程標題"
                            value={newCourse.title || ''}
                            onChange={(e) => setNewCourse(prev => ({ ...prev, title: e.target.value }))}
                            placeholder="輸入課程名稱"
                        />

                        <div className="form-row">
                            <div className="form-group">
                                <label>分類</label>
                                <select
                                    value={newCourse.category}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, category: e.target.value }))}
                                >
                                    {Object.entries(INTERNAL_CATEGORY_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.icon} {config.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>難度</label>
                                <select
                                    value={newCourse.level}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, level: e.target.value }))}
                                >
                                    {Object.entries(LEVEL_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>時長 (分鐘)</label>
                                <input
                                    type="number"
                                    value={newCourse.durationMinutes}
                                    onChange={(e) => setNewCourse(prev => ({ ...prev, durationMinutes: parseInt(e.target.value) || 30 }))}
                                    min={5}
                                    max={480}
                                />
                            </div>
                            <div className="form-group">
                                <label className="checkbox-label">
                                    <input
                                        type="checkbox"
                                        checked={newCourse.isRequired}
                                        onChange={(e) => setNewCourse(prev => ({ ...prev, isRequired: e.target.checked }))}
                                    />
                                    必修課程
                                </label>
                            </div>
                        </div>

                        <InputField
                            label="課程描述"
                            value={newCourse.description || ''}
                            onChange={(e) => setNewCourse(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="簡短描述課程內容"
                        />

                        <InputField
                            label="外部連結 (選填)"
                            value={newCourse.externalUrl || ''}
                            onChange={(e) => setNewCourse(prev => ({ ...prev, externalUrl: e.target.value }))}
                            placeholder="https://..."
                        />

                        <div className="modal-actions">
                            <Button variant="secondary" onClick={() => setShowAddCourseModal(false)}>
                                取消
                            </Button>
                            <Button variant="primary" onClick={handleAddCourse}>
                                新增課程
                            </Button>
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
