/**
 * TacticalMapPage
 * Strategic map with Mapbox integration
 */
import { Suspense, lazy } from 'react';
import { createLogger } from '../../utils/logger';
import './TacticalMapPage.css';

const logger = createLogger('TacticalMap');

// Lazy load to avoid SSR issues with mapbox
const TacticalMap = lazy(() => import('../../components/TacticalMap/TacticalMap').then(m => ({ default: m.TacticalMap })));

const mockMarkers = [
    { id: '1', type: 'task' as const, coordinates: [121.5654, 25.0330] as [number, number], title: '緊急救援任務', description: '北區淹水救援', priority: 'high' as const, status: '進行中' },
    { id: '2', type: 'volunteer' as const, coordinates: [121.5580, 25.0350] as [number, number], title: '李志明', description: '現場救援人員', status: '執勤中' },
    { id: '3', type: 'resource' as const, coordinates: [121.5700, 25.0310] as [number, number], title: '物資站 A', description: '糧食、飲水', priority: 'medium' as const, status: '充足' },
    { id: '4', type: 'alert' as const, coordinates: [121.5520, 25.0280] as [number, number], title: '豪雨警報', description: '累積雨量超過 300mm', priority: 'critical' as const, status: '持續中' },
];

function MapFallback() {
    return (
        <div className="map-fallback">
            <div className="map-fallback__content">
                <span>🗺️</span>
                <h3>載入地圖中...</h3>
                <p>請稍候，正在初始化 Mapbox</p>
            </div>
        </div>
    );
}

export default function TacticalMapPage() {
    return (
        <div className="tactical-map-page">
            <header className="tactical-map-page__header">
                <h1>🗺️ 戰術地圖</h1>
                <p>即時任務、資源、人員位置追蹤</p>
            </header>

            <div className="tactical-map-page__map">
                <Suspense fallback={<MapFallback />}>
                    <TacticalMap
                        center={[121.5654, 25.0330]}
                        zoom={13}
                        markers={mockMarkers}
                        onMarkerClick={(marker) => logger.debug('Clicked marker:', marker)}
                        showLayers={true}
                    />
                </Suspense>
            </div>

            <div className="tactical-map-page__legend">
                <div className="legend-item"><span className="dot task"></span> 任務</div>
                <div className="legend-item"><span className="dot volunteer"></span> 志工</div>
                <div className="legend-item"><span className="dot resource"></span> 資源</div>
                <div className="legend-item"><span className="dot alert"></span> 警報</div>
                <div className="legend-item"><span className="dot incident"></span> 事件</div>
            </div>
        </div>
    );
}
