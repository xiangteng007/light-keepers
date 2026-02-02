/**
 * EmergencyQuickActions.tsx
 * 
 * Expert Council Navigation Design v3.0
 * Always-visible emergency quick action buttons
 * Per expert_council_navigation_design.md §2.1
 */
import { AlertCircle, Phone, Siren, FileWarning, LucideIcon } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import './EmergencyQuickActions.css';

interface QuickAction {
    id: string;
    icon: LucideIcon;
    label: string;
    path: string;
    variant: 'critical' | 'warning' | 'info';
}

const QUICK_ACTIONS: QuickAction[] = [
    { id: 'sos', icon: AlertCircle, label: 'SOS', path: '/emergency/sos', variant: 'critical' },
    { id: 'report', icon: FileWarning, label: '通報', path: '/intake', variant: 'warning' },
    { id: 'evacuate', icon: Siren, label: '撤離', path: '/emergency/evacuation', variant: 'warning' },
    { id: 'hotline', icon: Phone, label: '專線', path: '/emergency/hotline', variant: 'info' },
];

export default function EmergencyQuickActions() {
    const location = useLocation();

    return (
        <div className="emergency-quick-actions">
            <div className="emergency-label">
                <span className="pulse-dot" />
                緊急快捷
            </div>
            <div className="emergency-buttons">
                {QUICK_ACTIONS.map(action => {
                    const Icon = action.icon;
                    const isActive = location.pathname.startsWith(action.path);
                    return (
                        <Link
                            key={action.id}
                            to={action.path}
                            className={`emergency-btn emergency-btn--${action.variant} ${isActive ? 'active' : ''}`}
                            title={action.label}
                        >
                            <Icon size={20} strokeWidth={2} />
                            <span className="emergency-btn-label">{action.label}</span>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
