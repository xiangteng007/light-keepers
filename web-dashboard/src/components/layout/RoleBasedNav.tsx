/**
 * RoleBasedNav.tsx
 * 
 * Expert Council Navigation Design v3.0
 * Role-specific navigation shortcuts based on user's ICS assignment
 * Per expert_council_navigation_design.md §3.4
 */
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    Command,
    ClipboardList,
    Map,
    Package,
    DollarSign,
    Users,
    Shield,
    Radio,
    Truck,
    FileText,
} from 'lucide-react';
import { useEmergencyContext } from '../../context/useEmergencyContext';
import { useAuth } from '../../context/AuthContext';
import './RoleBasedNav.css';

// ICS Section definitions
const ICS_SECTIONS = {
    command: {
        label: '指揮組',
        icon: Command,
        color: '#EF4444',
        routes: [
            { path: '/command-center', label: '指揮中心' },
            { path: '/ops/ics-forms', label: 'ICS 表單' },
            { path: '/governance/iam', label: '權限管理' },
        ],
    },
    operations: {
        label: '作戰組',
        icon: Shield,
        color: '#F59E0B',
        routes: [
            { path: '/rescue/shelters', label: '避難所' },
            { path: '/rescue/triage', label: '傷患分類' },
            { path: '/rescue/search-rescue', label: '搜救行動' },
            { path: '/geo/map', label: '作戰地圖' },
        ],
    },
    planning: {
        label: '計畫組',
        icon: ClipboardList,
        color: '#3B82F6',
        routes: [
            { path: '/analytics/reports', label: '報告系統' },
            { path: '/geo/alerts', label: '災情監測' },
            { path: '/hub/ai-chat', label: 'AI 分析' },
        ],
    },
    logistics: {
        label: '後勤組',
        icon: Package,
        color: '#10B981',
        routes: [
            { path: '/logistics/inventory', label: '物資清單' },
            { path: '/logistics/equipment', label: '設備管理' },
            { path: '/logistics/donations', label: '捐贈管理' },
        ],
    },
    finance: {
        label: '財務組',
        icon: DollarSign,
        color: '#8B5CF6',
        routes: [
            { path: '/analytics/reports', label: '費用報告' },
            { path: '/governance/audit', label: '審計日誌' },
        ],
    },
} as const;

type SectionKey = keyof typeof ICS_SECTIONS;

export function RoleBasedNav() {
    const location = useLocation();
    const { user } = useAuth();
    const { isOnDuty, assignedSection, hasActiveIncident } = useEmergencyContext();

    // If no assignment or not on duty during incident, don't show
    if (!assignedSection || (!isOnDuty && !hasActiveIncident)) {
        return null;
    }

    const section = ICS_SECTIONS[assignedSection as SectionKey];
    if (!section) return null;

    const SectionIcon = section.icon;

    return (
        <div className="role-based-nav" style={{ '--section-color': section.color } as React.CSSProperties}>
            <div className="rbn-header">
                <SectionIcon size={16} />
                <span className="rbn-label">{section.label}</span>
                {isOnDuty && <span className="rbn-duty-badge">值班中</span>}
            </div>
            <nav className="rbn-routes">
                {section.routes.map(route => (
                    <Link
                        key={route.path}
                        to={route.path}
                        className={`rbn-route ${location.pathname === route.path ? 'active' : ''}`}
                    >
                        {route.label}
                    </Link>
                ))}
            </nav>
        </div>
    );
}

// Quick access to all ICS sections (for supervisors)
export function ICSQuickNav() {
    const location = useLocation();
    const { user } = useAuth();
    
    // Only show for supervisor level and above (L2+)
    if (!user || (user.roleLevel ?? 0) < 2) {
        return null;
    }

    return (
        <div className="ics-quick-nav">
            {Object.entries(ICS_SECTIONS).map(([key, section]) => {
                const SectionIcon = section.icon;
                const isActive = section.routes.some(r => location.pathname === r.path);
                
                return (
                    <Link
                        key={key}
                        to={section.routes[0].path}
                        className={`icsqn-item ${isActive ? 'active' : ''}`}
                        style={{ '--section-color': section.color } as React.CSSProperties}
                        title={section.label}
                    >
                        <SectionIcon size={18} />
                        <span>{section.label}</span>
                    </Link>
                );
            })}
        </div>
    );
}

export default RoleBasedNav;
