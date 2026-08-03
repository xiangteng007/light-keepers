/**
 * Victim Card Component - 傷患卡片元件
 */

import React from 'react';
import {
    ClockIcon,
    VehicleIcon,
    CheckIcon,
    CloseIcon,
    LocationIcon,
    type LkIcon,
} from '../../design-system/icons';
import './VictimCard.css';

// Types
export interface Victim {
    id: string;
    braceletId?: string;
    triageLevel: 'BLACK' | 'RED' | 'YELLOW' | 'GREEN';
    canWalk: boolean;
    breathing: boolean;
    respiratoryRate?: number;
    hasRadialPulse: boolean;
    capillaryRefillTime?: number;
    canFollowCommands: boolean;
    description?: string;
    locationDescription?: string;
    injuries?: string;
    transportStatus: 'PENDING' | 'IN_TRANSIT' | 'ARRIVED';
    hospitalName?: string;
    assessorName?: string;
    createdAt: string;
    updatedAt: string;
}

interface VictimCardProps {
    victim: Victim;
    onSelect?: (victim: Victim) => void;
    onTransport?: (victim: Victim) => void;
    compact?: boolean;
}

export const VictimCard: React.FC<VictimCardProps> = ({
    victim,
    onSelect,
    onTransport,
    compact = false,
}) => {
    const getTriageLabel = (level: Victim['triageLevel']) => {
        const labels = {
            BLACK: '黑 - 死亡/無法救治',
            RED: '紅 - 立即救治',
            YELLOW: '黃 - 延遲救治',
            GREEN: '綠 - 輕傷/可行走',
        };
        return labels[level];
    };

    /** 運送狀態 → B3c 教範圖例（R5/T5c）：待送＝時鐘、運送中＝載具、已到院＝勾 */
    const getTransportIcon = (status: Victim['transportStatus']) => {
        const icons: Record<Victim['transportStatus'], LkIcon> = {
            PENDING: ClockIcon,
            IN_TRANSIT: VehicleIcon,
            ARRIVED: CheckIcon,
        };
        const TransportIcon = icons[status];
        return (
            <TransportIcon
                size={14}
                aria-hidden="true"
                style={{ verticalAlign: 'text-bottom', marginRight: 4 }}
            />
        );
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' });
    };

    if (compact) {
        return (
            <div
                className={`victim-card compact triage-${victim.triageLevel}`}
                onClick={() => onSelect?.(victim)}
                data-triage={victim.triageLevel}
            >
                <div className="compact-header">
                    <span className="bracelet-id">{victim.braceletId || victim.id.slice(0, 8)}</span>
                    <span className={`triage-badge triage-${victim.triageLevel}`} data-triage={victim.triageLevel}>
                        {victim.triageLevel}
                    </span>
                </div>
                <div className="compact-location">{victim.locationDescription || '未知位置'}</div>
            </div>
        );
    }

    return (
        <div
            className={`victim-card triage-${victim.triageLevel}`}
            onClick={() => onSelect?.(victim)}
            data-triage={victim.triageLevel}
        >
            <div className="card-header">
                <div className="bracelet-section">
                    <span className="bracelet-label">手環 ID</span>
                    <span className="bracelet-id">{victim.braceletId || 'N/A'}</span>
                </div>
                <div
                    className={`triage-badge large triage-${victim.triageLevel}`}
                    data-triage={victim.triageLevel}
                >
                    {victim.triageLevel}
                </div>
            </div>

            <div className="triage-label">{getTriageLabel(victim.triageLevel)}</div>

            <div className="vital-signs">
                <div className={`vital ${victim.breathing ? 'ok' : 'alert'}`}>
                    <span className="icon" aria-hidden="true">
                        {victim.breathing ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
                    </span>
                    <span>呼吸</span>
                </div>
                <div className={`vital ${victim.hasRadialPulse ? 'ok' : 'alert'}`}>
                    <span className="icon" aria-hidden="true">
                        {victim.hasRadialPulse ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
                    </span>
                    <span>脈搏</span>
                </div>
                <div className={`vital ${victim.canFollowCommands ? 'ok' : 'alert'}`}>
                    <span className="icon" aria-hidden="true">
                        {victim.canFollowCommands ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
                    </span>
                    <span>意識</span>
                </div>
                <div className={`vital ${victim.canWalk ? 'ok' : 'alert'}`}>
                    <span className="icon" aria-hidden="true">
                        {victim.canWalk ? <CheckIcon size={14} /> : <CloseIcon size={14} />}
                    </span>
                    <span>行走</span>
                </div>
            </div>

            {victim.injuries && (
                <div className="injuries">
                    <span className="label">傷勢:</span> {victim.injuries}
                </div>
            )}

            {victim.locationDescription && (
                <div className="location">
                    <span className="label" aria-hidden="true"><LocationIcon size={14} /></span> {victim.locationDescription}
                </div>
            )}

            <div className="card-footer">
                <div className="transport-status">
                    {getTransportIcon(victim.transportStatus)} {victim.transportStatus}
                    {victim.hospitalName && ` → ${victim.hospitalName}`}
                </div>
                <div className="time-info">
                    <span className="assessor">{victim.assessorName || '未知評估者'}</span>
                    <span className="time">{formatTime(victim.createdAt)}</span>
                </div>
            </div>

            {onTransport && victim.transportStatus === 'PENDING' && (
                <button
                    className="transport-btn"
                    onClick={e => {
                        e.stopPropagation();
                        onTransport(victim);
                    }}
                >
                    <VehicleIcon
                        size={14}
                        aria-hidden="true"
                        style={{ verticalAlign: 'text-bottom', marginRight: 4 }}
                    />
                    派送運輸
                </button>
            )}
        </div>
    );
};

export default VictimCard;
