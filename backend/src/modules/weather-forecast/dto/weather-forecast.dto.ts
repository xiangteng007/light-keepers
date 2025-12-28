// CWA OpenData API 資料集代碼
export const CWA_DATASETS = {
    // 一般天氣預報
    FORECAST_36H: 'F-C0032-001',           // 36小時天氣預報
    FORECAST_WEEK: 'F-D0047-091',          // 一週鄉鎮天氣預報

    // 天氣分析與預測圖
    WEATHER_MAP_SURFACE: 'F-C0035-001',    // 地面天氣圖
    WEATHER_MAP_LATEST: 'F-C0035-003',     // 最新天氣圖
    WEATHER_MAP_DAY0: 'F-C0035-006',       // 一週預測圖 D+0
    WEATHER_MAP_DAY1: 'F-C0035-007',       // 一週預測圖 D+1
    WEATHER_MAP_DAY2: 'F-C0035-008',       // 一週預測圖 D+2
    WEATHER_MAP_DAY3: 'F-C0035-009',       // 一週預測圖 D+3
    WEATHER_MAP_DAY4: 'F-C0035-010',       // 一週預測圖 D+4
    WEATHER_MAP_DAY5: 'F-C0035-011',       // 一週預測圖 D+5
    WEATHER_MAP_DAY6: 'F-C0035-012',       // 一週預測圖 D+6
    WEATHER_MAP_DAY7: 'F-C0035-013',       // 一週預測圖 D+7

    // 24小時雨量預測
    QPF_0_12H: 'F-C0035-015',              // 定量降水預報 0-12h
    QPF_12_24H: 'F-C0035-017',             // 定量降水預報 12-24h
    QPF_TYPHOON: 'F-C0034-006',            // 颱風/豪雨24小時雨量

    // 海洋預報 - 使用一般天氣預報作為備用
    MARINE_WEATHER: 'F-C0032-001',         // 用 36小時天氣預報作為海面天氣備用
    WAVE_FORECAST: 'F-C0032-001',          // 波浪預報備用
    WAVE_MAP_24H: 'F-C0035-020',           // 24小時波浪預報圖
    TIDE_FORECAST: 'F-A0021-001',          // 潮汐預報

    // 育樂天氣預報 - 使用一般天氣預報作為替代
    MOUNTAIN_24H: 'F-C0032-001',           // 用一般預報代替
    MOUNTAIN_DAY_NIGHT: 'F-C0032-001',     // 登山日夜預報
    SCENIC_24H: 'F-C0032-001',             // 風景區一週預報
    SCENIC_DAY_NIGHT: 'F-C0032-001',       // 風景區日夜預報
    FARM_24H: 'F-C0032-001',               // 農場旅遊一週預報
    AGRICULTURE: 'F-C0032-001',            // 農業氣象建議
};

// 台灣縣市代碼
export const TAIWAN_COUNTIES = [
    { code: '63', name: '臺北市' },
    { code: '65', name: '新北市' },
    { code: '66', name: '桃園市' },
    { code: '68', name: '臺中市' },
    { code: '67', name: '臺南市' },
    { code: '64', name: '高雄市' },
    { code: '10002', name: '宜蘭縣' },
    { code: '10017', name: '基隆市' },
    { code: '10004', name: '新竹縣' },
    { code: '10018', name: '新竹市' },
    { code: '10005', name: '苗栗縣' },
    { code: '10007', name: '彰化縣' },
    { code: '10008', name: '南投縣' },
    { code: '10009', name: '雲林縣' },
    { code: '10010', name: '嘉義縣' },
    { code: '10020', name: '嘉義市' },
    { code: '10013', name: '屏東縣' },
    { code: '10014', name: '臺東縣' },
    { code: '10015', name: '花蓮縣' },
    { code: '10016', name: '澎湖縣' },
    { code: '09020', name: '金門縣' },
    { code: '09007', name: '連江縣' },
];

// 海域區域
export const MARINE_REGIONS = [
    '臺灣北部海面',
    '臺灣海峽北部',
    '臺灣海峽南部',
    '臺灣東北部海面',
    '臺灣東部海面',
    '臺灣東南部海面',
    '臺灣西南部海面',
    '巴士海峽',
];

// 潮汐測站
export const TIDE_STATIONS = [
    { id: '基隆', name: '基隆' },
    { id: '淡水', name: '淡水' },
    { id: '臺北', name: '臺北' },
    { id: '新竹', name: '新竹' },
    { id: '臺中', name: '臺中港' },
    { id: '布袋', name: '布袋' },
    { id: '高雄', name: '高雄' },
    { id: '東港', name: '東港' },
    { id: '臺東', name: '臺東' },
    { id: '花蓮', name: '花蓮' },
    { id: '蘇澳', name: '蘇澳' },
    { id: '澎湖', name: '澎湖' },
    { id: '金門', name: '金門' },
    { id: '馬祖', name: '馬祖' },
];

// API 回應 DTO
export interface WeatherForecastDto {
    locationName: string;
    description?: string;
    weatherElements: WeatherElementDto[];
}

export interface WeatherElementDto {
    elementName: string;
    description?: string;
    time: WeatherTimeDto[];
}

export interface WeatherTimeDto {
    startTime: string;
    endTime: string;
    parameter: {
        parameterName: string;
        parameterValue?: string;
        parameterUnit?: string;
    };
}

export interface WeatherMapDto {
    type: string;
    imageUrl: string;
    description: string;
    updatedAt: string;
}

export interface MarineWeatherDto {
    region: string;
    validTime: string;
    weather: string;
    wind: string;
    windSpeed: string;
    seaCondition: string;
    waveHeight?: string;
}

export interface TideForecastDto {
    station: string;
    date: string;
    lunarDate?: string;
    tides: TideEventDto[];
}

export interface TideEventDto {
    time: string;
    type: 'high' | 'low';
    height: number;
}

export interface RecreationalForecastDto {
    locationName: string;
    county?: string;
    forecasts: DailyForecastDto[];
}

export interface DailyForecastDto {
    date: string;
    weather: string;
    weatherCode?: string;
    minTemp: number;
    maxTemp: number;
    pop?: number;  // Probability of Precipitation
    humidity?: number;
    windDirection?: string;
    windSpeed?: string;
}
