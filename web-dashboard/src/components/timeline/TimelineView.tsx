/**
 * Timeline 視覺化元件
 * 
 * 整合 generateTimeline API，顯示任務派遣、災情回報、SITREP、AAR 事件
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import './TimelineView.css';

// Timeline 事件類型
export interface TimelineEvent {
    id: string;
    ts: string;
    type: 'task_dispatch' | 'field_report' | 'sitrep' | 'aar' | 'decision' | 'checkin';
    title: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    location?: { lat: number; lng: number; name?: string };
    actor?: string;
    ref?: string;
}

// 時間範圍選項
type TimeScale = '1h' | '6h' | '24h' | '7d';

interface TimelineViewProps {
    sessionId?: string;
    onEventClick?: (event: TimelineEvent) => void;
}

// 獲取 Timeline 資料
async function fetchTimeline(sessionId?: string, hours: number = 24): Promise<TimelineEvent[]> {
    const params = new URLSearchParams();
    if (sessionId) params.set('sessionId', sessionId);
    params.set('hours', String(hours));

    const response = await fetch(`/api/v1/timeline?${params}`);
    if (!response.ok) throw new Error('Failed to fetch timeline');

    const data = await response.json();
    return data.events || [];
}

// 事件類型顏色
const typeColors: Record<string, string> = {
    task_dispatch: '#3b82f6', // blue
    field_report: '#ef4444', // red
    sitrep: '#8b5cf6', // purple
    aar: '#6366f1', // indigo
    decision: '#f59e0b', // amber
    checkin: '#10b981', // green
};

// 嚴重程度樣式
const severityStyles: Record<string, string> = {
    low: 'timeline-severity-low',
    medium: 'timeline-severity-medium',
    high: 'timeline-severity-high',
    critical: 'timeline-severity-critical',
};

// 時間範圍對應小時
const timeScaleHours: Record<TimeScale, number> = {
    '1h': 1,
    '6h': 6,
    '24h': 24,
    '7d': 168,
};

export function TimelineView({ sessionId, onEventClick }: TimelineViewProps) {
    const [timeScale, setTimeScale] = useState<TimeScale>('24h');
    const [filterType, setFilterType] = useState<string | null>(null);
    const [filterSeverity, setFilterSeverity] = useState<string | null>(null);
    const [selectedEvent, setSelectedEvent] = useState<TimelineEvent | null>(null);

    const hours = timeScaleHours[timeScale];

    // 獲取資料
    const { data: events = [], isLoading, error } = useQuery({
        queryKey: ['timeline', sessionId, hours],
        queryFn: () => fetchTimeline(sessionId, hours),
        refetchInterval: 30000, // 30 秒刷新
    });

    // 過濾事件
    const filteredEvents = useMemo(() => {
        return events.filter(e => {
            if (filterType && e.type !== filterType) return false;
            if (filterSeverity && e.severity !== filterSeverity) return false;
            return true;
        });
    }, [events, filterType, filterSeverity]);

    // 按時間排序
    const sortedEvents = useMemo(() => {
        return [...filteredEvents].sort((a, b) =>
            new Date(b.ts).getTime() - new Date(a.ts).getTime()
        );
    }, [filteredEvents]);

    // 處理事件點擊
    const handleEventClick = useCallback((event: TimelineEvent) => {
        setSelectedEvent(event);
        onEventClick?.(event);
    }, [onEventClick]);

    // 格式化時間
    const formatTime = (ts: string) => {
        const date = new Date(ts);
        const now = new Date();
        const diff = now.getTime() - date.getTime();

        if (diff < 60000) return '剛剛';
        if (diff < 3600000) return `${Math.floor(diff / 60000)} 分鐘前`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小時前`;
        return date.toLocaleDateString('zh-TW', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    // 事件類型標籤
    const typeLabels: Record<string, string> = {
        task_dispatch: '任務派遣',
        field_report: '災情回報',
        sitrep: 'SITREP',
        aar: 'AAR',
        decision: '指揮決策',
        checkin: '簽到',
    };

    if (error) {
        return (
            <div className="timeline-error">
                <span>⚠️ 無法載入時間軸資料</span>
            </div>
        );
    }

    return (
        <div className="timeline-container">
            {/* 控制列 */}
            <div className="timeline-controls">
                {/* 時間範圍 */}
                <div className="timeline-scale-selector">
                    {(['1h', '6h', '24h', '7d'] as TimeScale[]).map(scale => (
                        <button
                            key={scale}
                            className={`timeline-scale-btn ${timeScale === scale ? 'active' : ''}`}
                            onClick={() => setTimeScale(scale)}
                        >
                            {scale}
                        </button>
                    ))}
                </div>

                {/* 類型篩選 */}
                <select
                    value={filterType || ''}
                    onChange={e => setFilterType(e.target.value || null)}
                    className="timeline-filter"
                >
                    <option value="">所有類型</option>
                    {Object.entries(typeLabels).map(([key, label]) => (
                        <option key={key} value={key}>{label}</option>
                    ))}
                </select>

                {/* 嚴重程度篩選 */}
                <select
                    value={filterSeverity || ''}
                    onChange={e => setFilterSeverity(e.target.value || null)}
                    className="timeline-filter"
                >
                    <option value="">所有等級</option>
                    <option value="critical">危急</option>
                    <option value="high">高</option>
                    <option value="medium">中</option>
                    <option value="low">低</option>
                </select>

                <span className="timeline-count">
                    {filteredEvents.length} 事件
                </span>
            </div>

            {/* 時間軸 */}
            <div className="timeline-main">
                {/* 事件列表 */}
                <div className="timeline-events">
                    {isLoading ? (
                        <div className="timeline-loading">載入中...</div>
                    ) : sortedEvents.length === 0 ? (
                        <div className="timeline-empty">此時間範圍內無事件</div>
                    ) : (
                        sortedEvents.map(event => (
                            <div
                                key={event.id}
                                className={`timeline-event ${selectedEvent?.id === event.id ? 'selected' : ''}`}
                                onClick={() => handleEventClick(event)}
                            >
                                <div
                                    className="timeline-event-marker"
                                    style={{ backgroundColor: typeColors[event.type] || '#6b7280' }}
                                />
                                <div className="timeline-event-content">
                                    <div className="timeline-event-header">
                                        <span className="timeline-event-type" style={{ color: typeColors[event.type] }}>
                                            {typeLabels[event.type] || event.type}
                                        </span>
                                        {event.severity && (
                                            <span className={`timeline-event-severity ${severityStyles[event.severity]}`}>
                                                {event.severity.toUpperCase()}
                                            </span>
                                        )}
                                        <span className="timeline-event-time">{formatTime(event.ts)}</span>
                                    </div>
                                    <div className="timeline-event-title">{event.title}</div>
                                    {event.actor && (
                                        <div className="timeline-event-actor">由 {event.actor}</div>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* 詳情面板 */}
                {selectedEvent && (
                    <div className="timeline-detail-panel">
                        <div className="timeline-detail-header">
                            <h3>{selectedEvent.title}</h3>
                            <button
                                className="timeline-detail-close"
                                onClick={() => setSelectedEvent(null)}
                            >
                                ✕
                            </button>
                        </div>
                        <div className="timeline-detail-body">
                            <div className="timeline-detail-row">
                                <span className="label">類型</span>
                                <span className="value">{typeLabels[selectedEvent.type]}</span>
                            </div>
                            <div className="timeline-detail-row">
                                <span className="label">時間</span>
                                <span className="value">{new Date(selectedEvent.ts).toLocaleString('zh-TW')}</span>
                            </div>
                            {selectedEvent.severity && (
                                <div className="timeline-detail-row">
                                    <span className="label">等級</span>
                                    <span className={`value ${severityStyles[selectedEvent.severity]}`}>
                                        {selectedEvent.severity.toUpperCase()}
                                    </span>
                                </div>
                            )}
                            {selectedEvent.actor && (
                                <div className="timeline-detail-row">
                                    <span className="label">執行者</span>
                                    <span className="value">{selectedEvent.actor}</span>
                                </div>
                            )}
                            {selectedEvent.location && (
                                <div className="timeline-detail-row">
                                    <span className="label">位置</span>
                                    <span className="value">
                                        {selectedEvent.location.name ||
                                            `${selectedEvent.location.lat.toFixed(4)}, ${selectedEvent.location.lng.toFixed(4)}`}
                                    </span>
                                </div>
                            )}
                            {selectedEvent.ref && (
                                <div className="timeline-detail-row">
                                    <span className="label">參考</span>
                                    <a href={`#${selectedEvent.ref}`} className="value link">{selectedEvent.ref}</a>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default TimelineView;
