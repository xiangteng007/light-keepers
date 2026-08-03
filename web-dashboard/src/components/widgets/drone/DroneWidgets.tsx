/**
 * widgets/drone/DroneWidgets.tsx
 *
 * Air-ops domain: drone fleet list, flight controls, telemetry and log.
 */
import type { ReactNode } from 'react';
import {
    ChevronUpIcon,
    ChevronDownIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
} from '../../../design-system/icons';
import { SolidSquareStamp } from '../../../design-system/icons/pictograms';

export const DroneListWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px', fontWeight: 600 }}>無人機列表</div>
        {['DJI-01', 'DJI-02', 'Mavic-03'].map((drone, i) => (
            <div key={i} style={{
                padding: '12px',
                background: i === 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
            }}>
                <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: i === 0 ? '#22c55e' : i === 1 ? '#eab308' : '#94a3b8',
                }} />
                <div>
                    <div style={{ fontSize: '13px', color: 'var(--text-primary)' }}>{drone}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                        {i === 0 ? '飛行中 · 電量 78%' : i === 1 ? '待命 · 電量 95%' : '離線'}
                    </div>
                </div>
            </div>
        ))}
    </div>
);

/** 方向鍵盤（R5/T5c）：chevron 族＋45° 旋轉出對角，中央停止＝實心方章（紅） */
const DRONE_CONTROL_CELLS: { key: string; label: string; el: ReactNode }[] = [
    { key: 'up', label: '上升', el: <ChevronUpIcon size={16} /> },
    { key: 'up-left', label: '左前', el: <ChevronUpIcon size={16} style={{ transform: 'rotate(-45deg)' }} /> },
    { key: 'up-right', label: '右前', el: <ChevronUpIcon size={16} style={{ transform: 'rotate(45deg)' }} /> },
    { key: 'left', label: '左移', el: <ChevronLeftIcon size={16} /> },
    { key: 'hold', label: '停止', el: <SolidSquareStamp size={12} /> },
    { key: 'right', label: '右移', el: <ChevronRightIcon size={16} /> },
    { key: 'down-left', label: '左後', el: <ChevronDownIcon size={16} style={{ transform: 'rotate(45deg)' }} /> },
    { key: 'down', label: '下降', el: <ChevronDownIcon size={16} /> },
    { key: 'down-right', label: '右後', el: <ChevronDownIcon size={16} style={{ transform: 'rotate(-45deg)' }} /> },
];

export const DroneControlsWidget = () => (
    <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px' }}>飛行控制</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {DRONE_CONTROL_CELLS.map((cell, i) => (
                <button key={cell.key} title={cell.label} aria-label={cell.label} style={{
                    padding: '12px',
                    background: i === 4 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(47, 54, 65, 0.5)',
                    border: i === 4 ? '1px solid #ef4444' : '1px solid rgba(195, 155, 111, 0.2)',
                    borderRadius: '8px',
                    color: i === 4 ? '#ef4444' : 'var(--text-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                }}>{cell.el}</button>
            ))}
        </div>
    </div>
);

export const DroneStatusWidget = () => (
    <div style={{ padding: '12px' }}>
        <div style={{ fontSize: '13px', color: 'var(--accent-gold)', marginBottom: '12px' }}>狀態監控</div>
        {[
            { label: '高度', value: '120m' },
            { label: '速度', value: '35 km/h' },
            { label: '電量', value: '78%' },
        ].map((stat, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(47, 54, 65, 0.5)' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{stat.label}</span>
                <span className="u-mono" style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600 }}>{stat.value}</span>
            </div>
        ))}
    </div>
);

export const DroneLogWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)' }}>
            <div>[14:30:00] DJI-01 起飛</div>
            <div>[14:30:15] 到達指定高度 120m</div>
            <div>[14:32:00] 開始偵察任務</div>
            <div style={{ color: '#3B82F6' }}>[14:35:00] 發現目標區域</div>
        </div>
    </div>
);
