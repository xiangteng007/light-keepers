/**
 * widgets/core/CoreWidgets.tsx
 *
 * Cross-cutting widgets used by many pages (quick actions, search, generic panels).
 */
import { Navigation, Package, AlertTriangle, Search } from 'lucide-react';
import { CardPlaceholder } from '../shared/primitives';

export const QuickActionsWidget = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', height: '100%' }}>
        {[
            { icon: <Navigation size={14} />, label: '導航' },
            { icon: <Package size={14} />, label: '派遣' },
            { icon: <AlertTriangle size={14} />, label: '通報' },
        ].map((action, i) => (
            <button key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                background: 'rgba(195, 155, 111, 0.15)',
                border: '1px solid rgba(195, 155, 111, 0.3)',
                borderRadius: '6px',
                color: 'var(--accent-gold)',
                fontSize: '12px',
                cursor: 'pointer',
            }}>
                {action.icon}
                {action.label}
            </button>
        ))}
    </div>
);

export const SearchPanelWidget = () => (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px', height: '100%' }}>
        <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 16px',
            background: 'rgba(47, 54, 65, 0.5)',
            border: '1px solid rgba(195, 155, 111, 0.2)',
            borderRadius: '8px',
            flex: 1,
        }}>
            <Search size={16} style={{ color: 'var(--text-muted)' }} />
            <input
                type="text"
                placeholder="搜尋姓名或地點..."
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    width: '100%',
                }}
            />
        </div>
        <select style={{
            padding: '10px 16px',
            background: 'rgba(47, 54, 65, 0.5)',
            border: '1px solid rgba(195, 155, 111, 0.2)',
            borderRadius: '8px',
            color: 'var(--text-primary)',
            fontSize: '14px',
        }}>
            <option>所有狀態</option>
            <option>尋找中</option>
            <option>已尋獲</option>
            <option>已團聚</option>
        </select>
    </div>
);

export const WorkspaceWidget = () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)' }}>
        [M-W] 地圖內容區
    </div>
);

export const DisasterReportsWidget = () => (
    <div>
        <CardPlaceholder title="災情通報 1" />
        <CardPlaceholder title="災情通報 2" />
    </div>
);
