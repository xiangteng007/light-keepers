/**
 * Central Weather Administration (CWA) Provider
 * 
 * Integration with Taiwan's Central Weather Admin Open Data API
 * https://opendata.cwa.gov.tw/
 * 
 * v1.0
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface WeatherObservation {
    stationId: string;
    stationName: string;
    city: string;
    township?: string;
    latitude: number;
    longitude: number;
    observeTime: Date;
    weather: string;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    rainfall: number;
    pressure: number;
}

export interface WeatherForecast {
    locationName: string;
    startTime: Date;
    endTime: Date;
    temperature: { min: number; max: number };
    weather: string;
    probabilityOfPrecipitation: number;
    comfort: string;
    windSpeed: string;
}

export interface RadarImage {
    timestamp: Date;
    imageUrl: string;
    type: 'radar' | 'satellite' | 'rainfall';
}

export interface WeatherAlert {
    id: string;
    type: string;
    title: string;
    description: string;
    affectedAreas: string[];
    startTime: Date;
    endTime?: Date;
    severity: 'advisory' | 'watch' | 'warning';
    source: string;
}

@Injectable()
export class CwaProvider implements OnModuleInit {
    private readonly logger = new Logger(CwaProvider.name);
    private readonly apiKey: string;
    private readonly baseUrl = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';

    // Data IDs for different APIs
    private readonly DATA_IDS = {
        CURRENT_WEATHER: 'O-A0001-001',      // 現在天氣觀測報告
        FORECAST_36H: 'F-C0032-001',          // 36小時天氣預報
        FORECAST_7DAY: 'F-D0047-091',         // 7天縣市預報
        RAINFALL_HOURLY: 'O-A0002-001',       // 自動雨量站資料
        TYPHOON_INFO: 'W-C0034-001',          // 颱風消息
        EARTHQUAKE: 'E-A0015-001',            // 地震報告
        WEATHER_WARNING: 'W-C0033-001',       // 天氣警特報
    };

    private cachedObservations: WeatherObservation[] = [];
    private cachedForecasts: Map<string, WeatherForecast[]> = new Map();
    private cachedAlerts: WeatherAlert[] = [];
    private lastFetchTime: Date | null = null;

    constructor(
        private readonly configService: ConfigService,
        private readonly eventEmitter: EventEmitter2,
    ) {
        this.apiKey = this.configService.get<string>('CWA_API_KEY', '');
    }

    onModuleInit() {
        if (!this.apiKey) {
            this.logger.warn('CWA_API_KEY not configured, using mock data');
        } else {
            this.logger.log('CWA Provider initialized');
            // Initial fetch
            this.fetchAllData().catch(err =>
                this.logger.error(`Initial CWA fetch failed: ${err.message}`)
            );
        }
    }

    /**
     * Get current weather observations
     */
    async getCurrentWeather(city?: string): Promise<WeatherObservation[]> {
        if (!this.apiKey) {
            return this.getMockObservations(city);
        }

        if (this.shouldRefreshCache()) {
            await this.fetchCurrentWeather();
        }

        if (city) {
            return this.cachedObservations.filter(obs => obs.city === city);
        }
        return this.cachedObservations;
    }

    /**
     * Get weather forecast for a location
     */
    async getForecast(locationName: string): Promise<WeatherForecast[]> {
        if (!this.apiKey) {
            return this.getMockForecast(locationName);
        }

        if (!this.cachedForecasts.has(locationName)) {
            await this.fetchForecast(locationName);
        }

        return this.cachedForecasts.get(locationName) || [];
    }

    /**
     * Get active weather alerts
     */
    async getWeatherAlerts(): Promise<WeatherAlert[]> {
        if (!this.apiKey) {
            return this.getMockAlerts();
        }

        await this.fetchWeatherAlerts();
        return this.cachedAlerts;
    }

    /**
     * Get radar/satellite imagery URLs
     */
    async getRadarImages(): Promise<RadarImage[]> {
        const now = new Date();
        // CWA provides radar images at fixed URLs
        return [
            {
                timestamp: now,
                imageUrl: 'https://www.cwa.gov.tw/V8/C/W/OBS_Radar.html',
                type: 'radar',
            },
            {
                timestamp: now,
                imageUrl: 'https://www.cwa.gov.tw/V8/C/W/OBS_Sat.html',
                type: 'satellite',
            },
        ];
    }

    /**
     * Fetch current weather from CWA API
     */
    private async fetchCurrentWeather(): Promise<void> {
        try {
            const url = `${this.baseUrl}/${this.DATA_IDS.CURRENT_WEATHER}?Authorization=${this.apiKey}&format=JSON`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const records = data.records?.location || [];

            this.cachedObservations = records.map((loc: any) => ({
                stationId: loc.stationId,
                stationName: loc.locationName,
                city: this.extractCity(loc.parameter),
                latitude: parseFloat(loc.lat),
                longitude: parseFloat(loc.lon),
                observeTime: new Date(loc.time?.obsTime),
                weather: this.extractElement(loc.weatherElement, 'Weather'),
                temperature: this.extractElementValue(loc.weatherElement, 'TEMP'),
                humidity: this.extractElementValue(loc.weatherElement, 'HUMD') * 100,
                windSpeed: this.extractElementValue(loc.weatherElement, 'WDSD'),
                windDirection: this.extractElement(loc.weatherElement, 'WDIR'),
                rainfall: this.extractElementValue(loc.weatherElement, 'H_24R'),
                pressure: this.extractElementValue(loc.weatherElement, 'PRES'),
            }));

            this.lastFetchTime = new Date();
            this.logger.log(`Fetched ${this.cachedObservations.length} weather observations`);
        } catch (error: any) {
            this.logger.error(`Failed to fetch weather data: ${error.message}`);
        }
    }

    /**
     * Fetch forecast data
     */
    private async fetchForecast(locationName: string): Promise<void> {
        try {
            const url = `${this.baseUrl}/${this.DATA_IDS.FORECAST_36H}?Authorization=${this.apiKey}&format=JSON&locationName=${encodeURIComponent(locationName)}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const locations = data.records?.location || [];

            if (locations.length > 0) {
                const location = locations[0];
                const weatherElements = location.weatherElement || [];

                const forecasts: WeatherForecast[] = [];
                const times = weatherElements[0]?.time || [];

                times.forEach((time: any, index: number) => {
                    forecasts.push({
                        locationName: location.locationName,
                        startTime: new Date(time.startTime),
                        endTime: new Date(time.endTime),
                        weather: this.getWeatherElementValue(weatherElements, 'Wx', index),
                        temperature: {
                            min: parseInt(this.getWeatherElementValue(weatherElements, 'MinT', index) || '0'),
                            max: parseInt(this.getWeatherElementValue(weatherElements, 'MaxT', index) || '0'),
                        },
                        probabilityOfPrecipitation: parseInt(this.getWeatherElementValue(weatherElements, 'PoP', index) || '0'),
                        comfort: this.getWeatherElementValue(weatherElements, 'CI', index),
                        windSpeed: '',
                    });
                });

                this.cachedForecasts.set(locationName, forecasts);
            }
        } catch (error: any) {
            this.logger.error(`Failed to fetch forecast: ${error.message}`);
        }
    }

    /**
     * Fetch weather alerts
     */
    private async fetchWeatherAlerts(): Promise<void> {
        try {
            const url = `${this.baseUrl}/${this.DATA_IDS.WEATHER_WARNING}?Authorization=${this.apiKey}&format=JSON`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const data = await response.json();
            const records = data.records?.record || [];

            const newAlerts: WeatherAlert[] = records.map((rec: any) => ({
                id: rec.dataid,
                type: rec.typename || 'weather',
                title: rec.headline || '',
                description: rec.content || '',
                affectedAreas: rec.affectedAreas || [],
                startTime: new Date(rec.startTime || Date.now()),
                endTime: rec.endTime ? new Date(rec.endTime) : undefined,
                severity: this.mapSeverity(rec.severity),
                source: 'CWA',
            }));

            // Check for new alerts
            const newAlertIds = newAlerts.map(a => a.id);
            const previousIds = this.cachedAlerts.map(a => a.id);

            newAlerts.forEach(alert => {
                if (!previousIds.includes(alert.id)) {
                    this.eventEmitter.emit('weather.alert', alert);
                    this.logger.warn(`New weather alert: ${alert.title}`);
                }
            });

            this.cachedAlerts = newAlerts;
        } catch (error: any) {
            this.logger.error(`Failed to fetch alerts: ${error.message}`);
        }
    }

    // ===== Helper Methods =====

    private shouldRefreshCache(): boolean {
        if (!this.lastFetchTime) return true;
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        return this.lastFetchTime < fiveMinutesAgo;
    }

    private extractCity(params: any[]): string {
        const cityParam = params?.find((p: any) => p.parameterName === 'CITY');
        return cityParam?.parameterValue || '';
    }

    private extractElement(elements: any[], name: string): string {
        const el = elements?.find((e: any) => e.elementName === name);
        return el?.elementValue || '';
    }

    private extractElementValue(elements: any[], name: string): number {
        const el = elements?.find((e: any) => e.elementName === name);
        return parseFloat(el?.elementValue || '0');
    }

    private getWeatherElementValue(elements: any[], name: string, timeIndex: number): string {
        const el = elements.find((e: any) => e.elementName === name);
        return el?.time?.[timeIndex]?.parameter?.parameterName || '';
    }

    private mapSeverity(severity: string): 'advisory' | 'watch' | 'warning' {
        if (severity?.includes('警報')) return 'warning';
        if (severity?.includes('特報')) return 'watch';
        return 'advisory';
    }

    // ===== Mock Data =====

    private getMockObservations(city?: string): WeatherObservation[] {
        const mockData: WeatherObservation[] = [
            {
                stationId: 'C0A730',
                stationName: '臺北',
                city: '臺北市',
                latitude: 25.0375,
                longitude: 121.5142,
                observeTime: new Date(),
                weather: '多雲',
                temperature: 22,
                humidity: 75,
                windSpeed: 3.5,
                windDirection: 'ENE',
                rainfall: 0,
                pressure: 1015.2,
            },
            {
                stationId: 'C0F9M0',
                stationName: '高雄',
                city: '高雄市',
                latitude: 22.6273,
                longitude: 120.3014,
                observeTime: new Date(),
                weather: '晴',
                temperature: 28,
                humidity: 65,
                windSpeed: 2.8,
                windDirection: 'WSW',
                rainfall: 0,
                pressure: 1012.5,
            },
            {
                stationId: 'C0G750',
                stationName: '臺中',
                city: '臺中市',
                latitude: 24.1457,
                longitude: 120.6848,
                observeTime: new Date(),
                weather: '晴',
                temperature: 25,
                humidity: 70,
                windSpeed: 2.2,
                windDirection: 'N',
                rainfall: 0,
                pressure: 1014.0,
            },
        ];

        if (city) {
            return mockData.filter(obs => obs.city === city);
        }
        return mockData;
    }

    private getMockForecast(locationName: string): WeatherForecast[] {
        const now = new Date();
        return [
            {
                locationName,
                startTime: now,
                endTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
                weather: '多雲時晴',
                temperature: { min: 20, max: 26 },
                probabilityOfPrecipitation: 10,
                comfort: '舒適',
                windSpeed: '偏北風 3-4 級',
            },
            {
                locationName,
                startTime: new Date(now.getTime() + 12 * 60 * 60 * 1000),
                endTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                weather: '多雲',
                temperature: { min: 18, max: 23 },
                probabilityOfPrecipitation: 20,
                comfort: '舒適',
                windSpeed: '偏北風 2-3 級',
            },
            {
                locationName,
                startTime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
                endTime: new Date(now.getTime() + 36 * 60 * 60 * 1000),
                weather: '陰有短暫雨',
                temperature: { min: 17, max: 21 },
                probabilityOfPrecipitation: 60,
                comfort: '稍有涼意',
                windSpeed: '東北風 4-5 級',
            },
        ];
    }

    private getMockAlerts(): WeatherAlert[] {
        return [
            {
                id: 'mock-alert-1',
                type: '豪雨特報',
                title: '豪雨特報 - 北部地區',
                description: '受東北季風及華南雲雨區東移影響，今(13)日北部地區有局部大雨發生的機率',
                affectedAreas: ['臺北市', '新北市', '基隆市'],
                startTime: new Date(),
                severity: 'watch',
                source: 'CWA (Mock)',
            },
        ];
    }

    // ===== Scheduled Tasks =====

    @Cron(CronExpression.EVERY_10_MINUTES)
    async fetchAllData(): Promise<void> {
        if (!this.apiKey) return;

        await Promise.all([
            this.fetchCurrentWeather(),
            this.fetchWeatherAlerts(),
        ]);
    }
}
