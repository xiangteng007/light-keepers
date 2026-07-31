/**
 * widgets/geo/GeoWidgets.tsx
 *
 * Geo-intel domain: alerts feed, weather and earthquake monitoring.
 */
import { CloudRain } from 'lucide-react';

export const WeatherAlertWidget = () => (
    <div style={{ height: '100%', padding: '12px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <CloudRain size={24} style={{ color: '#3B82F6' }} />
            <div>
                <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)' }}>豪雨特報</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>台北市, 新北市</div>
            </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>雨量</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#3B82F6' }}>120mm</div>
            </div>
            <div style={{ background: 'rgba(234, 179, 8, 0.1)', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>風速</div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: '#eab308' }}>6級</div>
            </div>
        </div>
    </div>
);

export const GeoAlertFeedWidget = () => (
    <div style={{ height: '100%', overflow: 'auto', padding: '8px' }}>
        {[
            { source: 'NCDR', alert: '豪雨特報', region: '台北市、新北市', level: 'high', time: '10:00' },
            { source: '氣象局', alert: '強風特報', region: '桃園市沿海', level: 'medium', time: '09:30' },
            { source: '社群', alert: '淹水通報', region: '信義區松仁路', level: 'critical', time: '09:15' },
        ].map((a, i) => (
            <div key={i} style={{
                padding: '12px', marginBottom: '8px', background: 'rgba(47, 54, 65, 0.3)', borderRadius: '8px',
                borderLeft: `3px solid ${a.level === 'critical' ? '#ef4444' : a.level === 'high' ? '#f97316' : '#eab308'}`,
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>{a.alert}</span>
                    <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{a.source} • {a.time}</span>
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>📍 {a.region}</div>
            </div>
        ))}
    </div>
);

export const GeoSummaryWidget = () => (
    <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-around', padding: '8px' }}>
        {[
            { label: '警報總數', value: '12', color: '#ef4444' },
            { label: 'NCDR', value: '5', color: '#f97316' },
            { label: '氣象局', value: '4', color: '#3b82f6' },
            { label: '社群情資', value: '3', color: '#22c55e' },
        ].map((m, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '20px', fontWeight: 700, color: m.color }}>{m.value}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{m.label}</div>
            </div>
        ))}
    </div>
);

export const EarthquakeMonitorWidget = () => (
    <div style={{ height: '100%', padding: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌋</div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: '#22c55e' }}>目前無地震</div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>最後更新: 10:30</div>
    </div>
);

export const ForecastCardsWidget = () => (
    <div style={{ padding: '8px' }}>
        {[
            { day: '今天', temp: '28°', condition: '☀️ 晴' },
            { day: '明天', temp: '26°', condition: '🌧️ 雨' },
            { day: '後天', temp: '25°', condition: '⛅ 多雲' },
        ].map((f, i) => (
            <div key={i} style={{
                padding: '12px',
                background: 'rgba(47, 54, 65, 0.3)',
                borderRadius: '8px',
                marginBottom: '8px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
            }}>
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{f.day}</span>
                <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>{f.temp}</span>
                <span>{f.condition}</span>
            </div>
        ))}
    </div>
);
