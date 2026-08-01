import { useState, useEffect } from 'react';
import { BarChart3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { pointsApi } from '../api/vms';
import type { PointsRecord, PointsSummary } from '../api/vms';
import { Card, Badge, StatIndicator } from '../design-system';
import type { BadgeProps } from '../design-system';
import EmptyState from '../components/shared/EmptyState';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import './PointsReportPage.css';

// 紀錄類型標籤（Badge variant 對照 DESIGN_LANGUAGE.md §3）
const RECORD_TYPE_LABELS: Record<string, { name: string; variant: BadgeProps['variant']; icon: string }> = {
    task: { name: '任務出勤', variant: 'success', icon: '🚒' },
    training: { name: '教育訓練', variant: 'info', icon: '📚' },
    special: { name: '特殊貢獻', variant: 'warning', icon: '⭐' },
    adjustment: { name: '積分調整', variant: 'default', icon: '⚙️' },
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

    // 年度績效等級（獎章分級為裝飾性類別色，非狀態色 — 依 DESIGN_LANGUAGE.md §3
    // 刻意避開與 --color-warning/--color-success 完全相同的色值，避免誤讀為狀態）
    const getPerformanceLevel = (totalPoints: number): { level: string; color: string; icon: string } => {
        if (totalPoints >= 500) return { level: '白金志工', color: '#9333EA', icon: '💎' };
        if (totalPoints >= 300) return { level: '金牌志工', color: '#B8860B', icon: '🥇' };
        if (totalPoints >= 150) return { level: '銀牌志工', color: '#6B7280', icon: '🥈' };
        if (totalPoints >= 50) return { level: '銅牌志工', color: '#B87333', icon: '🥉' };
        return { level: '新進志工', color: '#0D9488', icon: '🌱' };
    };

    const performance = summary ? getPerformanceLevel(summary.totalPoints) : null;

    return (
        <div className="page points-report-page">
            <div className="page-header">
                <div className="header-left">
                    <h1>志工積分報表</h1>
                    <p className="page-subtitle">查看您的服務時數與積分統計</p>
                </div>
                <div className="header-controls">
                    <select
                        className="year-selector"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                        aria-label="選擇年份"
                    >
                        {yearOptions.map(year => (
                            <option key={year} value={year}>{year} 年</option>
                        ))}
                    </select>
                    <div className="view-toggle" role="tablist" aria-label="檢視模式">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === 'summary'}
                            className={`toggle-btn ${viewMode === 'summary' ? 'is-active' : ''}`}
                            onClick={() => setViewMode('summary')}
                        >
                            統計
                        </button>
                        <button
                            type="button"
                            role="tab"
                            aria-selected={viewMode === 'details'}
                            className={`toggle-btn ${viewMode === 'details' ? 'is-active' : ''}`}
                            onClick={() => setViewMode('details')}
                        >
                            明細
                        </button>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="points-report-page__skeleton" aria-busy="true" aria-label="載入積分資料中">
                    <Skeleton variant="card" height={140} />
                    <Skeleton variant="card" height={220} />
                </div>
            ) : (
                <>
                    {/* 年度績效卡片 */}
                    {summary && performance && (
                        <Card padding="lg" className="performance-card">
                            <div className="performance-header">
                                <span className="performance-icon" aria-hidden="true">{performance.icon}</span>
                                <div className="performance-info">
                                    <span className="performance-level" style={{ color: performance.color }}>
                                        {performance.level}
                                    </span>
                                    <span className="performance-year">{selectedYear} 年度</span>
                                </div>
                            </div>
                            <div className="performance-stats">
                                <StatIndicator value={summary.totalPoints} label="總積分" variant="default" size="lg" />
                                <StatIndicator value={summary.totalHours.toFixed(1)} label="服務時數" size="lg" />
                                <StatIndicator value={summary.taskCount} label="任務場次" size="lg" />
                                <StatIndicator value={summary.trainingCount} label="訓練場次" size="lg" />
                            </div>
                        </Card>
                    )}

                    {viewMode === 'summary' && summary && (
                        <>
                            {/* 分類統計 */}
                            <h2 className="section-title">分類統計</h2>
                            <div className="category-stats">
                                {Object.entries(summary.byType).map(([type, data]) => {
                                    const typeInfo = RECORD_TYPE_LABELS[type];
                                    if (!typeInfo || (data.hours === 0 && data.points === 0)) return null;

                                    return (
                                        <Card key={type} padding="md" className="category-card">
                                            <div className="category-header">
                                                <span className="category-icon" aria-hidden="true">{typeInfo.icon}</span>
                                                <span className="category-name">{typeInfo.name}</span>
                                            </div>
                                            <div className="category-data">
                                                <div className="category-stat">
                                                    <span className="cat-value tabular-nums">{data.points}</span>
                                                    <span className="cat-label">積分</span>
                                                </div>
                                                <div className="category-stat">
                                                    <span className="cat-value tabular-nums">{data.hours.toFixed(1)}</span>
                                                    <span className="cat-label">時數</span>
                                                </div>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* 積分說明 */}
                            <Card padding="md" className="info-card">
                                <h3>積分計算方式</h3>
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
                            <h2 className="section-title">積分明細</h2>
                            {records.length === 0 ? (
                                <EmptyState icon={BarChart3} title="尚無積分紀錄" />
                            ) : (
                                <Card padding="none" className="records-list">
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
                                                    variant: 'default' as BadgeProps['variant'],
                                                    icon: '❓'
                                                };

                                                return (
                                                    <tr key={record.id}>
                                                        <td className="tabular-nums">{formatDate(record.createdAt)}</td>
                                                        <td>
                                                            <Badge
                                                                variant={typeInfo.variant}
                                                                size="sm"
                                                            >
                                                                {typeInfo.icon} {typeInfo.name}
                                                            </Badge>
                                                        </td>
                                                        <td className="description-cell">
                                                            {record.description || '-'}
                                                        </td>
                                                        <td className="tabular-nums">{record.hours.toFixed(1)}</td>
                                                        <td>
                                                            {record.multiplier > 1 ? (
                                                                <span className="multiplier-badge tabular-nums">
                                                                    x{record.multiplier.toFixed(1)}
                                                                </span>
                                                            ) : '-'}
                                                        </td>
                                                        <td className="points-cell">
                                                            <span className={`tabular-nums ${record.points >= 0 ? 'is-positive' : 'is-negative'}`}>
                                                                {record.points >= 0 ? '+' : ''}{record.points}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </Card>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
}
