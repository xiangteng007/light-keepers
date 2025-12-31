import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { pointsApi } from '../api/vms';
import type { PointsRecord, PointsSummary } from '../api/vms';
import { Card, Badge } from '../design-system';
import './PointsReportPage.css';

// 紀錄類型標籤
const RECORD_TYPE_LABELS: Record<string, { name: string; color: string; icon: string }> = {
    task: { name: '任務出勤', color: 'success', icon: '🚒' },
    training: { name: '教育訓練', color: 'info', icon: '📚' },
    special: { name: '特殊貢獻', color: 'warning', icon: '⭐' },
    adjustment: { name: '積分調整', color: 'secondary', icon: '⚙️' },
};

export default function PointsReportPage() {
    const { user } = useAuth();
    const [records, setRecords] = useState<PointsRecord[]>([]);
    const [summary, setSummary] = useState<PointsSummary | null>(null);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'summary' | 'details'>('summary');

    // 獲取志工 ID
    const volunteerId = (user as any)?.volunteerId || user?.id;

    // 可選年份 (近 5 年)
    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

    useEffect(() => {
        if (volunteerId) {
            loadData();
        }
    }, [volunteerId, selectedYear]);

    const loadData = async () => {
        try {
            setIsLoading(true);
            const [summaryRes, recordsRes] = await Promise.all([
                pointsApi.getYearlySummary(volunteerId, selectedYear),
                pointsApi.getByVolunteer(volunteerId),
            ]);
            setSummary(summaryRes.data);
            setRecords(recordsRes.data);
        } catch (err) {
            console.error('Failed to load points data:', err);
        } finally {
            setIsLoading(false);
        }
    };

    // 格式化日期
    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('zh-TW', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
        });
    };

    // 年度績效等級
    const getPerformanceLevel = (totalPoints: number): { level: string; color: string; icon: string } => {
        if (totalPoints >= 500) return { level: '白金志工', color: '#9333ea', icon: '💎' };
        if (totalPoints >= 300) return { level: '金牌志工', color: '#f59e0b', icon: '🥇' };
        if (totalPoints >= 150) return { level: '銀牌志工', color: '#6b7280', icon: '🥈' };
        if (totalPoints >= 50) return { level: '銅牌志工', color: '#cd7f32', icon: '🥉' };
        return { level: '新進志工', color: '#10b981', icon: '🌱' };
    };

    if (isLoading) {
        return (
            <div className="page points-report-page">
                <div className="loading-state">載入中...</div>
            </div>
        );
    }

    const performance = summary ? getPerformanceLevel(summary.totalPoints) : null;

    return (
        <div className="page points-report-page">
            <div className="page-header">
                <div className="header-left">
                    <h2>📊 志工積分報表</h2>
                    <p className="page-subtitle">查看您的服務時數與積分統計</p>
                </div>
                <div className="header-controls">
                    <select
                        className="year-selector"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    >
                        {yearOptions.map(year => (
                            <option key={year} value={year}>{year} 年</option>
                        ))}
                    </select>
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${viewMode === 'summary' ? 'active' : ''}`}
                            onClick={() => setViewMode('summary')}
                        >
                            統計
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'details' ? 'active' : ''}`}
                            onClick={() => setViewMode('details')}
                        >
                            明細
                        </button>
                    </div>
                </div>
            </div>

            {/* 年度績效卡片 */}
            {summary && performance && (
                <Card padding="lg" className="performance-card">
                    <div className="performance-header">
                        <span className="performance-icon">{performance.icon}</span>
                        <div className="performance-info">
                            <span className="performance-level" style={{ color: performance.color }}>
                                {performance.level}
                            </span>
                            <span className="performance-year">{selectedYear} 年度</span>
                        </div>
                    </div>
                    <div className="performance-stats">
                        <div className="stat-item stat-item--primary">
                            <span className="stat-value">{summary.totalPoints}</span>
                            <span className="stat-label">總積分</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{summary.totalHours.toFixed(1)}</span>
                            <span className="stat-label">服務時數</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{summary.taskCount}</span>
                            <span className="stat-label">任務場次</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-value">{summary.trainingCount}</span>
                            <span className="stat-label">訓練場次</span>
                        </div>
                    </div>
                </Card>
            )}

            {viewMode === 'summary' && summary && (
                <>
                    {/* 分類統計 */}
                    <h3 className="section-title">📈 分類統計</h3>
                    <div className="category-stats">
                        {Object.entries(summary.byType).map(([type, data]) => {
                            const typeInfo = RECORD_TYPE_LABELS[type];
                            if (!typeInfo || (data.hours === 0 && data.points === 0)) return null;

                            return (
                                <Card key={type} padding="md" className="category-card">
                                    <div className="category-header">
                                        <span className="category-icon">{typeInfo.icon}</span>
                                        <span className="category-name">{typeInfo.name}</span>
                                    </div>
                                    <div className="category-data">
                                        <div className="category-stat">
                                            <span className="cat-value">{data.points}</span>
                                            <span className="cat-label">積分</span>
                                        </div>
                                        <div className="category-stat">
                                            <span className="cat-value">{data.hours.toFixed(1)}</span>
                                            <span className="cat-label">時數</span>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>

                    {/* 積分說明 */}
                    <Card padding="md" className="info-card">
                        <h4>💡 積分計算方式</h4>
                        <ul className="info-list">
                            <li>任務出勤：每小時 10 積分</li>
                            <li>夜間任務 (22:00-06:00)：加成 50%</li>
                            <li>高風險任務：加成 50%</li>
                            <li>教育訓練：每小時 5 積分</li>
                            <li>特殊貢獻：依實際情況給予</li>
                        </ul>
                    </Card>
                </>
            )}

            {viewMode === 'details' && (
                <>
                    <h3 className="section-title">📝 積分明細</h3>
                    <Card padding="none" className="records-list">
                        {records.length === 0 ? (
                            <div className="empty-records">尚無積分紀錄</div>
                        ) : (
                            <table className="records-table">
                                <thead>
                                    <tr>
                                        <th>日期</th>
                                        <th>類型</th>
                                        <th>說明</th>
                                        <th>時數</th>
                                        <th>倍率</th>
                                        <th>積分</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {records.map(record => {
                                        const typeInfo = RECORD_TYPE_LABELS[record.recordType] || {
                                            name: '未知',
                                            color: 'secondary',
                                            icon: '❓'
                                        };

                                        return (
                                            <tr key={record.id}>
                                                <td>{formatDate(record.createdAt)}</td>
                                                <td>
                                                    <Badge
                                                        variant={typeInfo.color as any}
                                                        size="sm"
                                                    >
                                                        {typeInfo.icon} {typeInfo.name}
                                                    </Badge>
                                                </td>
                                                <td className="description-cell">
                                                    {record.description || '-'}
                                                </td>
                                                <td>{record.hours.toFixed(1)}</td>
                                                <td>
                                                    {record.multiplier > 1 ? (
                                                        <span className="multiplier-badge">
                                                            x{record.multiplier.toFixed(1)}
                                                        </span>
                                                    ) : '-'}
                                                </td>
                                                <td className="points-cell">
                                                    <span className={record.points >= 0 ? 'positive' : 'negative'}>
                                                        {record.points >= 0 ? '+' : ''}{record.points}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
                    </Card>
                </>
            )}
        </div>
    );
}
