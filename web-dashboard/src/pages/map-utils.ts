// Map utility functions: severity colors, marker icons, map options
import { NCDR_CORE_TYPES, NCDR_EXTENDED_TYPES } from './map-constants';

// 嚴重程度對應的顏色和標記圖標
export const getSeverityColor = (severity: number) => {
    if (severity >= 5) return '#B85C5C'; // 危機 - 紅色
    if (severity >= 4) return '#C9A256'; // 緊急 - 橙色
    if (severity >= 3) return '#B8976F'; // 警戒 - 金棕
    if (severity >= 2) return '#5C7B8E'; // 注意 - 藍灰
    return '#6B8E5C'; // 一般 - 綠色
};

export const getSeverityLabel = (severity: number) => {
    if (severity >= 5) return '危機';
    if (severity >= 4) return '緊急';
    if (severity >= 3) return '警戒';
    if (severity >= 2) return '注意';
    return '一般';
};

// 自訂標記圖標 - 災害回報 (PIN 形狀)
export const createMarkerIcon = (severity: number) => {
    const color = getSeverityColor(severity);
    return {
        path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 2,
        scale: 1.8,
        anchor: new google.maps.Point(12, 22),
    };
};

// NCDR 警報圖標 - 圓形圖標（根據類型顯示不同顏色）
export const getNcdrTypeColor = (alertTypeId: number): string => {
    const allTypes = [...NCDR_CORE_TYPES, ...NCDR_EXTENDED_TYPES];
    const typeInfo = allTypes.find(t => t.id === alertTypeId);
    return typeInfo?.color || '#C9A256';
};

export const createNcdrMarkerIcon = (alertTypeId: number) => {
    const color = getNcdrTypeColor(alertTypeId);
    return {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: color,
        fillOpacity: 1,
        strokeColor: '#fff',
        strokeWeight: 3,
        scale: 12,
    };
};

// 避難所標記圖標 - 房子形狀（綠色系）
export const createShelterMarkerIcon = () => ({
    path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    fillColor: '#4CAF50',
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 2,
    scale: 1.5,
    anchor: new google.maps.Point(12, 20),
});

// AED 標記圖標 - 心臟形狀（紅色）
export const createAedMarkerIcon = () => ({
    path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
    fillColor: '#E53935',
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 2,
    scale: 1.2,
    anchor: new google.maps.Point(12, 21),
});

// 倉庫標記圖標 - 方形倉庫（藍色）
export const createWarehouseMarkerIcon = () => ({
    path: 'M2 20h20v-4H2v4zm2-3h2v2H4v-2zM2 4v4h20V4H2zm4 3H4V5h2v2zm-4 7h20v-4H2v4zm2-3h2v2H4v-2z',
    fillColor: '#2196F3',
    fillOpacity: 1,
    strokeColor: '#fff',
    strokeWeight: 2,
    scale: 1.4,
    anchor: new google.maps.Point(12, 12),
});

// Map container style
export const containerStyle = {
    width: '100%',
    height: '100%',
};

// Map options for POI click
export const mapOptions: google.maps.MapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    mapTypeControl: false,
    scaleControl: true,
    streetViewControl: true,
    rotateControl: false,
    fullscreenControl: true,
    clickableIcons: true,
    keyboardShortcuts: false,
    tilt: 0,
    heading: 0,
    styles: [],
};

// 初始化所有類型為全選
export const initNcdrFilters = (): Record<number, boolean> => {
    const filters: Record<number, boolean> = {};
    NCDR_CORE_TYPES.forEach(t => { filters[t.id] = true; });
    NCDR_EXTENDED_TYPES.forEach(t => { filters[t.id] = true; });
    return filters;
};
