/**
 * Weather Data Integration Service
 * Real-time weather and alert data from Taiwan CWA
 */

import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

export interface WeatherData {
    location: string;
    locationCode: string;
    temperature: number;
    humidity: number;
    rainfall: number;
    windSpeed: number;
    windDirection: string;
    description: string;
    updatedAt: Date;
}

export interface WeatherForecast {
    location: string;
    forecasts: Array<{
        time: string;
        temperature: { min: number; max: number };
        pop: number; // Probability of precipitation
        description: string;
    }>;
}

export interface WeatherAlert {
    id: string;
    type: string;
    severity: 'advisory' | 'watch' | 'warning';
    title: string;
    description: string;
    affectedAreas: string[];
    startTime: Date;
    endTime?: Date;
    source: string;
}

@Injectable()
export class WeatherService {
    private readonly logger = new Logger(WeatherService.name);

    // CWA API endpoint (Central Weather Administration)
    private readonly CWA_API_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
    private readonly API_KEY = process.env.CWA_API_KEY || '';

    // Cached weather data
    private currentWeather: Map<string, WeatherData> = new Map();
    private forecasts: Map<string, WeatherForecast> = new Map();
    private alerts: WeatherAlert[] = [];

    // Taiwan location codes
    private readonly LOCATION_CODES: Record<string, string> = {
        '臺北市': 'F-D0047-061',
        '新北市': 'F-D0047-069',
        '桃園市': 'F-D0047-005',
        '臺中市': 'F-D0047-073',
        '臺南市': 'F-D0047-077',
        '高雄市': 'F-D0047-065',
        '基隆市': 'F-D0047-049',
        '新竹市': 'F-D0047-053',
        '嘉義市': 'F-D0047-057',
    };

    // ==================== Sync Jobs ====================

    @Cron(CronExpression.EVERY_30_MINUTES)
    async syncWeatherData(): Promise<void> {
        this.logger.log('Syncing weather data...');

        try {
            await Promise.all([
                this.fetchCurrentWeather(),
                this.fetchForecasts(),
                this.fetchAlerts(),
            ]);
            this.logger.log('Weather data sync completed');
        } catch (error) {
            this.logger.error('Weather sync failed', error);
        }
    }

    // ==================== Current Weather ====================

    async fetchCurrentWeather(): Promise<void> {
        try {
            // CWA 自動氣象站觀測資料 O-A0003-001
            const response = await fetch(
                `${this.CWA_API_BASE}/O-A0003-001?Authorization=${this.API_KEY}&format=JSON`
            );

            if (!response.ok) {
                this.logger.warn('CWA API returned error, using fallback data');
                this.generateFallbackWeatherData();
                return;
            }

            const data = await response.json();
            const stations = data?.records?.Station || [];

            for (const station of stations) {
                const weather: WeatherData = {
                    location: station.StationName,
                    locationCode: station.StationId,
                    temperature: parseFloat(station.WeatherElement?.AirTemperature || 25),
                    humidity: parseFloat(station.WeatherElement?.RelativeHumidity || 70),
                    rainfall: parseFloat(station.WeatherElement?.Now?.Precipitation || 0),
                    windSpeed: parseFloat(station.WeatherElement?.WindSpeed || 5),
                    windDirection: station.WeatherElement?.WindDirection || 'N',
                    description: this.getWeatherDescription(station.WeatherElement),
                    updatedAt: new Date(),
                };

                this.currentWeather.set(station.StationName, weather);
            }
        } catch (error) {
            this.logger.error('Failed to fetch current weather', error);
            this.generateFallbackWeatherData();
        }
    }

    async getCurrentWeather(location?: string): Promise<WeatherData[]> {
        if (this.currentWeather.size === 0) {
            await this.fetchCurrentWeather();
        }

        if (location) {
            const weather = this.currentWeather.get(location);
            return weather ? [weather] : [];
        }

        return Array.from(this.currentWeather.values());
    }

    // ==================== Forecasts ====================

    async fetchForecasts(): Promise<void> {
        try {
            // CWA 鄉鎮天氣預報 F-D0047-091
            const response = await fetch(
                `${this.CWA_API_BASE}/F-D0047-091?Authorization=${this.API_KEY}&format=JSON`
            );

            if (!response.ok) {
                this.generateFallbackForecasts();
                return;
            }

            const data = await response.json();
            const locations = data?.records?.locations?.[0]?.location || [];

            for (const loc of locations) {
                const forecast: WeatherForecast = {
                    location: loc.locationName,
                    forecasts: this.parseForecasts(loc.weatherElement),
                };
                this.forecasts.set(loc.locationName, forecast);
            }
        } catch (error) {
            this.logger.error('Failed to fetch forecasts', error);
            this.generateFallbackForecasts();
        }
    }

    async getForecast(location: string): Promise<WeatherForecast | null> {
        if (this.forecasts.size === 0) {
            await this.fetchForecasts();
        }
        return this.forecasts.get(location) || null;
    }

    // ==================== Weather Alerts ====================

    async fetchAlerts(): Promise<void> {
        try {
            // CWA 天氣警特報 W-C0033-001
            const response = await fetch(
                `${this.CWA_API_BASE}/W-C0033-001?Authorization=${this.API_KEY}&format=JSON`
            );

            if (!response.ok) {
                this.alerts = [];
                return;
            }

            const data = await response.json();
            const records = data?.records?.record || [];

            this.alerts = records.map((record: any, index: number) => ({
                id: `alert-${index}`,
                type: record.phenomena || 'weather',
                severity: this.mapSeverity(record.significance),
                title: record.headline || record.phenomena,
                description: record.description || '',
                affectedAreas: record.affectedAreas?.location?.map((l: any) => l.locationName) || [],
                startTime: new Date(record.onset || Date.now()),
                endTime: record.expires ? new Date(record.expires) : undefined,
                source: 'CWA',
            }));
        } catch (error) {
            this.logger.error('Failed to fetch alerts', error);
            this.alerts = [];
        }
    }

    async getActiveAlerts(): Promise<WeatherAlert[]> {
        const now = new Date();
        return this.alerts.filter(alert =>
            !alert.endTime || alert.endTime > now
        );
    }

    async getAlertsByLocation(location: string): Promise<WeatherAlert[]> {
        return this.alerts.filter(alert =>
            alert.affectedAreas.some(area =>
                area.includes(location) || location.includes(area)
            )
        );
    }

    // ==================== Risk Assessment ====================

    async assessWeatherRisk(lat: number, lng: number): Promise<{
        riskLevel: 'low' | 'medium' | 'high' | 'critical';
        factors: string[];
        recommendations: string[];
    }> {
        const nearbyAlerts = await this.getActiveAlerts();
        const factors: string[] = [];
        const recommendations: string[] = [];
        let riskScore = 0;

        // Check for active alerts
        const relevantAlerts = nearbyAlerts.filter(a => a.severity === 'warning');
        if (relevantAlerts.length > 0) {
            riskScore += 40;
            factors.push(`${relevantAlerts.length} 個有效警報`);
        }

        // Check weather conditions
        const weatherList = await this.getCurrentWeather();
        const nearestWeather = weatherList[0]; // Simplified - use nearest station

        if (nearestWeather) {
            if (nearestWeather.rainfall > 50) {
                riskScore += 30;
                factors.push('大雨');
                recommendations.push('避免前往低窪地區');
            }
            if (nearestWeather.windSpeed > 10) {
                riskScore += 20;
                factors.push('強風');
                recommendations.push('注意戶外活動安全');
            }
        }

        let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
        if (riskScore >= 70) riskLevel = 'critical';
        else if (riskScore >= 50) riskLevel = 'high';
        else if (riskScore >= 30) riskLevel = 'medium';

        return { riskLevel, factors, recommendations };
    }

    // ==================== Private Helpers ====================

    private getWeatherDescription(element: any): string {
        if (!element) return '晴';

        const rainfall = parseFloat(element.Now?.Precipitation || 0);
        if (rainfall > 10) return '大雨';
        if (rainfall > 2) return '雨';
        if (rainfall > 0) return '小雨';

        const humidity = parseFloat(element.RelativeHumidity || 50);
        if (humidity > 80) return '多雲';

        return '晴';
    }

    private parseForecasts(elements: any[]): Array<any> {
        const forecasts: any[] = [];
        const tempElement = elements?.find((e: any) => e.elementName === 'T');
        const popElement = elements?.find((e: any) => e.elementName === 'PoP12h');
        const wxElement = elements?.find((e: any) => e.elementName === 'Wx');

        const times = tempElement?.time || [];
        for (let i = 0; i < Math.min(times.length, 7); i++) {
            forecasts.push({
                time: times[i]?.startTime || new Date().toISOString(),
                temperature: {
                    min: parseInt(times[i]?.elementValue?.[0]?.value || 20),
                    max: parseInt(times[i]?.elementValue?.[0]?.value || 30) + 5,
                },
                pop: parseInt(popElement?.time?.[i]?.elementValue?.[0]?.value || 10),
                description: wxElement?.time?.[i]?.elementValue?.[0]?.value || '晴',
            });
        }

        return forecasts;
    }

    private mapSeverity(significance: string): 'advisory' | 'watch' | 'warning' {
        const lower = (significance || '').toLowerCase();
        if (lower.includes('warning') || lower.includes('警報')) return 'warning';
        if (lower.includes('watch') || lower.includes('注意')) return 'watch';
        return 'advisory';
    }

    private generateFallbackWeatherData(): void {
        const defaultLocations = ['臺北', '臺中', '高雄'];
        for (const loc of defaultLocations) {
            this.currentWeather.set(loc, {
                location: loc,
                locationCode: 'fallback',
                temperature: 25 + Math.random() * 5,
                humidity: 60 + Math.random() * 20,
                rainfall: 0,
                windSpeed: 3 + Math.random() * 5,
                windDirection: 'N',
                description: '晴',
                updatedAt: new Date(),
            });
        }
    }

    private generateFallbackForecasts(): void {
        const defaultLocations = ['臺北', '臺中', '高雄'];
        for (const loc of defaultLocations) {
            this.forecasts.set(loc, {
                location: loc,
                forecasts: Array.from({ length: 7 }, (_, i) => ({
                    time: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString(),
                    temperature: { min: 22, max: 28 },
                    pop: Math.floor(Math.random() * 30),
                    description: '晴時多雲',
                })),
            });
        }
    }
}
