/**
 * DashboardPage.tsx
 * 
 * Light Keepers Command Center Dashboard
 * Using Bento Grid Layout System
 */
import { Link } from 'react-router-dom';
import { Badge } from '../../../components/ui';

interface StatCard { 
    icon: string; 
    value: string | number; 
    label: string; 
    change?: string; 
    changeType?: 'positive' | 'negative';
}

interface Mission { 
    id: string; 
    title: string; 
    severity: 'critical' | 'high' | 'medium'; 
    progress: number; 
    teams: number; 
}

const stats: StatCard[] = [
    { icon: '🚨', value: 3, label: 'Active Missions', change: '+2 today', changeType: 'positive' },
    { icon: '👥', value: 156, label: 'Active Volunteers', change: '+12 online', changeType: 'positive' },
    { icon: '📦', value: 2847, label: 'Resources Available' },
    { icon: '✅', value: 89, label: 'Tasks Completed', change: '+15 today', changeType: 'positive' },
];

const activeMissions: Mission[] = [
    { id: 'TW-KHH-330-001', title: '高雄三民區淹水救援', severity: 'critical', progress: 25, teams: 12 },
    { id: 'TW-TPE-110-002', title: '臺北信義區建物搜救', severity: 'high', progress: 40, teams: 8 },
    { id: 'TW-NTP-220-003', title: '新北新店土石流疏散', severity: 'medium', progress: 15, teams: 5 },
];

export default function DashboardPage() {
    const getSeverityBadge = (severity: string) => {
        switch (severity) {
            case 'critical': return <Badge variant="critical" dot>{severity.toUpperCase()}</Badge>;
            case 'high': return <Badge variant="danger">{severity.toUpperCase()}</Badge>;
            case 'medium': return <Badge variant="warning">{severity.toUpperCase()}</Badge>;
            default: return <Badge variant="safe">{severity.toUpperCase()}</Badge>;
        }
    };

    return (
        <div className="bento-dashboard animate-stagger">
            {/* Header */}
            <div className="bento-header">
                <div className="bento-header-content">
                    <div>
                        <h1 className="bento-title">Command Center Dashboard</h1>
                        <p className="bento-subtitle">Light Keepers Disaster Response System</p>
                    </div>
                    <div className="bento-status">
                        <span className="bento-status__dot"></span>
                        <span>System Operational</span>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {stats.map((stat, i) => (
                <div key={i} className={`bento-cell bento-cell--elevated bento-stat-${i + 1}`}>
                    <div className="bento-stat">
                        <div className="bento-stat__icon">{stat.icon}</div>
                        <div className="bento-stat__content">
                            <div className="bento-stat__value">{stat.value}</div>
                            <div className="bento-stat__label">{stat.label}</div>
                            {stat.change && (
                                <div className={`bento-stat__change ${stat.changeType === 'negative' ? 'bento-stat__change--negative' : ''}`}>
                                    {stat.change}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}

            {/* Active Missions */}
            <div className="bento-cell bento-missions">
                <div className="bento-cell__header">
                    <h2 className="bento-cell__title">Active Missions</h2>
                    <Link to="/mission-command" className="bento-cell__action">View All →</Link>
                </div>
                <div className="bento-cell__body">
                    {activeMissions.map((mission) => (
                        <div key={mission.id} className="bento-mission">
                            <div className="bento-mission__header">
                                <div>
                                    <div className="bento-mission__title">{mission.title}</div>
                                    <div className="bento-mission__id">{mission.id}</div>
                                </div>
                                {getSeverityBadge(mission.severity)}
                            </div>
                            <div className="bento-mission__footer">
                                <span className="bento-mission__teams">{mission.teams} teams deployed</span>
                                <span className="bento-mission__progress-label">{mission.progress}%</span>
                            </div>
                            <div className="bento-mission__progress-bar">
                                <div 
                                    className="bento-mission__progress-fill" 
                                    style={{ width: `${mission.progress}%` }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Quick Actions */}
            <div className="bento-cell bento-quickact">
                <div className="bento-cell__header">
                    <h2 className="bento-cell__title">Quick Actions</h2>
                </div>
                <div className="bento-cell__body">
                    <div className="bento-quickactions">
                        <Link to="/emergency-response" className="bento-quickaction bento-quickaction--emergency">
                            <span className="bento-quickaction__icon">🚨</span>
                            <span className="bento-quickaction__label">Emergency Launch</span>
                        </Link>
                        <Link to="/volunteers" className="bento-quickaction bento-quickaction--volunteers">
                            <span className="bento-quickaction__icon">👥</span>
                            <span className="bento-quickaction__label">Manage Volunteers</span>
                        </Link>
                        <Link to="/resources" className="bento-quickaction bento-quickaction--resources">
                            <span className="bento-quickaction__icon">📦</span>
                            <span className="bento-quickaction__label">Resources</span>
                        </Link>
                        <Link to="/map" className="bento-quickaction bento-quickaction--map">
                            <span className="bento-quickaction__icon">🗺️</span>
                            <span className="bento-quickaction__label">Map Overview</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Alerts Section */}
            <div className="bento-cell bento-alerts">
                <div className="bento-cell__header">
                    <h2 className="bento-cell__title">Weather Alerts</h2>
                    <Link to="/weather" className="bento-cell__action">View All →</Link>
                </div>
                <div className="bento-cell__body">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-warning-bg)' }}>
                            <span className="text-xl">⚠️</span>
                            <div className="flex-1">
                                <div className="font-medium" style={{ color: 'var(--text-heading)' }}>大雨特報</div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>高雄市、屏東縣</div>
                            </div>
                            <Badge variant="warning">WATCH</Badge>
                        </div>
                        <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: 'var(--color-danger-bg)' }}>
                            <span className="text-xl">🌊</span>
                            <div className="flex-1">
                                <div className="font-medium" style={{ color: 'var(--text-heading)' }}>海嘯警報</div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>東部海岸線</div>
                            </div>
                            <Badge variant="danger">WARNING</Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Team Panel */}
            <div className="bento-cell bento-team">
                <div className="bento-cell__header">
                    <h2 className="bento-cell__title">Team Status</h2>
                    <Link to="/team" className="bento-cell__action">View All →</Link>
                </div>
                <div className="bento-cell__body bento-cell__body--compact">
                    <div className="space-y-2">
                        <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--surface-hover)' }}>
                            <span style={{ color: 'var(--text-body)' }}>Alpha Team</span>
                            <Badge variant="safe" size="sm">Deployed</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--surface-hover)' }}>
                            <span style={{ color: 'var(--text-body)' }}>Bravo Team</span>
                            <Badge variant="warning" size="sm">En Route</Badge>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded" style={{ background: 'var(--surface-hover)' }}>
                            <span style={{ color: 'var(--text-body)' }}>Charlie Team</span>
                            <Badge variant="neutral" size="sm">Standby</Badge>
                        </div>
                    </div>
                </div>
            </div>

            {/* Activity Feed */}
            <div className="bento-cell bento-activity">
                <div className="bento-cell__header">
                    <h2 className="bento-cell__title">Recent Activity</h2>
                </div>
                <div className="bento-cell__body bento-cell__body--compact">
                    <div className="space-y-3">
                        <div className="flex gap-3 text-sm">
                            <span>🟢</span>
                            <div>
                                <span style={{ color: 'var(--text-body)' }}>Volunteer check-in</span>
                                <span className="ml-2" style={{ color: 'var(--text-muted)' }}>2 min ago</span>
                            </div>
                        </div>
                        <div className="flex gap-3 text-sm">
                            <span>📦</span>
                            <div>
                                <span style={{ color: 'var(--text-body)' }}>Resources dispatched</span>
                                <span className="ml-2" style={{ color: 'var(--text-muted)' }}>5 min ago</span>
                            </div>
                        </div>
                        <div className="flex gap-3 text-sm">
                            <span>🚨</span>
                            <div>
                                <span style={{ color: 'var(--text-body)' }}>New mission created</span>
                                <span className="ml-2" style={{ color: 'var(--text-muted)' }}>12 min ago</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
