// Map constants and NCDR alert type configurations

// Google Maps API Key - from environment variable
export const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
export const GOOGLE_MAPS_LIBRARIES: ("places" | "visualization")[] = ['places', 'visualization'];

// 台灣中心座標
export const TAIWAN_CENTER = { lat: 23.5, lng: 121 };
export const DEFAULT_ZOOM = 7;
export const AED_MIN_ZOOM = 17; // AED 最低顯示縮放等級 (約 50m 比例尺)
export const EVENT_ZOOM_LEVEL = 16;

// NCDR 核心示警類型定義（使用官方 AlertType ID）
// 來源: https://alerts.ncdr.nat.gov.tw/RSS.aspx
//
// R5/T5c 註記：icon 欄位（emoji）暫予保留——唯一呼叫端是 MapSidebar 的原生
// <option>（NCDR 類型篩選下拉），原生 option 無法渲染 SVG，B3c 圖例系統
// 無從接入；NCDR 示警類型（多為氣象類）亦無對應災型象形。待該下拉改為
// 自訂元件時一併移除 icon 欄位。地圖上的 NCDR marker 不用本欄位
// （map-utils createNcdrMarkerIcon 只取 color）。
export const NCDR_CORE_TYPES = [
    { id: 6, name: '地震', icon: '🌍', color: '#5BA3C0' },       // 地震(中央氣象署)
    { id: 7, name: '海嘯', icon: '🌊', color: '#4DA6E8' },       // 海嘯(中央氣象署)
    { id: 5, name: '颱風', icon: '🌀', color: '#7B6FA6' },       // 颱風(中央氣象署)
    { id: 1051, name: '雷雨', icon: '⛈️', color: '#A67B5B' },    // 雷雨(中央氣象署)
    { id: 10, name: '降雨', icon: '🌧️', color: '#6B8EC9' },      // 降雨(中央氣象署)
    { id: 9, name: '土石流', icon: '⛰️', color: '#8B6B5A' },     // 土石流(農業部)
    { id: 1087, name: '火災', icon: '🔥', color: '#E85A5A' },    // 火災(內政部消防署)
];

// NCDR 擴展示警類型
export const NCDR_EXTENDED_TYPES = [
    { id: 1060, name: '低溫', icon: '❄️', color: '#88CCEE' },    // 低溫(中央氣象署)
    { id: 1062, name: '濃霧', icon: '🌫️', color: '#9AA5B1' },    // 濃霧(中央氣象署)
    { id: 1061, name: '強風', icon: '💨', color: '#7EC8E3' },    // 強風(中央氣象署)
    { id: 2107, name: '高溫', icon: '🌡️', color: '#E8A65A' },    // 高溫(中央氣象署)
    { id: 8, name: '淹水', icon: '🌊', color: '#5AB3E8' },       // 淹水(水利署)
    { id: 12, name: '水庫放流', icon: '💧', color: '#5AAAE8' },  // 水庫放流(水利署)
    { id: 11, name: '河川高水位', icon: '🏞️', color: '#6BB3C9' }, // 河川高水位(水利署)
    { id: 13, name: '道路封閉', icon: '🚧', color: '#F5A623' },  // 道路封閉(交通部公路局)
    { id: 34, name: '鐵路事故', icon: '🚃', color: '#607D8B' },  // 鐵路事故(臺鐵公司)
    { id: 32, name: '鐵路事故(高鐵)', icon: '🚄', color: '#FF5722' }, // 鐵路事故(台灣高鐵)
    { id: 1053, name: '傳染病', icon: '🦠', color: '#8BC34A' },  // 傳染病(疾病管制署)
    { id: 1078, name: '空氣品質', icon: '😷', color: '#9E9E9E' }, // 空氣品質(環境部)
    { id: 1093, name: '林火', icon: '🌲', color: '#4CAF50' },    // 林火危險度預警(農業部)
    { id: 1080, name: '電力', icon: '⚡', color: '#FFC107' },    // 電力中斷(台灣電力公司)
    { id: 1089, name: '停水', icon: '🚰', color: '#2196F3' },    // 停水(台灣自來水公司)
    { id: 2135, name: '捷運營運', icon: '🚇', color: '#9C27B0' }, // 捷運營運(臺北大眾捷運)
];

// 圖層類型配置
export const MAP_TYPES = {
    roadmap: { name: '預設', id: 'roadmap' as google.maps.MapTypeId },
    satellite: { name: '衛星', id: 'satellite' as google.maps.MapTypeId },
    terrain: { name: '地形', id: 'terrain' as google.maps.MapTypeId },
    hybrid: { name: '衛星+標籤', id: 'hybrid' as google.maps.MapTypeId },
} as const;

export type MapTypeKey = keyof typeof MAP_TYPES;
