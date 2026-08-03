/**
 * widgets/map/MapWidgets.tsx
 *
 * Tactical map, layer control and legend widgets.
 */
import { useTranslation } from 'react-i18next';
import { Layers, MapPin } from 'lucide-react';

// Translated Map Layers Widget
export const TranslatedMapLayersWidget = () => {
    const { t } = useTranslation();
    const layers = [
        { key: 'widgets.mapLayers.events', defaultChecked: true },
        { key: 'widgets.mapLayers.volunteers', defaultChecked: true },
        { key: 'widgets.mapLayers.resources', defaultChecked: true },
        { key: 'widgets.mapLayers.routes', defaultChecked: false },
    ];
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', padding: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '8px' }}>
                <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
                {t('widgets.mapLayers.title')}
            </div>
            {layers.map((layer, i) => (
                <label key={i} style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    background: layer.defaultChecked ? 'rgba(195, 155, 111, 0.15)' : 'rgba(47, 54, 65, 0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                }}>
                    <input type="checkbox" defaultChecked={layer.defaultChecked} />
                    <span>{t(layer.key)}</span>
                </label>
            ))}
        </div>
    );
};

// Translated Map Legend Widget
export const TranslatedMapLegendWidget = () => {
    const { t } = useTranslation();
    const items = [
        { color: '#ef4444', key: 'widgets.mapLegend.critical' },
        { color: '#f97316', key: 'widgets.mapLegend.high' },
        { color: '#eab308', key: 'widgets.mapLegend.medium' },
        { color: '#22c55e', key: 'widgets.mapLegend.normal' },
    ];
    return (
        <div style={{ padding: '8px', fontSize: '12px' }}>
            {items.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                    <span style={{ color: 'var(--text-secondary)' }}>{t(item.key)}</span>
                </div>
            ))}
        </div>
    );
};

export const TacticalMapWidget = () => (
    <div style={{
        height: '100%',
        background: 'linear-gradient(135deg, #0D1424 0%, #131B2E 100%)',
        borderRadius: '8px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    }}>
        <div style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: 'linear-gradient(rgba(195, 155, 111, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(195, 155, 111, 0.05) 1px, transparent 1px)',
            backgroundSize: '30px 30px',
        }} />
        <MapPin size={48} style={{ color: 'rgba(195, 155, 111, 0.3)' }} />
        <div style={{ position: 'absolute', bottom: '12px', left: '12px', fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            25.0330°N, 121.5654°E
        </div>
    </div>
);

// Non-translated variants kept for parity with the original content map
export const MapLayersWidget = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', padding: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--accent-gold)', fontWeight: 600, marginBottom: '8px' }}>
            <Layers size={14} style={{ verticalAlign: 'middle', marginRight: '6px' }} />
            圖層控制
        </div>
        {['事件標記', '志工位置', '資源點', '路線規劃'].map((layer, i) => (
            <label key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '10px 12px',
                background: i < 3 ? 'rgba(195, 155, 111, 0.15)' : 'rgba(47, 54, 65, 0.3)',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
            }}>
                <input type="checkbox" defaultChecked={i < 3} />
                <span>{layer}</span>
            </label>
        ))}
    </div>
);

export const MapLegendWidget = () => (
    <div style={{ padding: '8px', fontSize: '12px' }}>
        {[
            { color: '#ef4444', label: '緊急' },
            { color: '#f97316', label: '高優先' },
            { color: '#eab308', label: '中優先' },
            { color: '#22c55e', label: '一般' },
        ].map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            </div>
        ))}
    </div>
);
