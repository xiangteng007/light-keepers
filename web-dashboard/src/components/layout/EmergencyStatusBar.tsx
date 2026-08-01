/**
 * EmergencyStatusBar.tsx — R1 / FE-7 強化
 *
 * 災時常駐狀態列（Warning 級以上自動顯示），由 AppShellLayout 掛載於畫面最頂端。
 * - role="alert" + aria-live：輔助技術即時播報
 * - 顯示：等級標籤、事件標題/地點、經過時間（tabular-nums）、多事件計數
 * - 行動導向：一鍵前往戰情儀表板（DESIGN_LANGUAGE.md「可行動性優先」）
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ChevronRight, Radio } from 'lucide-react';
import { useEmergencyContext, useEmergencyStyles, EmergencyLevel } from '../../context/useEmergencyContext';
import './EmergencyStatusBar.css';

/** 事件經過時間（分鐘級） */
function formatElapsed(start: Date): string {
    const mins = Math.max(0, Math.floor((Date.now() - start.getTime()) / 60000));
    if (mins < 60) return `${mins} 分`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} 時 ${mins % 60} 分`;
    return `${Math.floor(hours / 24)} 天 ${hours % 24} 時`;
}

export function EmergencyStatusBar() {
    const {
        hasActiveIncident,
        currentIncident,
        activeIncidents,
        emergencyLevel,
    } = useEmergencyContext();

    const { color, label } = useEmergencyStyles();

    // 每分鐘刷新經過時間
    const [, setTick] = useState(0);
    useEffect(() => {
        if (!hasActiveIncident) return;
        const id = setInterval(() => setTick(t => t + 1), 60_000);
        return () => clearInterval(id);
    }, [hasActiveIncident]);

    // Warning 級以下不顯示
    if (!hasActiveIncident || emergencyLevel < EmergencyLevel.Warning) {
        return null;
    }

    const getIcon = () => {
        if (emergencyLevel >= EmergencyLevel.Emergency) {
            return <AlertTriangle className="status-icon pulse" aria-hidden />;
        }
        return <Radio className="status-icon" aria-hidden />;
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
            role="alert"
            aria-live="assertive"
        >
            <div className="status-bar-content">
                <div className="status-bar-left">
                    {getIcon()}
                    <span className="status-level">{label}</span>
                    <span className="status-divider" aria-hidden>|</span>
                    {incident && (
                        <span className="status-incident">
                            {incident.title}
                            {incident.location && (
                                <span className="status-location"> - {incident.location}</span>
                            )}
                            {incident.startTime && (
                                <span
                                    className="status-elapsed"
                                    style={{ fontVariantNumeric: 'tabular-nums', marginLeft: 8 }}
                                >
                                    已 {formatElapsed(incident.startTime)}
                                </span>
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
                    <Link to="/command-center" className="status-action">
                        前往戰情儀表板
                        <ChevronRight size={16} aria-hidden />
                    </Link>
                </div>
            </div>
        </div>
    );
}

export default EmergencyStatusBar;
