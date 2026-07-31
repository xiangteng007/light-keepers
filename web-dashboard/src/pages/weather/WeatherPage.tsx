/**
 * Weather Dashboard Page
 * Real-time weather data and alerts visualization
 */

import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { getApiErrorMessage } from '../../api/errors';
import './WeatherPage.css';

interface WeatherData {
    location: string;
    temperature: number;
    humidity: number;
    rainfall: number;
    windSpeed: number;
    description: string;
    updatedAt: string;
}

interface WeatherAlert {
    id: string;
    type: string;
    severity: 'advisory' | 'watch' | 'warning';
    title: string;
    description: string;
    affectedAreas: string[];
}

interface WeatherForecast {
    time: string;
    temperature: { min: number; max: number };
    pop: number;
    description: string;
}

const WeatherPage: React.FC = () => {
    const [currentWeather, setCurrentWeather] = useState<WeatherData[]>([]);
    const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
    const [forecasts, setForecasts] = useState<WeatherForecast[]>([]);
    const [selectedLocation, setSelectedLocation] = useState('臺北');
    const [loading, setLoading] = useState(true);

    const locations = ['臺北', '臺中', '高雄', '新北', '桃園'];

    useEffect(() => {
        loadWeatherData();
        loadAlerts();
    }, []);

    useEffect(() => {
        loadForecast(selectedLocation);
    }, [selectedLocation]);

    const loadWeatherData = async () => {
        try {
            const response = await api.get('/weather/current');
            setCurrentWeather(response.data.data || []);
        } catch (error) {
            console.error('Failed to load weather:', getApiErrorMessage(error, '無法載入天氣資料'));
        } finally {
            setLoading(false);
        }
    };

    const loadAlerts = async () => {
        try {
            const response = await api.get('/weather/alerts');
            setAlerts(response.data.data || []);
        } catch (error) {
            console.error('Failed to load alerts:', getApiErrorMessage(error, '無法載入天氣警報'));
        }
    };

    const loadForecast = async (location: string) => {
        try {
            const response = await api.get(`/weather/forecast/${encodeURIComponent(location)}`);
            setForecasts(response.data.data?.forecasts || []);
        } catch (error) {
            console.error('Failed to load forecast:', getApiErrorMessage(error, '無法載入天氣預報'));
        }
    };

    const triggerSync = async () => {
        setLoading(true);
        try {
            await api.get('/weather/sync');
            await loadWeatherData();
            await loadAlerts();
        } catch (error) {
            console.error('Sync failed:', getApiErrorMessage(error, '同步天氣資料失敗'));
        } finally {
            setLoading(false);
        }
    };

    const getWeatherIcon = (description: string) => {
        if (description.includes('雨')) return '🌧️';
        if (description.includes('雲')) return '☁️';
        if (description.includes('晴')) return '☀️';
        return '🌤️';
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'warning': return '#dc2626';
            case 'watch': return '#f59e0b';
            default: return '#3b82f6';
        }
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-TW', { weekday: 'short', month: 'short', day: 'numeric' });
    };

    if (loading) {
        return <div className="weather-loading">載入氣象資料中...</div>;
    }

    return (
        <div className="weather-page">
            <header className="weather-header">
                <h1>🌤️ 氣象資訊</h1>
                <button className="sync-btn" onClick={triggerSync}>
                    🔄 更新資料
                </button>
            </header>

            {/* Active Alerts */}
            {alerts.length > 0 && (
                <section className="alerts-section">
                    <h2>⚠️ 天氣警報</h2>
                    <div className="alerts-list">
                        {alerts.map(alert => (
                            <div
                                key={alert.id}
                                className="alert-card"
                                style={{ borderLeftColor: getSeverityColor(alert.severity) }}
                            >
                                <div className="alert-header">
                                    <span
                                        className="severity-badge"
                                        style={{ backgroundColor: getSeverityColor(alert.severity) }}
                                    >
                                        {alert.severity === 'warning' ? '警報' :
                                            alert.severity === 'watch' ? '注意' : '提醒'}
                                    </span>
                                    <span className="alert-type">{alert.type}</span>
                                </div>
                                <h3>{alert.title}</h3>
                                <p>{alert.description}</p>
                                {alert.affectedAreas.length > 0 && (
                                    <div className="affected-areas">
                                        影響地區：{alert.affectedAreas.join('、')}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Current Weather */}
            <section className="current-section">
                <h2>📍 目前天氣</h2>
                <div className="weather-grid">
                    {currentWeather.slice(0, 6).map(weather => (
                        <div
                            key={weather.location}
                            className={`weather-card ${selectedLocation === weather.location ? 'selected' : ''}`}
                            onClick={() => setSelectedLocation(weather.location)}
                        >
                            <div className="weather-icon">
                                {getWeatherIcon(weather.description)}
                            </div>
                            <h3>{weather.location}</h3>
                            <div className="temperature">
                                {Math.round(weather.temperature)}°C
                            </div>
                            <div className="weather-details">
                                <span>💧 {weather.humidity}%</span>
                                <span>💨 {weather.windSpeed} m/s</span>
                            </div>
                            <div className="description">{weather.description}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* 7-Day Forecast */}
            <section className="forecast-section">
                <h2>📅 {selectedLocation} 七日預報</h2>
                <div className="location-tabs">
                    {locations.map(loc => (
                        <button
                            key={loc}
                            className={selectedLocation === loc ? 'active' : ''}
                            onClick={() => setSelectedLocation(loc)}
                        >
                            {loc}
                        </button>
                    ))}
                </div>
                <div className="forecast-list">
                    {forecasts.map((forecast, index) => (
                        <div key={index} className="forecast-item">
                            <div className="forecast-day">
                                {formatDate(forecast.time)}
                            </div>
                            <div className="forecast-icon">
                                {getWeatherIcon(forecast.description)}
                            </div>
                            <div className="forecast-temp">
                                <span className="high">{forecast.temperature.max}°</span>
                                <span className="low">{forecast.temperature.min}°</span>
                            </div>
                            <div className="forecast-rain">
                                🌧️ {forecast.pop}%
                            </div>
                            <div className="forecast-desc">
                                {forecast.description}
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Quick Links */}
            <section className="quick-links">
                <a href="https://www.cwa.gov.tw" target="_blank" rel="noopener noreferrer">
                    🌐 中央氣象署
                </a>
                <a href="https://www.ncdr.nat.gov.tw" target="_blank" rel="noopener noreferrer">
                    🏛️ 國家災害防救科技中心
                </a>
            </section>
        </div>
    );
};

export default WeatherPage;
