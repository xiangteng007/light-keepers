/**
 * CWA Weather Service
 * Integrates with Taiwan Central Weather Administration (CWA) API
 * Provides real-time weather data and forecasts for disaster response
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CacheService } from '../cache/cache.service';

export interface WeatherData {
    location: string;
    observationTime: Date;
    weather: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    rainfall: number;
    pressure: number;
}

export interface WeatherForecast {
    location: string;
    forecastTime: Date;
    weather: string;
    temperatureMin: number;
    temperatureMax: number;
    rainProbability: number;
    comfort: string;
}

export interface WeatherAlert {
    id: string;
    type: string;
    severity: 'advisory' | 'watch' | 'warning';
    title: string;
    description: string;
    affectedAreas: string[];
    effectiveTime: Date;
    expiryTime: Date;
    issuer: string;
}

@Injectable()
export class CwaWeatherService {
    private readonly logger = new Logger(CwaWeatherService.name);
    private readonly baseUrl = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
    private readonly apiKey: string;

    constructor(
        private configService: ConfigService,
        private cache: CacheService,
    ) {
        this.apiKey = this.configService.get<string>('CWA_API_KEY') || '';
    }

    /**
     * Get current weather for a city/town
     */
    async getCurrentWeather(location: string): Promise<WeatherData | null> {
        const cacheKey = `weather:current:${location}`;
        const cached = await this.cache.get<WeatherData>(cacheKey);
        if (cached) return cached;

        try {
            if (!this.apiKey) {
                this.logger.warn('CWA API key not configured');
                return this.getMockWeatherData(location);
            }

            // O-A0001-001 = 自動氣象站觀測資料
            const url = `${this.baseUrl}/O-A0001-001?Authorization=${this.apiKey}&format=JSON&locationName=${encodeURIComponent(location)}`;

            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) {
                throw new Error(`CWA API error: ${response.status}`);
            }

            const data = await response.json();
            const station = data.records?.Station?.[0];

            if (!station) {
                return null;
            }

            const weather: WeatherData = {
                location: station.StationName || location,
                observationTime: new Date(station.ObsTime?.DateTime || Date.now()),
                weather: station.WeatherElement?.Weather || '晴',
                temperature: parseFloat(station.WeatherElement?.AirTemperature) || 25,
                humidity: parseFloat(station.WeatherElement?.RelativeHumidity) || 60,
                windSpeed: parseFloat(station.WeatherElement?.WindSpeed) || 0,
                windDirection: station.WeatherElement?.WindDirection || 'N',
                rainfall: parseFloat(station.WeatherElement?.Now?.Precipitation) || 0,
                pressure: parseFloat(station.WeatherElement?.AirPressure) || 1013,
            };

            await this.cache.set(cacheKey, weather, { ttl: 600 }); // 10 min cache
            return weather;
        } catch (error) {
            this.logger.error(`Failed to fetch weather for ${location}`, error);
            return this.getMockWeatherData(location);
        }
    }

    /**
     * Get 7-day forecast for a city
     */
    async getForecast(city: string, days: number = 7): Promise<WeatherForecast[]> {
        const cacheKey = `weather:forecast:${city}:${days}`;
        const cached = await this.cache.get<WeatherForecast[]>(cacheKey);
        if (cached) return cached;

        try {
            if (!this.apiKey) {
                return this.getMockForecast(city, days);
            }

            // F-D0047-091 = 全臺各縣市一週天氣預報
            const url = `${this.baseUrl}/F-D0047-091?Authorization=${this.apiKey}&format=JSON&locationName=${encodeURIComponent(city)}`;

            const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
            if (!response.ok) {
                throw new Error(`CWA forecast API error: ${response.status}`);
            }

            const data = await response.json();
            const locationData = data.records?.Locations?.[0]?.Location?.[0];

            if (!locationData) {
                return [];
            }

            const forecasts: WeatherForecast[] = [];
            const weatherElement = locationData.WeatherElement || [];

            // Parse time periods
            const wxElement = weatherElement.find((e: any) => e.ElementName === 'Wx');
            const mintElement = weatherElement.find((e: any) => e.ElementName === 'MinT');
            const maxtElement = weatherElement.find((e: any) => e.ElementName === 'MaxT');
            const popElement = weatherElement.find((e: any) => e.ElementName === 'PoP12h');

            if (wxElement?.Time) {
                for (let i = 0; i < Math.min(wxElement.Time.length, days * 2); i++) {
                    const timeData = wxElement.Time[i];
                    forecasts.push({
                        location: city,
                        forecastTime: new Date(timeData.StartTime),
                        weather: timeData.ElementValue?.[0]?.Weather || '晴',
                        temperatureMin: parseFloat(mintElement?.Time?.[i]?.ElementValue?.[0]?.Temperature) || 20,
                        temperatureMax: parseFloat(maxtElement?.Time?.[i]?.ElementValue?.[0]?.Temperature) || 30,
                        rainProbability: parseInt(popElement?.Time?.[Math.floor(i / 2)]?.ElementValue?.[0]?.Value) || 0,
                        comfort: '舒適',
                    });
                }
            }

            await this.cache.set(cacheKey, forecasts, { ttl: 3600 }); // 1 hour cache
            return forecasts;
        } catch (error) {
            this.logger.error(`Failed to fetch forecast for ${city}`, error);
            return this.getMockForecast(city, days);
        }
    }

    /**
     * Get active weather alerts
     */
    async getActiveAlerts(): Promise<WeatherAlert[]> {
        const cacheKey = 'weather:alerts:active';
        const cached = await this.cache.get<WeatherAlert[]>(cacheKey);
        if (cached) return cached;

        try {
            if (!this.apiKey) {
                return [];
            }

            // W-C0033-001 = 天氣警特報
            const url = `${this.baseUrl}/W-C0033-001?Authorization=${this.apiKey}&format=JSON`;

            const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
            if (!response.ok) {
                throw new Error(`CWA alerts API error: ${response.status}`);
            }

            const data = await response.json();
            const records = data.records?.Record || [];

            const alerts: WeatherAlert[] = records.map((record: any) => ({
                id: record.DatasetInfo?.DatasetId || `alert-${Date.now()}`,
                type: record.Hazards?.Hazard?.Info?.Phenomena || '天氣警報',
                severity: this.mapSeverity(record.Hazards?.Hazard?.Info?.Significance),
                title: record.ContentText?.Title || '天氣警報',
                description: record.ContentText?.Content || '',
                affectedAreas: record.AffectedAreas?.Location?.map((l: any) => l.LocationName) || [],
                effectiveTime: new Date(record.DatasetInfo?.IssueTime || Date.now()),
                expiryTime: new Date(record.DatasetInfo?.ValidTo || Date.now() + 86400000),
                issuer: '中央氣象署',
            }));

            await this.cache.set(cacheKey, alerts, { ttl: 300 }); // 5 min cache
            return alerts;
        } catch (error) {
            this.logger.error('Failed to fetch weather alerts', error);
            return [];
        }
    }

    /**
     * Sync alerts periodically
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async syncAlerts(): Promise<void> {
        this.logger.debug('Syncing weather alerts...');
        await this.getActiveAlerts();
    }

    // ==================== Private Helpers ====================

    private mapSeverity(significance: string): 'advisory' | 'watch' | 'warning' {
        if (significance?.includes('警報')) return 'warning';
        if (significance?.includes('特報')) return 'watch';
        return 'advisory';
    }

    private getMockWeatherData(location: string): WeatherData {
        return {
            location,
            observationTime: new Date(),
            weather: '多雲',
            temperature: 25 + Math.random() * 5,
            humidity: 60 + Math.random() * 20,
            windSpeed: Math.random() * 10,
            windDirection: 'N',
            rainfall: 0,
            pressure: 1013,
        };
    }

    private getMockForecast(city: string, days: number): WeatherForecast[] {
        const forecasts: WeatherForecast[] = [];
        const weathers = ['晴', '多雲', '陰', '小雨', '多雲時晴'];

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() + i);

            forecasts.push({
                location: city,
                forecastTime: date,
                weather: weathers[Math.floor(Math.random() * weathers.length)],
                temperatureMin: 20 + Math.random() * 5,
                temperatureMax: 28 + Math.random() * 5,
                rainProbability: Math.floor(Math.random() * 60),
                comfort: '舒適',
            });
        }

        return forecasts;
    }

    /**
     * Check if API is configured
     */
    isConfigured(): boolean {
        return !!this.apiKey;
    }
}
