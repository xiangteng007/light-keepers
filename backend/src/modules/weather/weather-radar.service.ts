import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Weather Radar Service
 * Integration with Central Weather Administration (CWA) Taiwan
 */
@Injectable()
export class WeatherRadarService {
    private readonly logger = new Logger(WeatherRadarService.name);

    private readonly CWA_API_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';

    // Cached data
    private radarCache: Map<string, CachedData> = new Map();
    private alertsCache: WeatherAlert[] = [];
    private debrisFlowCache: DebrisFlowWarning[] = [];

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Get current weather for location
     */
    async getCurrentWeather(location: { lat: number; lng: number }): Promise<WeatherData> {
        const apiKey = this.configService.get<string>('CWA_API_KEY');

        if (!apiKey) {
            // Return mock data if no API key
            return this.getMockWeatherData(location);
        }

        try {
            const response = await fetch(
                `${this.CWA_API_BASE}/O-A0003-001?Authorization=${apiKey}&format=JSON`,
            );
            const data = await response.json();

            // Find nearest station
            const nearest = this.findNearestStation(location, data.records?.Station || []);

            return this.parseWeatherData(nearest);
        } catch (error) {
            this.logger.error('Failed to fetch weather data', error);
            return this.getMockWeatherData(location);
        }
    }

    /**
     * Get rainfall forecast
     */
    async getRainfallForecast(locationName: string): Promise<RainfallForecast[]> {
        const apiKey = this.configService.get<string>('CWA_API_KEY');

        if (!apiKey) {
            return this.getMockRainfallForecast();
        }

        try {
            const response = await fetch(
                `${this.CWA_API_BASE}/F-D0047-091?Authorization=${apiKey}&format=JSON&locationName=${encodeURIComponent(locationName)}`,
            );
            const data = await response.json();

            return this.parseRainfallForecast(data);
        } catch (error) {
            this.logger.error('Failed to fetch rainfall forecast', error);
            return this.getMockRainfallForecast();
        }
    }

    /**
     * Get debris flow warnings
     */
    async getDebrisFlowWarnings(): Promise<DebrisFlowWarning[]> {
        const apiKey = this.configService.get<string>('CWA_API_KEY');

        if (!apiKey) {
            return this.getMockDebrisFlowWarnings();
        }

        try {
            // Simulate debris flow API (SWCB - Soil and Water Conservation Bureau)
            const response = await fetch(
                `https://246.swcb.gov.tw/OpenData/api/debris?format=json`,
            );
            const data = await response.json();

            this.debrisFlowCache = this.parseDebrisFlowData(data);
            return this.debrisFlowCache;
        } catch (error) {
            this.logger.error('Failed to fetch debris flow warnings', error);
            return this.getMockDebrisFlowWarnings();
        }
    }

    /**
     * Get weather alerts for region
     */
    async getWeatherAlerts(region?: string): Promise<WeatherAlert[]> {
        const apiKey = this.configService.get<string>('CWA_API_KEY');

        if (!apiKey) {
            return this.getMockAlerts();
        }

        try {
            const response = await fetch(
                `${this.CWA_API_BASE}/W-C0033-001?Authorization=${apiKey}&format=JSON`,
            );
            const data = await response.json();

            let alerts = this.parseAlertData(data);

            if (region) {
                alerts = alerts.filter((a) =>
                    a.affectedAreas.some((area) => area.includes(region)),
                );
            }

            this.alertsCache = alerts;

            // Emit events for new critical alerts
            alerts.filter((a) => a.severity === 'extreme' || a.severity === 'severe')
                .forEach((alert) => {
                    this.eventEmitter.emit('weather.alert.critical', alert);
                });

            return alerts;
        } catch (error) {
            this.logger.error('Failed to fetch weather alerts', error);
            return this.getMockAlerts();
        }
    }

    /**
     * Get radar image tiles for map overlay
     */
    async getRadarTiles(): Promise<RadarTile[]> {
        // Return radar tile URLs for map overlay
        const baseTime = new Date();
        baseTime.setMinutes(Math.floor(baseTime.getMinutes() / 10) * 10);

        const tiles: RadarTile[] = [];

        // Generate tile URLs for Taiwan radar coverage
        for (let i = 0; i < 6; i++) {
            const time = new Date(baseTime.getTime() - i * 10 * 60 * 1000);
            tiles.push({
                timestamp: time,
                url: `https://opendata.cwa.gov.tw/fileapi/v1/opendataapi/O-A0058-003?format=image`,
                bounds: {
                    north: 26.5,
                    south: 21.5,
                    east: 122.5,
                    west: 119.0,
                },
            });
        }

        return tiles;
    }

    /**
     * Subscribe to weather updates for location
     */
    subscribeToUpdates(
        locationId: string,
        location: { lat: number; lng: number },
        callback: (data: WeatherData) => void,
    ): () => void {
        const intervalId = setInterval(async () => {
            const data = await this.getCurrentWeather(location);
            callback(data);
        }, 10 * 60 * 1000); // 10 minutes

        return () => clearInterval(intervalId);
    }

    // Helper methods
    private findNearestStation(
        location: { lat: number; lng: number },
        stations: any[],
    ): any {
        let nearest = stations[0];
        let minDist = Infinity;

        for (const station of stations) {
            const lat = parseFloat(station.StationLatitude);
            const lng = parseFloat(station.StationLongitude);
            const dist = Math.pow(location.lat - lat, 2) + Math.pow(location.lng - lng, 2);

            if (dist < minDist) {
                minDist = dist;
                nearest = station;
            }
        }

        return nearest;
    }

    private parseWeatherData(station: any): WeatherData {
        if (!station) {
            return this.getMockWeatherData({ lat: 25.0, lng: 121.5 });
        }

        const obs = station.WeatherElement || {};

        return {
            location: station.StationName || 'Unknown',
            timestamp: new Date(),
            temperature: parseFloat(obs.AirTemperature) || 25,
            humidity: parseFloat(obs.RelativeHumidity) || 70,
            windSpeed: parseFloat(obs.WindSpeed) || 5,
            windDirection: obs.WindDirection || 'N',
            rainfall: parseFloat(obs.Now?.Precipitation) || 0,
            rainfall1hr: parseFloat(obs.Past1hr?.Precipitation) || 0,
            rainfall24hr: parseFloat(obs.Past24hr?.Precipitation) || 0,
            pressure: parseFloat(obs.AirPressure) || 1013,
            visibility: parseFloat(obs.Visibility) || 10,
            weatherDescription: obs.Weather || '晴',
        };
    }

    private parseRainfallForecast(data: any): RainfallForecast[] {
        // Parse CWA forecast API response
        return [];
    }

    private parseDebrisFlowData(data: any): DebrisFlowWarning[] {
        return [];
    }

    private parseAlertData(data: any): WeatherAlert[] {
        return [];
    }

    private getMockWeatherData(location: { lat: number; lng: number }): WeatherData {
        return {
            location: 'Mock Station',
            timestamp: new Date(),
            temperature: 25 + Math.random() * 5,
            humidity: 60 + Math.random() * 20,
            windSpeed: 2 + Math.random() * 8,
            windDirection: ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.floor(Math.random() * 8)],
            rainfall: 0,
            rainfall1hr: Math.random() * 5,
            rainfall24hr: Math.random() * 30,
            pressure: 1010 + Math.random() * 10,
            visibility: 10,
            weatherDescription: '多雲時晴',
        };
    }

    private getMockRainfallForecast(): RainfallForecast[] {
        const forecasts: RainfallForecast[] = [];
        for (let i = 0; i < 24; i++) {
            forecasts.push({
                time: new Date(Date.now() + i * 3600000),
                probability: Math.random() * 100,
                expectedMm: Math.random() * 10,
            });
        }
        return forecasts;
    }

    private getMockDebrisFlowWarnings(): DebrisFlowWarning[] {
        return [
            {
                id: 'df-001',
                location: '南投縣仁愛鄉',
                level: 'yellow',
                rainfall: 150,
                threshold: 200,
                updatedAt: new Date(),
            },
        ];
    }

    private getMockAlerts(): WeatherAlert[] {
        return [
            {
                id: 'alert-001',
                type: 'heavy-rain',
                severity: 'moderate',
                headline: '大雨特報',
                description: '預計未來6小時內將有大雨發生',
                affectedAreas: ['新北市', '基隆市'],
                effectiveTime: new Date(),
                expiresTime: new Date(Date.now() + 6 * 3600000),
            },
        ];
    }
}

// Type definitions
interface CachedData {
    data: any;
    fetchedAt: Date;
    expiresAt: Date;
}

interface WeatherData {
    location: string;
    timestamp: Date;
    temperature: number;
    humidity: number;
    windSpeed: number;
    windDirection: string;
    rainfall: number;
    rainfall1hr: number;
    rainfall24hr: number;
    pressure: number;
    visibility: number;
    weatherDescription: string;
}

interface RainfallForecast {
    time: Date;
    probability: number;
    expectedMm: number;
}

interface DebrisFlowWarning {
    id: string;
    location: string;
    level: 'green' | 'yellow' | 'red';
    rainfall: number;
    threshold: number;
    updatedAt: Date;
}

interface WeatherAlert {
    id: string;
    type: string;
    severity: 'minor' | 'moderate' | 'severe' | 'extreme';
    headline: string;
    description: string;
    affectedAreas: string[];
    effectiveTime: Date;
    expiresTime: Date;
}

interface RadarTile {
    timestamp: Date;
    url: string;
    bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
}
