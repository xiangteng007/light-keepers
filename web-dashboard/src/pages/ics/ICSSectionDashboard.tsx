/**
 * ICSSectionDashboard.tsx
 * 
 * Expert Council Navigation Design v3.0
 * Unified ICS Section Dashboard with role-specific views
 * Per expert_council_navigation_design.md Phase 3
 */
import { Link, useParams } from 'react-router-dom';
import {
    Command,
    Shield,
    ClipboardList,
    Package,
    DollarSign,
    Clock,
    AlertTriangle,
    ArrowRight,
} from 'lucide-react';
import { useEmergencyContext, useEmergencyStyles } from '../../context/useEmergencyContext';
import './ICSSectionDashboard.css';

// ICS Section configuration
const ICS_SECTIONS = {
    command: {
        id: 'command',
        label: '指揮組 Command',
        icon: Command,
        color: '#EF4444',
        description: '整體事件指揮與決策',
        metrics: [
            { label: '進行中事件', value: 0, key: 'activeIncidents' },
            { label: '待決策項目', value: 0, key: 'pendingDecisions' },
            { label: '人員部署', value: 0, key: 'deployedPersonnel' },
        ],
        quickLinks: [
            { path: '/command-center', label: '指揮中心' },
            { path: '/ops/ics-forms', label: 'ICS 表單' },
            { path: '/governance/iam', label: '權限管理' },
        ],
    },
    operations: {
        id: 'operations',
        label: '作戰組 Operations',
        icon: Shield,
        color: '#F59E0B',
        description: '救援行動與現場作業',
        metrics: [
            { label: '搜救任務', value: 0, key: 'searchTasks' },
            { label: '避難所運作', value: 0, key: 'activeShelters' },
            { label: '待分類傷患', value: 0, key: 'pendingTriage' },
        ],
        quickLinks: [
            { path: '/rescue/shelters', label: '避難所' },
            { path: '/rescue/triage', label: '傷患分類' },
            { path: '/rescue/search-rescue', label: '搜救行動' },
            { path: '/geo/map', label: '作戰地圖' },
        ],
    },
    planning: {
        id: 'planning',
        label: '計畫組 Planning',
        icon: ClipboardList,
        color: '#3B82F6',
        description: '情資蒐集與規劃',
        metrics: [
            { label: '待處理報告', value: 0, key: 'pendingReports' },
            { label: '活躍警報', value: 0, key: 'activeAlerts' },
            { label: 'AI 分析', value: 0, key: 'aiInsights' },
        ],
        quickLinks: [
            { path: '/analytics/reports', label: '報告系統' },
            { path: '/geo/alerts', label: '災情監測' },
            { path: '/hub/ai-chat', label: 'AI 分析' },
        ],
    },
    logistics: {
        id: 'logistics',
        label: '後勤組 Logistics',
        icon: Package,
        color: '#10B981',
        description: '物資與裝備管理',
        metrics: [
            { label: '物資項目', value: 0, key: 'inventoryItems' },
            { label: '待調度設備', value: 0, key: 'pendingEquipment' },
            { label: '捐贈處理', value: 0, key: 'pendingDonations' },
        ],
        quickLinks: [
            { path: '/logistics/inventory', label: '物資清單' },
            { path: '/logistics/equipment', label: '設備管理' },
            { path: '/logistics/donations', label: '捐贈管理' },
        ],
    },
    finance: {
        id: 'finance',
        label: '財務組 Finance/Admin',
        icon: DollarSign,
        color: '#8B5CF6',
        description: '費用追蹤與行政',
        metrics: [
            { label: '待報銷', value: 0, key: 'pendingExpenses' },
            { label: '本日支出', value: 0, key: 'todayExpenses' },
            { label: '審計項目', value: 0, key: 'auditItems' },
        ],
        quickLinks: [
            { path: '/analytics/reports', label: '費用報告' },
            { path: '/governance/audit', label: '審計日誌' },
        ],
    },
} as const;

type SectionKey = keyof typeof ICS_SECTIONS;

interface ICSSectionDashboardProps {
    sectionId?: SectionKey;
}

export default function ICSSectionDashboard({ sectionId }: ICSSectionDashboardProps) {
    const { section: urlSection } = useParams<{ section: string }>();
    const { hasActiveIncident, currentIncident } = useEmergencyContext();
    const { color: emergencyColor, label: emergencyLabel } = useEmergencyStyles();

    // Determine which section to show
    const activeSectionId = (sectionId || urlSection || 'command') as SectionKey;
    const section = ICS_SECTIONS[activeSectionId];

    if (!section) {
        return (
            <div className="ics-dashboard__error">
                <AlertTriangle size={48} />
                <h2>找不到該 ICS 組別</h2>
                <Link to="/command-center">返回指揮中心</Link>
            </div>
        );
    }

    const SectionIcon = section.icon;

    return (
        <div className="ics-dashboard" style={{ '--section-color': section.color } as React.CSSProperties}>
            {/* Section Header */}
            <header className="ics-dashboard__header">
                <div className="ics-dashboard__title">
                    <SectionIcon size={32} className="ics-dashboard__icon" />
                    <div>
                        <h1>{section.label}</h1>
                        <p>{section.description}</p>
                    </div>
                </div>
                
                {hasActiveIncident && currentIncident && (
                    <div 
                        className="ics-dashboard__incident-badge"
                        style={{ background: emergencyColor }}
                    >
                        <AlertTriangle size={14} />
                        <span>{emergencyLabel}: {currentIncident.title}</span>
                    </div>
                )}
            </header>

            {/* Section Navigation */}
            <nav className="ics-dashboard__nav">
                {Object.entries(ICS_SECTIONS).map(([key, sec]) => {
                    const NavIcon = sec.icon;
                    const isActive = key === activeSectionId;
                    return (
                        <Link
                            key={key}
                            to={`/ics/${key}`}
                            className={`ics-nav-item ${isActive ? 'active' : ''}`}
                            style={{ '--nav-color': sec.color } as React.CSSProperties}
                        >
                            <NavIcon size={18} />
                            <span>{sec.label.split(' ')[0]}</span>
                        </Link>
                    );
                })}
            </nav>

            {/* Metrics Cards */}
            <section className="ics-dashboard__metrics">
                {section.metrics.map((metric, idx) => (
                    <div key={idx} className="ics-metric-card">
                        <div className="ics-metric-value">{metric.value}</div>
                        <div className="ics-metric-label">{metric.label}</div>
                    </div>
                ))}
            </section>

            {/* Quick Links */}
            <section className="ics-dashboard__links">
                <h3>快速存取</h3>
                <div className="ics-links-grid">
                    {section.quickLinks.map((link, idx) => (
                        <Link
                            key={idx}
                            to={link.path}
                            className="ics-link-card"
                        >
                            <span>{link.label}</span>
                            <ArrowRight size={16} />
                        </Link>
                    ))}
                </div>
            </section>

            {/* Activity Feed */}
            <section className="ics-dashboard__activity">
                <h3>最近活動</h3>
                <div className="ics-activity-list">
                    <div className="ics-activity-empty">
                        <Clock size={24} />
                        <span>目前無活動記錄</span>
                    </div>
                </div>
            </section>
        </div>
    );
}
