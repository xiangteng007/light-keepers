import React from 'react';

/**
 * MissionCard - Reference Component for Tactical C2 Design System
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Demonstrates:
 * - Background colors (#1D2635 panel, #2F3641 borders)
 * - Gold accent (#C39B6F) for primary actions
 * - Critical red (#893336) for high priority badges
 * - Tactical typography (small, dense, uppercase labels)
 * - Matte glassmorphism effect
 */

export interface MissionCardProps {
    missionId: string;
    title: string;
    location: string;
    coordinates: {
        lat: number;
        lng: number;
    };
    priority: 'critical' | 'high' | 'medium' | 'low';
    status: 'active' | 'standby' | 'completed';
    assignedTeams: number;
    lastUpdate: string;
    onViewDetails?: () => void;
    onDispatch?: () => void;
}

const priorityConfig = {
    critical: {
        label: 'CRITICAL',
        badgeClass: 'tactical-badge-critical',
        dotClass: 'tactical-status-dot-critical',
    },
    high: {
        label: 'HIGH',
        badgeClass: 'tactical-badge-warning',
        dotClass: 'bg-tactical-status-warning',
    },
    medium: {
        label: 'MEDIUM',
        badgeClass: 'tactical-badge-gold',
        dotClass: 'bg-tactical-gold',
    },
    low: {
        label: 'LOW',
        badgeClass: 'tactical-badge',
        dotClass: 'bg-tactical-status-offline',
    },
};

const statusConfig = {
    active: {
        label: 'ACTIVE',
        colorClass: 'text-tactical-status-success-light',
        dotClass: 'tactical-status-dot-online',
    },
    standby: {
        label: 'STANDBY',
        colorClass: 'text-tactical-gold',
        dotClass: 'bg-tactical-gold',
    },
    completed: {
        label: 'COMPLETED',
        colorClass: 'text-tactical-text-tertiary',
        dotClass: 'bg-tactical-status-offline',
    },
};

export const MissionCard: React.FC<MissionCardProps> = ({
    missionId,
    title,
    location,
    coordinates,
    priority,
    status,
    assignedTeams,
    lastUpdate,
    onViewDetails,
    onDispatch,
}) => {
    const priorityCfg = priorityConfig[priority];
    const statusCfg = statusConfig[status];

    return (
        <div
            className="
        tactical-glass
        rounded-tactical-lg
        overflow-hidden
        transition-all duration-150
        hover:border-tactical-border-light
        hover:shadow-tactical-lg
        group
      "
        >
            {/* ═══ Header ═══ */}
            <div
                className="
          flex items-center justify-between
          px-4 py-3
          border-b border-tactical-border
          bg-tactical-panel
        "
            >
                {/* Mission ID & Status */}
                <div className="flex items-center gap-3">
                    <span className={`tactical-status-dot ${priorityCfg.dotClass}`} />
                    <span className="font-tactical-mono text-tactical-sm text-tactical-text-secondary">
                        {missionId}
                    </span>
                </div>

                {/* Priority Badge */}
                <span className={`tactical-badge ${priorityCfg.badgeClass}`}>
                    {priorityCfg.label}
                </span>
            </div>

            {/* ═══ Body ═══ */}
            <div className="px-4 py-4 space-y-4">
                {/* Title */}
                <h3 className="text-tactical-lg font-semibold text-tactical-text-primary leading-tight">
                    {title}
                </h3>

                {/* Location & Coordinates */}
                <div className="space-y-2">
                    <div className="flex items-start gap-2">
                        <span className="tactical-label w-16 flex-shrink-0">LOC</span>
                        <span className="text-tactical-base text-tactical-text-primary">
                            {location}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="tactical-label w-16 flex-shrink-0">COORD</span>
                        <span className="font-tactical-mono text-tactical-sm text-tactical-text-secondary">
                            {coordinates.lat.toFixed(4)}°N, {coordinates.lng.toFixed(4)}°E
                        </span>
                    </div>
                </div>

                {/* Stats Row */}
                <div
                    className="
            flex items-center gap-6
            pt-3
            border-t border-tactical-border
          "
                >
                    {/* Status */}
                    <div className="flex items-center gap-2">
                        <span className={`tactical-status-dot ${statusCfg.dotClass}`} />
                        <span className={`text-tactical-xs font-medium tracking-tactical-wide uppercase ${statusCfg.colorClass}`}>
                            {statusCfg.label}
                        </span>
                    </div>

                    {/* Teams */}
                    <div className="flex items-center gap-1.5">
                        <svg
                            className="w-3.5 h-3.5 text-tactical-text-tertiary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                        </svg>
                        <span className="font-tactical-mono text-tactical-sm text-tactical-text-secondary">
                            {assignedTeams}
                        </span>
                    </div>

                    {/* Last Update */}
                    <div className="flex items-center gap-1.5 ml-auto">
                        <svg
                            className="w-3.5 h-3.5 text-tactical-text-tertiary"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        <span className="font-tactical-mono text-tactical-xs text-tactical-text-tertiary">
                            {lastUpdate}
                        </span>
                    </div>
                </div>
            </div>

            {/* ═══ Footer Actions ═══ */}
            <div
                className="
          flex items-center gap-2
          px-4 py-3
          border-t border-tactical-border
          bg-tactical-panel/50
        "
            >
                <button
                    onClick={onViewDetails}
                    className="tactical-btn-ghost flex-1"
                >
                    VIEW DETAILS
                </button>
                <button
                    onClick={onDispatch}
                    className="tactical-btn-primary flex-1"
                >
                    DISPATCH
                </button>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// DEMO USAGE
// ═══════════════════════════════════════════════════════════════

export const MissionCardDemo: React.FC = () => {
    const sampleMissions: MissionCardProps[] = [
        {
            missionId: 'MSN-2026-0107-001',
            title: '高雄三民區淹水救援行動',
            location: '三民區建工路一帶',
            coordinates: { lat: 22.6533, lng: 120.3014 },
            priority: 'critical',
            status: 'active',
            assignedTeams: 4,
            lastUpdate: '2 MIN AGO',
        },
        {
            missionId: 'MSN-2026-0107-002',
            title: '左營區路樹倒塌清除',
            location: '左營區博愛路',
            coordinates: { lat: 22.6889, lng: 120.2933 },
            priority: 'high',
            status: 'standby',
            assignedTeams: 2,
            lastUpdate: '15 MIN AGO',
        },
        {
            missionId: 'MSN-2026-0106-015',
            title: '鳳山區物資發放站',
            location: '鳳山區中正路活動中心',
            coordinates: { lat: 22.6262, lng: 120.3587 },
            priority: 'medium',
            status: 'active',
            assignedTeams: 3,
            lastUpdate: '1 HR AGO',
        },
    ];

    return (
        <div
            className="
        min-h-screen 
        bg-tactical-app 
        p-6
      "
        >
            <h1 className="text-tactical-2xl font-bold text-tactical-text-primary mb-6">
                Mission Cards Demo
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sampleMissions.map((mission) => (
                    <MissionCard
                        key={mission.missionId}
                        {...mission}
                        onViewDetails={() => console.log('View:', mission.missionId)}
                        onDispatch={() => console.log('Dispatch:', mission.missionId)}
                    />
                ))}
            </div>
        </div>
    );
};

export default MissionCard;
