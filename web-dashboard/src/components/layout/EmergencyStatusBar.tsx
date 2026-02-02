/**
 * EmergencyStatusBar.tsx
 * 
 * Expert Council Navigation Design v3.0
 * Full-width emergency status bar shown during active incidents
 * Per expert_council_navigation_design.md §3.3
 */
import { AlertTriangle, X, ChevronRight, Radio } from 'lucide-react';
import { useEmergencyContext, useEmergencyStyles, EmergencyLevel } from '../../context/useEmergencyContext';
import './EmergencyStatusBar.css';

export function EmergencyStatusBar() {
    const { 
        hasActiveIncident, 
        currentIncident, 
        activeIncidents,
        emergencyLevel 
    } = useEmergencyContext();
    
    const { color, label } = useEmergencyStyles();

    // Don't render if no active incident or just advisory
    if (!hasActiveIncident || emergencyLevel < EmergencyLevel.Warning) {
        return null;
    }

    const getIcon = () => {
        if (emergencyLevel >= EmergencyLevel.Emergency) {
            return <AlertTriangle className="status-icon pulse" />;
        }
        return <Radio className="status-icon" />;
    };

    const getLevelClass = () => {
        switch (emergencyLevel) {
            case EmergencyLevel.Critical: return 'critical';
            case EmergencyLevel.Emergency: return 'emergency';
            case EmergencyLevel.Warning: return 'warning';
            default: return '';
        }
    };

    const incident = currentIncident || activeIncidents[0];

    return (
        <div 
            className={`emergency-status-bar ${getLevelClass()}`}
            style={{ '--emergency-color': color } as React.CSSProperties}
        >
            <div className="status-bar-content">
                <div className="status-bar-left">
                    {getIcon()}
                    <span className="status-level">{label}</span>
                    <span className="status-divider">|</span>
                    {incident && (
                        <span className="status-incident">
                            {incident.title}
                            {incident.location && (
                                <span className="status-location"> - {incident.location}</span>
                            )}
                        </span>
                    )}
                </div>
                
                <div className="status-bar-right">
                    {activeIncidents.length > 1 && (
                        <span className="status-count">
                            +{activeIncidents.length - 1} 個事件
                        </span>
                    )}
                    <a href="/command-center" className="status-action">
                        前往指揮中心
                        <ChevronRight size={16} />
                    </a>
                </div>
            </div>
        </div>
    );
}

export default EmergencyStatusBar;
