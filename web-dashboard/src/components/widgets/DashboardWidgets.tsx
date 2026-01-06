/**
 * Dashboard Widgets System
 * Reusable widget components for dashboard customization
 */

import React from 'react';
import type { ReactNode } from 'react';
import './DashboardWidgets.css';

// ==================== Widget Types ====================

export interface WidgetConfig {
    id: string;
    type: WidgetType;
    title: string;
    size: 'small' | 'medium' | 'large';
    position: { x: number; y: number };
    settings?: Record<string, any>;
}

export type WidgetType =
    | 'stats-card'
    | 'chart-line'
    | 'chart-donut'
    | 'chart-bar'
    | 'recent-activity'
    | 'weather-alert'
    | 'sos-monitor'
    | 'quick-actions'
    | 'task-list'
    | 'map-preview';

// ==================== Base Widget Container ====================

interface WidgetContainerProps {
    title: string;
    icon?: string;
    size?: 'small' | 'medium' | 'large';
    loading?: boolean;
    children: ReactNode;
    onRefresh?: () => void;
    actions?: ReactNode;
}

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
    title,
    icon,
    size = 'medium',
    loading = false,
    children,
    onRefresh,
    actions,
}) => {
    return (
        <div className={`widget-container widget-${size}`}>
            <div className="widget-header">
                <h3>
                    {icon && <span className="widget-icon">{icon}</span>}
                    {title}
                </h3>
                <div className="widget-actions">
                    {onRefresh && (
                        <button className="refresh-btn" onClick={onRefresh} disabled={loading}>
                            🔄
                        </button>
                    )}
                    {actions}
                </div>
            </div>
            <div className="widget-content">
                {loading ? (
                    <div className="widget-loading">
                        <div className="spinner" />
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
};

// ==================== Stats Card Widget ====================

interface StatsCardProps {
    label: string;
    value: number | string;
    icon: string;
    trend?: { value: number; label: string };
    color?: 'primary' | 'success' | 'warning' | 'danger';
}

export const StatsCard: React.FC<StatsCardProps> = ({
    label,
    value,
    icon,
    trend,
    color = 'primary',
}) => {
    return (
        <div className={`stats-card stats-${color}`}>
            <div className="stats-icon">{icon}</div>
            <div className="stats-info">
                <span className="stats-value">{value}</span>
                <span className="stats-label">{label}</span>
                {trend && (
                    <span className={`stats-trend ${trend.value >= 0 ? 'up' : 'down'}`}>
                        {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
                    </span>
                )}
            </div>
        </div>
    );
};

// ==================== Recent Activity Widget ====================

interface ActivityItem {
    id: string;
    type: string;
    message: string;
    timestamp: string;
    icon?: string;
}

interface RecentActivityWidgetProps {
    activities: ActivityItem[];
    maxItems?: number;
}

export const RecentActivityWidget: React.FC<RecentActivityWidgetProps> = ({
    activities,
    maxItems = 5,
}) => {
    const displayItems = activities.slice(0, maxItems);

    return (
        <div className="recent-activity-widget">
            {displayItems.length === 0 ? (
                <div className="empty-activity">暫無活動記錄</div>
            ) : (
                <ul className="activity-list">
                    {displayItems.map(item => (
                        <li key={item.id} className="activity-item">
                            <span className="activity-icon">{item.icon || '📌'}</span>
                            <div className="activity-content">
                                <p>{item.message}</p>
                                <span className="activity-time">
                                    {new Date(item.timestamp).toLocaleString('zh-TW')}
                                </span>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// ==================== Quick Actions Widget ====================

interface QuickAction {
    id: string;
    label: string;
    icon: string;
    onClick: () => void;
    color?: string;
}

interface QuickActionsWidgetProps {
    actions: QuickAction[];
}

export const QuickActionsWidget: React.FC<QuickActionsWidgetProps> = ({ actions }) => {
    return (
        <div className="quick-actions-widget">
            {actions.map(action => (
                <button
                    key={action.id}
                    className="quick-action-btn"
                    onClick={action.onClick}
                    style={{ borderColor: action.color }}
                >
                    <span className="action-icon">{action.icon}</span>
                    <span className="action-label">{action.label}</span>
                </button>
            ))}
        </div>
    );
};

// ==================== SOS Monitor Widget ====================

interface SOSSignal {
    id: string;
    userName: string;
    location: string;
    status: 'active' | 'acknowledged' | 'resolved';
    createdAt: string;
}

interface SOSMonitorWidgetProps {
    signals: SOSSignal[];
    onAcknowledge?: (id: string) => void;
}

export const SOSMonitorWidget: React.FC<SOSMonitorWidgetProps> = ({
    signals,
    onAcknowledge,
}) => {
    const activeSignals = signals.filter(s => s.status === 'active');

    return (
        <div className="sos-monitor-widget">
            {activeSignals.length === 0 ? (
                <div className="sos-safe">
                    <span className="safe-icon">✅</span>
                    <p>目前無緊急求救信號</p>
                </div>
            ) : (
                <div className="sos-alerts">
                    <div className="alert-header">
                        <span className="alert-icon pulse">🚨</span>
                        <strong>{activeSignals.length} 個進行中的求救信號</strong>
                    </div>
                    <ul className="sos-list">
                        {activeSignals.map(signal => (
                            <li key={signal.id} className="sos-item">
                                <div className="sos-info">
                                    <strong>{signal.userName}</strong>
                                    <span>{signal.location}</span>
                                </div>
                                {onAcknowledge && (
                                    <button
                                        className="ack-btn"
                                        onClick={() => onAcknowledge(signal.id)}
                                    >
                                        確認
                                    </button>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// ==================== Task List Widget ====================

interface TaskItem {
    id: string;
    title: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: string;
    assignee?: string;
}

interface TaskListWidgetProps {
    tasks: TaskItem[];
    maxItems?: number;
}

export const TaskListWidget: React.FC<TaskListWidgetProps> = ({
    tasks,
    maxItems = 5,
}) => {
    const displayTasks = tasks.slice(0, maxItems);

    const priorityColors: Record<string, string> = {
        low: '#10b981',
        medium: '#f59e0b',
        high: '#ef4444',
        critical: '#dc2626',
    };

    return (
        <div className="task-list-widget">
            {displayTasks.length === 0 ? (
                <div className="empty-tasks">暫無待辦任務</div>
            ) : (
                <ul className="task-list">
                    {displayTasks.map(task => (
                        <li key={task.id} className="task-item">
                            <span
                                className="priority-dot"
                                style={{ background: priorityColors[task.priority] }}
                            />
                            <div className="task-info">
                                <p className="task-title">{task.title}</p>
                                {task.assignee && (
                                    <span className="task-assignee">👤 {task.assignee}</span>
                                )}
                            </div>
                            <span className="task-status">{task.status}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// ==================== Weather Alert Widget ====================

interface WeatherAlert {
    id: string;
    type: string;
    severity: 'advisory' | 'watch' | 'warning';
    title: string;
    area: string;
    startTime: string;
    endTime?: string;
}

interface WeatherAlertWidgetProps {
    alerts: WeatherAlert[];
}

export const WeatherAlertWidget: React.FC<WeatherAlertWidgetProps> = ({ alerts }) => {
    const severityColors: Record<string, string> = {
        advisory: '#f59e0b',
        watch: '#f97316',
        warning: '#ef4444',
    };

    return (
        <div className="weather-alert-widget">
            {alerts.length === 0 ? (
                <div className="no-alerts">
                    <span>☀️</span>
                    <p>目前無天氣警報</p>
                </div>
            ) : (
                <ul className="alert-list">
                    {alerts.map(alert => (
                        <li
                            key={alert.id}
                            className="alert-item"
                            style={{ borderLeftColor: severityColors[alert.severity] }}
                        >
                            <div className="alert-info">
                                <strong>{alert.title}</strong>
                                <span>{alert.area}</span>
                            </div>
                            <span className={`alert-severity ${alert.severity}`}>
                                {alert.severity}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// ==================== Export All ====================

export default {
    WidgetContainer,
    StatsCard,
    RecentActivityWidget,
    QuickActionsWidget,
    SOSMonitorWidget,
    TaskListWidget,
    WeatherAlertWidget,
};
