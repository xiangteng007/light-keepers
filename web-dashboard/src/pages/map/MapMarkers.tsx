/**
 * MapMarkers — 地圖標記層（R2b 自 MapPage 抽出）
 *
 * 只負責把資料畫成 MarkerF / HeatmapLayerF；點擊一律回報 onSelect，
 * 由 container 驅動 InfoWindow 與側欄行動卡。
 *
 * C1.1 保留：已確認通報使用 createDisasterReportMarkerIcon（既有 8 類與
 * createMarkerIcon 完全相同，民防四類用災型專屬色加粗外框）。
 * C1.2 保留：防空避難處所使用獨立盾牌圖標（createAirRaidShelterMarkerIcon）。
 */
import { MarkerF, HeatmapLayerF } from '@react-google-maps/api';
import type {
    Event, NcdrAlert, Shelter, AedLocation, Report, Warehouse, AirRaidShelter,
} from '../../api';
import {
    createMarkerIcon,
    createDisasterReportMarkerIcon,
    createNcdrMarkerIcon,
    createShelterMarkerIcon,
    createAedMarkerIcon,
    createWarehouseMarkerIcon,
    createAirRaidShelterMarkerIcon,
} from '../map-utils';
import { AED_MIN_ZOOM } from '../map-constants';
import type { LayerState, MapSelection } from './types';

const REPORT_SEVERITY_MAP: Record<string, number> = {
    low: 1, medium: 2, high: 3, critical: 4,
};

export interface MapMarkersProps {
    layers: LayerState;
    currentZoom: number;
    eventsWithLocation: Array<Event & { latitude: number; longitude: number }>;
    confirmedReports: Report[];
    ncdrAlerts: NcdrAlert[];
    shelters: Shelter[];
    aedLocations: AedLocation[];
    warehouses: Warehouse[];
    airRaidShelters: AirRaidShelter[];
    heatmapData: Array<{ location: google.maps.LatLng; weight: number }>;
    userLocation: { lat: number; lng: number } | null;
    onSelect: (selection: MapSelection) => void;
}

export default function MapMarkers({
    layers,
    currentZoom,
    eventsWithLocation,
    confirmedReports,
    ncdrAlerts,
    shelters,
    aedLocations,
    warehouses,
    airRaidShelters,
    heatmapData,
    userLocation,
    onSelect,
}: MapMarkersProps) {
    const shouldShowAed = layers.aed && currentZoom >= AED_MIN_ZOOM;

    return (
        <>
            {/* 事件標記 */}
            {layers.events && eventsWithLocation.map((event) => (
                <MarkerF
                    key={event.id}
                    position={{ lat: event.latitude, lng: event.longitude }}
                    icon={createMarkerIcon(event.severity || 1)}
                    onClick={() => onSelect({ kind: 'event', event })}
                    title={event.title}
                />
            ))}

            {/* 已確認通報標記（C1.1：民防災型專屬 marker 配色） */}
            {layers.events && confirmedReports
                .filter((r) => r.latitude && r.longitude)
                .map((report) => (
                    <MarkerF
                        key={`report-${report.id}`}
                        position={{ lat: Number(report.latitude), lng: Number(report.longitude) }}
                        icon={createDisasterReportMarkerIcon(
                            report.type,
                            REPORT_SEVERITY_MAP[report.severity] || 2,
                        )}
                        onClick={() => {
                            // 將通報轉換為事件格式顯示（沿用既有行為）
                            const eventLike = {
                                ...report,
                                severity: REPORT_SEVERITY_MAP[report.severity] || 2,
                                latitude: Number(report.latitude),
                                longitude: Number(report.longitude),
                            } as unknown as Event;
                            onSelect({ kind: 'event', event: eventLike });
                        }}
                        title={report.title}
                    />
                ))}

            {/* NCDR 警報標記 */}
            {layers.ncdr && ncdrAlerts
                .filter((a) => a.latitude && a.longitude)
                .map((alert) => (
                    <MarkerF
                        key={alert.id}
                        position={{ lat: Number(alert.latitude), lng: Number(alert.longitude) }}
                        icon={createNcdrMarkerIcon(alert.alertTypeId)}
                        onClick={() => onSelect({ kind: 'ncdr', alert })}
                        title={alert.title}
                    />
                ))}

            {/* 避難收容所 */}
            {layers.shelters && shelters.map((shelter) => (
                <MarkerF
                    key={shelter.id}
                    position={{ lat: shelter.latitude, lng: shelter.longitude }}
                    icon={createShelterMarkerIcon()}
                    onClick={() => onSelect({ kind: 'shelter', shelter })}
                    title={shelter.name}
                />
            ))}

            {/* AED（縮放 ≥ AED_MIN_ZOOM） */}
            {shouldShowAed && aedLocations.map((aed) => (
                <MarkerF
                    key={aed.id}
                    position={{ lat: aed.latitude, lng: aed.longitude }}
                    icon={createAedMarkerIcon()}
                    onClick={() => onSelect({ kind: 'aed', aed })}
                    title={aed.name}
                />
            ))}

            {/* 物資倉庫 */}
            {layers.warehouses && warehouses.map((warehouse) => (
                <MarkerF
                    key={warehouse.id}
                    position={{ lat: Number(warehouse.latitude), lng: Number(warehouse.longitude) }}
                    icon={createWarehouseMarkerIcon()}
                    onClick={() => onSelect({ kind: 'warehouse', warehouse })}
                    title={warehouse.name}
                />
            ))}

            {/* 防空避難處所（C1.2：獨立盾牌圖標/顏色，與避難收容所區分） */}
            {layers.airRaidShelters && airRaidShelters.map((shelter) => (
                <MarkerF
                    key={shelter.id}
                    position={{ lat: shelter.latitude, lng: shelter.longitude }}
                    icon={createAirRaidShelterMarkerIcon()}
                    onClick={() => onSelect({ kind: 'airRaidShelter', shelter })}
                    title={shelter.name}
                />
            ))}

            {/* 熱點分析 */}
            {layers.hotspots && heatmapData.length > 0 && (
                <HeatmapLayerF
                    data={heatmapData}
                    options={{
                        radius: 30,
                        opacity: 0.7,
                        gradient: [
                            'rgba(0, 255, 0, 0)',
                            'rgba(0, 255, 0, 0.6)',
                            'rgba(255, 255, 0, 0.8)',
                            'rgba(255, 165, 0, 0.9)',
                            'rgba(255, 0, 0, 1)',
                        ],
                    }}
                />
            )}

            {/* 用戶位置 — Google Maps 藍點樣式 */}
            {userLocation && (
                <>
                    <MarkerF
                        position={userLocation}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#4285F4',
                            fillOpacity: 0.2,
                            strokeColor: '#4285F4',
                            strokeWeight: 1,
                            strokeOpacity: 0.5,
                            scale: 25,
                        }}
                        zIndex={999}
                    />
                    <MarkerF
                        position={userLocation}
                        icon={{
                            path: google.maps.SymbolPath.CIRCLE,
                            fillColor: '#4285F4',
                            fillOpacity: 1,
                            strokeColor: '#ffffff',
                            strokeWeight: 3,
                            scale: 8,
                        }}
                        title="您的位置"
                        zIndex={1000}
                    />
                </>
            )}
        </>
    );
}
