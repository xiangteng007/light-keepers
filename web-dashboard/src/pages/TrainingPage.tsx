import { useState } from 'react';
import { Card, Button, Badge } from '../design-system';

// 課程分類
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

// 模擬課程資料
const MOCK_COURSES = [
    { id: '1', title: '地震應變基礎', category: 'disaster_basics', level: 'beginner', durationMinutes: 30, isRequired: true, description: '學習地震發生時的基本應變措施' },
    { id: '2', title: '急救技能入門', category: 'first_aid', level: 'beginner', durationMinutes: 45, isRequired: true, description: 'CPR、止血、包紮等基本急救技能' },
    { id: '3', title: '搜救裝備操作', category: 'rescue', level: 'intermediate', durationMinutes: 60, isRequired: false, description: '搜救裝備的正確使用方式' },
    { id: '4', title: '物資管理實務', category: 'logistics', level: 'beginner', durationMinutes: 40, isRequired: false, description: '物資點收、存放、發放流程' },
    { id: '5', title: '無線電通訊', category: 'communication', level: 'intermediate', durationMinutes: 50, isRequired: false, description: '無線電操作與通訊協定' },
    { id: '6', title: '團隊領導技巧', category: 'leadership', level: 'advanced', durationMinutes: 90, isRequired: false, description: '災害現場的團隊領導與決策' },
];

// 模擬學習進度
const MOCK_PROGRESS: Record<string, { status: string; progress: number }> = {
    '1': { status: 'completed', progress: 100 },
    '2': { status: 'in_progress', progress: 60 },
};

export default function TrainingPage() {
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [showCourseDetail, setShowCourseDetail] = useState<string | null>(null);

    // 統計
    const stats = {
        total: MOCK_COURSES.length,
        required: MOCK_COURSES.filter(c => c.isRequired).length,
        completed: Object.values(MOCK_PROGRESS).filter(p => p.status === 'completed').length,
        inProgress: Object.values(MOCK_PROGRESS).filter(p => p.status === 'in_progress').length,
    };

    // 篩選課程
    const filteredCourses = selectedCategory
        ? MOCK_COURSES.filter(c => c.category === selectedCategory)
        : MOCK_COURSES;

    const getCourseProgress = (courseId: string) => {
        return MOCK_PROGRESS[courseId] || { status: 'not_started', progress: 0 };
    };

    const selectedCourse = showCourseDetail
        ? MOCK_COURSES.find(c => c.id === showCourseDetail)
        : null;

    return (
        <div className="page training-page">
            <div className="page-header">
                <div className="page-header__left">
                    <h2>📚 培訓中心</h2>
                    <p className="page-subtitle">志工線上培訓課程</p>
                </div>
            </div>

            {/* 統計卡片 */}
            <div className="training-stats">
                <Card className="stat-card" padding="md">
                    <div className="stat-card__value">{stats.total}</div>
                    <div className="stat-card__label">總課程</div>
                </Card>
                <Card className="stat-card stat-card--warning" padding="md">
                    <div className="stat-card__value">{stats.required}</div>
                    <div className="stat-card__label">必修</div>
                </Card>
                <Card className="stat-card stat-card--success" padding="md">
                    <div className="stat-card__value">{stats.completed}</div>
                    <div className="stat-card__label">已完成</div>
                </Card>
                <Card className="stat-card stat-card--info" padding="md">
                    <div className="stat-card__value">{stats.inProgress}</div>
                    <div className="stat-card__label">進行中</div>
                </Card>
            </div>

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
