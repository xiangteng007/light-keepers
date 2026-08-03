import { useState, useEffect } from 'react';
import './ForecastPage.css';

import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';
import { Alert, Button } from '../design-system';
import { ChevronUpIcon, ChevronDownIcon } from '../design-system/icons';
import { Skeleton } from '../components/ui/Skeleton/Skeleton';
import EmptyState from '../components/shared/EmptyState';
import { CloudOff } from 'lucide-react';

// 類型定義
interface WeatherElement {
    elementName: string;
    time: Array<{
        startTime: string;
        endTime: string;
        parameter: {
            parameterName?: string;
            parameterValue?: string;
        };
    }>;
}

interface WeatherForecast {
    locationName: string;
    weatherElements: WeatherElement[];
}

interface MarineRegion {
    region: string;
    wind: string;
    windSpeed: string;
    seaCondition: string;
    waveHeight: string;
}

interface TideEvent {
    time: string;
    type: 'high' | 'low';
    height: number;
}

interface TideForecast {
    date: string;
    tides: TideEvent[];
}

interface TideStation {
    station: string;
    forecasts: TideForecast[];
}

interface DailyForecast {
    date: string;
    weather: string;
    minTemp: number;
    maxTemp: number;
}

interface RecreationalLocation {
    locationName: string;
    forecasts: DailyForecast[];
}

interface ParsedWeatherElements {
    Wx?: Array<{ value: string }>;
    MinT?: Array<{ value: string }>;
    MaxT?: Array<{ value: string }>;
    PoP?: Array<{ value: string }>;
    CI?: Array<{ value: string }>;
}

// 縣市資料
const COUNTIES = [
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

// 標籤定義
const TABS: Array<{ id: string; label: string }> = [
    { id: 'general', label: '一般天氣' },
    { id: 'marine', label: '海面天氣' },
    { id: 'tide', label: '潮汐預報' },
    { id: 'mountain', label: '登山天氣' },
    { id: 'scenic', label: '風景區' },
    { id: 'farm', label: '農場旅遊' },
];

export default function ForecastPage() {
    const [selectedCounty, setSelectedCounty] = useState('臺北市');
    const [activeTab, setActiveTab] = useState('general');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // 資料狀態
    const [generalForecast, setGeneralForecast] = useState<WeatherForecast[]>([]);
    const [marineForecast, setMarineForecast] = useState<MarineRegion[]>([]);
    const [tideForecast, setTideForecast] = useState<TideStation[]>([]);
    const [mountainForecast, setMountainForecast] = useState<RecreationalLocation[]>([]);
    const [scenicForecast, setScenicForecast] = useState<RecreationalLocation[]>([]);
    const [farmForecast, setFarmForecast] = useState<RecreationalLocation[]>([]);

    // 載入一般天氣預報
    useEffect(() => {
        if (activeTab === 'general') {
            fetchGeneralForecast();
        }
    }, [selectedCounty, activeTab]);

    // 載入各類預報
    useEffect(() => {
        if (activeTab === 'marine') fetchMarineForecast();
        if (activeTab === 'tide') fetchTideForecast();
        if (activeTab === 'mountain') fetchMountainForecast();
        if (activeTab === 'scenic') fetchScenicForecast();
        if (activeTab === 'farm') fetchFarmForecast();
    }, [activeTab]);

    const fetchGeneralForecast = async () => {
        setLoading(true);
        setError(null);
        try {
            // 使用一週預報 API 取得 7 天資料
            const res = await api.get('/weather/weekly', { params: { county: selectedCounty } });
            const data = res.data;
            if (data.success) {
                setGeneralForecast(data.data || []);
            }
        } catch (err) {
            setError(getApiErrorMessage(err, '無法載入天氣預報'));
        } finally {
            setLoading(false);
        }
    };

    const fetchMarineForecast = async () => {
        setLoading(true);
        try {
            const res = await api.get('/weather/marine');
            const data = res.data;
            if (data.success) setMarineForecast(data.data || []);
        } catch (err) {
            setError(getApiErrorMessage(err, '無法載入海面天氣'));
        } finally {
            setLoading(false);
        }
    };

    const fetchTideForecast = async () => {
        setLoading(true);
        try {
            const res = await api.get('/weather/tide');
            const data = res.data;
            if (data.success) setTideForecast(data.data || []);
        } catch (err) {
            setError(getApiErrorMessage(err, '無法載入潮汐預報'));
        } finally {
            setLoading(false);
        }
    };

    const fetchMountainForecast = async () => {
        setLoading(true);
        try {
            const res = await api.get('/weather/mountain');
            const data = res.data;
            if (data.success) setMountainForecast(data.data || []);
        } catch (err) {
            setError(getApiErrorMessage(err, '無法載入登山天氣'));
        } finally {
            setLoading(false);
        }
    };

    const fetchScenicForecast = async () => {
        setLoading(true);
        try {
            const res = await api.get('/weather/scenic');
            const data = res.data;
            if (data.success) setScenicForecast(data.data || []);
        } catch (err) {
            setError(getApiErrorMessage(err, '無法載入風景區預報'));
        } finally {
            setLoading(false);
        }
    };

    const fetchFarmForecast = async () => {
        setLoading(true);
        try {
            const res = await api.get('/weather/farm');
            const data = res.data;
            if (data.success) setFarmForecast(data.data || []);
        } catch (err) {
            setError(getApiErrorMessage(err, '無法載入農場旅遊'));
        } finally {
            setLoading(false);
        }
    };

    // 依當前分頁重試
    const handleRetry = () => {
        if (activeTab === 'general') fetchGeneralForecast();
        else if (activeTab === 'marine') fetchMarineForecast();
        else if (activeTab === 'tide') fetchTideForecast();
        else if (activeTab === 'mountain') fetchMountainForecast();
        else if (activeTab === 'scenic') fetchScenicForecast();
        else if (activeTab === 'farm') fetchFarmForecast();
    };

    // 元素名稱對照表（CWA 中文名稱 -> 前端使用的 key）
    const ELEMENT_NAME_MAP: Record<string, string> = {
        '天氣現象': 'Wx',
        '天氣預報綜合描述': 'Wx',
        'Wx': 'Wx',
        '最低溫度': 'MinT',
        'MinT': 'MinT',
        '最高溫度': 'MaxT',
        'MaxT': 'MaxT',
        '平均溫度': 'T',
        'T': 'T',
        '降雨機率': 'PoP',
        '12小時降雨機率': 'PoP',
        'PoP12h': 'PoP',
        '舒適度': 'CI',
        '舒適度指數': 'CI',
        'CI': 'CI',
    };

    // 解析天氣資料
    const parseWeatherElements = (elements: WeatherElement[]): ParsedWeatherElements => {
        if (!elements) return {};
        const result: ParsedWeatherElements = {};
        elements.forEach((el: WeatherElement) => {
            if (el.time && el.time.length > 0) {
                // 使用對照表將中文名稱轉換為標準 key
                const mappedKey = ELEMENT_NAME_MAP[el.elementName] || el.elementName;
                const key = mappedKey as keyof ParsedWeatherElements;
                (result as Record<string, Array<{ value: string }>>)[key] = el.time.map((t) => ({
                    startTime: t.startTime,
                    endTime: t.endTime,
                    value: t.parameter?.parameterName || t.parameter?.parameterValue || '',
                }));
            }
        });
        return result;
    };

    return (
        <div className="forecast-page">
            {/* 頁面標題 */}
            <div className="page-header">
                <div className="page-header__titles">
                    <h1>氣象預報總覽</h1>
                    <p className="page-header__subtitle">整合中央氣象署公開資料</p>
                </div>
            </div>

            {/* 標籤列 */}
            <div className="forecast-tabs" role="tablist" aria-label="預報類型">
                {TABS.map((tab) => (
                    <button
                        key={tab.id}
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        className={`forecast-tab ${activeTab === tab.id ? 'is-active' : ''}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* 錯誤訊息 */}
            {error && (
                <Alert variant="danger" title="載入失敗" className="forecast-alert">
                    <div className="forecast-alert__body">
                        <span>{error}</span>
                        <Button variant="secondary" size="sm" onClick={handleRetry}>
                            重試
                        </Button>
                    </div>
                </Alert>
            )}

            {/* 載入中 */}
            {loading && (
                <div className="forecast-skeleton" role="status" aria-label="載入中">
                    <Skeleton variant="card" height={64} count={3} />
                </div>
            )}

            {/* 一般天氣預報 */}
            {!loading && activeTab === 'general' && (
                <div className="forecast-section">
                    <div className="county-selector">
                        <label htmlFor="forecast-county">選擇縣市：</label>
                        <select
                            id="forecast-county"
                            className="forecast-select"
                            value={selectedCounty}
                            onChange={(e) => setSelectedCounty(e.target.value)}
                        >
                            {COUNTIES.map(c => (
                                <option key={c.code} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    {generalForecast.length === 0 && !error && (
                        <EmptyState
                            icon={CloudOff}
                            variant="minimal"
                            title="尚無天氣預報資料"
                            description="請確認縣市選擇，或稍後再試"
                        />
                    )}

                    {generalForecast.length > 0 && generalForecast[0] && (
                        <>
                            <h2>{generalForecast[0].locationName} 一週天氣預報</h2>
                            <div className="weekly-table-container">
                                {(() => {
                                    const elements = parseWeatherElements(generalForecast[0].weatherElements);

                                    // 生成 7 天的資料（每天白天/晚上各一筆，所以 i 每次 +2）
                                    const days: Array<{
                                        dateStr: string;
                                        weekday: string;
                                        isWeekend: boolean;
                                        dayWx: string;
                                        dayMinT: string;
                                        dayMaxT: string;
                                        dayPop: string;
                                        nightWx: string;
                                        nightMinT: string;
                                        nightMaxT: string;
                                        nightPop: string;
                                    }> = [];

                                    for (let dayIdx = 0; dayIdx < 7; dayIdx++) {
                                        const date = new Date();
                                        date.setDate(date.getDate() + dayIdx);
                                        const dayOfWeek = date.getDay();
                                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
                                        const weekdayNames = ['日', '一', '二', '三', '四', '五', '六'];

                                        // 白天索引 = dayIdx * 2, 晚上索引 = dayIdx * 2 + 1
                                        const dayDataIdx = dayIdx * 2;
                                        const nightDataIdx = dayIdx * 2 + 1;

                                        days.push({
                                            dateStr: `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`,
                                            weekday: `星期${weekdayNames[dayOfWeek]}`,
                                            isWeekend,
                                            dayWx: elements.Wx?.[dayDataIdx]?.value || '多雲',
                                            dayMinT: elements.MinT?.[dayDataIdx]?.value || '--',
                                            dayMaxT: elements.MaxT?.[dayDataIdx]?.value || '--',
                                            dayPop: elements.PoP?.[dayDataIdx]?.value || '--',
                                            nightWx: elements.Wx?.[nightDataIdx]?.value || elements.Wx?.[dayDataIdx]?.value || '多雲',
                                            nightMinT: elements.MinT?.[nightDataIdx]?.value || elements.MinT?.[dayDataIdx]?.value || '--',
                                            nightMaxT: elements.MaxT?.[nightDataIdx]?.value || elements.MaxT?.[dayDataIdx]?.value || '--',
                                            nightPop: elements.PoP?.[nightDataIdx]?.value || elements.PoP?.[dayDataIdx]?.value || '--',
                                        });
                                    }

                                    return (
                                        <table className="weekly-table">
                                            <thead>
                                                <tr>
                                                    <th className="row-header"></th>
                                                    {days.map((day, idx) => (
                                                        <th key={idx} className={day.isWeekend ? 'weekend' : ''}>
                                                            <div className="date-header">{day.dateStr}</div>
                                                            <div className="weekday-header">{day.weekday}</div>
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <td className="row-label">白天</td>
                                                    {days.map((day, idx) => (
                                                        <td key={idx} className={day.isWeekend ? 'weekend' : ''}>
                                                            <div className="weather-cell">
                                                                <span className="cell-wx">{day.dayWx}</span>
                                                                <span className="cell-temp">{day.dayMinT} - {day.dayMaxT}°C</span>
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr>
                                                    <td className="row-label">晚上</td>
                                                    {days.map((day, idx) => (
                                                        <td key={idx} className={day.isWeekend ? 'weekend' : ''}>
                                                            <div className="weather-cell">
                                                                <span className="cell-wx">{day.nightWx}</span>
                                                                <span className="cell-temp">{day.nightMinT} - {day.nightMaxT}°C</span>
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                                <tr>
                                                    <td className="row-label">降雨機率</td>
                                                    {days.map((day, idx) => (
                                                        <td key={idx} className={day.isWeekend ? 'weekend' : ''}>
                                                            <div className="weather-cell pop-cell">
                                                                <span className="cell-pop">{day.dayPop}%</span>
                                                            </div>
                                                        </td>
                                                    ))}
                                                </tr>
                                            </tbody>
                                        </table>
                                    );
                                })()}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* 海面天氣 */}
            {!loading && activeTab === 'marine' && marineForecast.length === 0 && !error && (
                <EmptyState icon={CloudOff} variant="minimal" title="尚無海面天氣資料" />
            )}
            {!loading && activeTab === 'marine' && marineForecast.length > 0 && (
                <div className="forecast-section">
                    <h2>海面天氣預報</h2>
                    <div className="marine-grid">
                        {marineForecast.map((region: MarineRegion, idx: number) => (
                            <div key={idx} className="marine-card">
                                <h3>{region.region}</h3>
                                <div className="marine-details">
                                    <div className="detail-row">
                                        <span>風向</span>
                                        <span>{region.wind || '-'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>風速</span>
                                        <span>{region.windSpeed || '-'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>海況</span>
                                        <span>{region.seaCondition || '-'}</span>
                                    </div>
                                    <div className="detail-row">
                                        <span>浪高</span>
                                        <span>{region.waveHeight || '-'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 潮汐預報 */}
            {!loading && activeTab === 'tide' && tideForecast.length === 0 && !error && (
                <EmptyState icon={CloudOff} variant="minimal" title="尚無潮汐預報資料" />
            )}
            {!loading && activeTab === 'tide' && tideForecast.length > 0 && (
                <div className="forecast-section">
                    <h2>潮汐預報（未來一個月）</h2>
                    <div className="tide-grid">
                        {tideForecast.slice(0, 6).map((station: TideStation, idx: number) => (
                            <div key={idx} className="tide-card">
                                <h3>{station.station}</h3>
                                {station.forecasts && station.forecasts.slice(0, 3).map((day: TideForecast, dIdx: number) => (
                                    <div key={dIdx} className="tide-day">
                                        <div className="tide-date">{day.date}</div>
                                        <div className="tide-events">
                                            {day.tides && day.tides.map((tide: TideEvent, tIdx: number) => (
                                                <span key={tIdx} className={`tide-event ${tide.type}`}>
                                                    {tide.type === 'high' ? <ChevronUpIcon size={12} /> : <ChevronDownIcon size={12} />}
                                                    {new Date(tide.time).toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit' })}
                                                    ({tide.height}cm)
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 登山天氣 */}
            {!loading && activeTab === 'mountain' && mountainForecast.length === 0 && !error && (
                <EmptyState icon={CloudOff} variant="minimal" title="尚無登山天氣資料" />
            )}
            {!loading && activeTab === 'mountain' && mountainForecast.length > 0 && (
                <div className="forecast-section">
                    <h2>登山天氣預報（一週）</h2>
                    <div className="recreational-grid">
                        {mountainForecast.slice(0, 12).map((location: RecreationalLocation, idx: number) => (
                            <div key={idx} className="recreational-card">
                                <h3>{location.locationName}</h3>
                                <div className="forecast-list">
                                    {location.forecasts && location.forecasts.slice(0, 3).map((f: DailyForecast, fIdx: number) => (
                                        <div key={fIdx} className="forecast-item">
                                            <span className="date">{f.date}</span>
                                            <span className="weather">{f.weather || '-'}</span>
                                            <span className="temp">{f.minTemp}~{f.maxTemp}°C</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 風景區預報 */}
            {!loading && activeTab === 'scenic' && scenicForecast.length === 0 && !error && (
                <EmptyState icon={CloudOff} variant="minimal" title="尚無風景區預報資料" />
            )}
            {!loading && activeTab === 'scenic' && scenicForecast.length > 0 && (
                <div className="forecast-section">
                    <h2>國家風景區預報（一週）</h2>
                    <div className="recreational-grid">
                        {scenicForecast.slice(0, 12).map((location: RecreationalLocation, idx: number) => (
                            <div key={idx} className="recreational-card">
                                <h3>{location.locationName}</h3>
                                <div className="forecast-list">
                                    {location.forecasts && location.forecasts.slice(0, 3).map((f: DailyForecast, fIdx: number) => (
                                        <div key={fIdx} className="forecast-item">
                                            <span className="date">{f.date}</span>
                                            <span className="weather">{f.weather || '-'}</span>
                                            <span className="temp">{f.minTemp}~{f.maxTemp}°C</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 農場旅遊預報 */}
            {!loading && activeTab === 'farm' && farmForecast.length === 0 && !error && (
                <EmptyState icon={CloudOff} variant="minimal" title="尚無農場旅遊預報資料" />
            )}
            {!loading && activeTab === 'farm' && farmForecast.length > 0 && (
                <div className="forecast-section">
                    <h2>農場旅遊預報（一週）</h2>
                    <div className="recreational-grid">
                        {farmForecast.slice(0, 12).map((location: RecreationalLocation, idx: number) => (
                            <div key={idx} className="recreational-card">
                                <h3>{location.locationName}</h3>
                                <div className="forecast-list">
                                    {location.forecasts && location.forecasts.slice(0, 3).map((f: DailyForecast, fIdx: number) => (
                                        <div key={fIdx} className="forecast-item">
                                            <span className="date">{f.date}</span>
                                            <span className="weather">{f.weather || '-'}</span>
                                            <span className="temp">{f.minTemp}~{f.maxTemp}°C</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 頁尾資訊 */}
            <div className="forecast-footer">
                <p>資料來源：中央氣象署 OpenData</p>
                <p>更新時間：{new Date().toLocaleString('zh-TW')}</p>
            </div>
        </div>
    );
}
