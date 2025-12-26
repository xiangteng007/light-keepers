import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getReports } from '../api/services';
import type { ReportType, ReportSeverity } from '../api/services';

// 類型配置
const TYPE_CONFIG: Record<ReportType, { label: string; color: string }> = {
    earthquake: { label: '地震', color: '#795548' },
    flood: { label: '淹水', color: '#2196F3' },
    fire: { label: '火災', color: '#FF5722' },
    typhoon: { label: '颱風', color: '#00BCD4' },
    landslide: { label: '土石流', color: '#795548' },
    traffic: { label: '交通事故', color: '#FF9800' },
    infrastructure: { label: '設施損壞', color: '#F44336' },
    other: { label: '其他', color: '#607D8B' },
};

const SEVERITY_STARS: Record<ReportSeverity, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
};

// 格式化時間
function formatTimeAgo(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return '剛剛';
    if (minutes < 60) return `${minutes}分鐘前`;
    if (hours < 24) return `${hours}小時前`;
    return `${days}天前`;
}

export default function EventsPage() {
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState('');

    // 獲取已確認的回報作為災情事件
    const { data: reportsData, isLoading, error } = useQuery({
        queryKey: ['confirmedReports'],
        queryFn: () => getReports({ status: 'confirmed' }).then(res => res.data.data),
    });

    const reports = reportsData || [];

    // 過濾
    const filteredReports = reports.filter(report => {
        if (typeFilter && report.type !== typeFilter) return false;
        if (searchQuery && !report.title.includes(searchQuery) && !report.description.includes(searchQuery)) return false;
        return true;
    });

    if (isLoading) {
        return (
            <div className="page events-page">
                <div className="page-header">
                    <h2>災情事件</h2>
                </div>
                <div className="loading-state">載入中...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page events-page">
                <div className="page-header">
                    <h2>災情事件</h2>
                </div>
                <div className="error-state">載入失敗，請重試</div>
            </div>
        );
    }

    return (
        <div className="page events-page">
            <div className="page-header">
                <h2>災情事件</h2>
                <span className="header-badge">{filteredReports.length} 件</span>
            </div>

            <div className="filter-bar">
                <select
                    className="filter-select"
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                >
                    <option value="">所有類別</option>
                    {Object.entries(TYPE_CONFIG).map(([key, config]) => (
                        <option key={key} value={key}>{config.label}</option>
                    ))}
                </select>
                <input
                    type="text"
                    className="filter-search"
                    placeholder="搜尋事件..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {filteredReports.length === 0 ? (
                <div className="empty-state">
                    <span>📋</span>
                    <p>目前沒有已確認的災情事件</p>
                </div>
            ) : (
                <div className="events-table">
                    <table>
                        <thead>
                            <tr>
                                <th>嚴重度</th>
                                <th>事件標題</th>
                                <th>類別</th>
                                <th>狀態</th>
                                <th>時間</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredReports.map((report) => (
                                <tr key={report.id}>
                                    <td>
                                        <span className={`severity severity-${SEVERITY_STARS[report.severity]}`}>
                                            {'★'.repeat(SEVERITY_STARS[report.severity])}
                                        </span>
                                    </td>
                                    <td>{report.title}</td>
                                    <td>
                                        <span
                                            className="category-tag"
                                            style={{ backgroundColor: `${TYPE_CONFIG[report.type]?.color}20`, color: TYPE_CONFIG[report.type]?.color }}
                                        >
                                            {TYPE_CONFIG[report.type]?.label || report.type}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="status status-active">
                                            🔴 進行中
                                        </span>
                                    </td>
                                    <td>{formatTimeAgo(report.createdAt)}</td>
                                    <td>
                                        <button className="btn-small" onClick={() => window.open(`/map?lat=${report.latitude}&lng=${report.longitude}`, '_self')}>
                                            📍 查看地圖
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
