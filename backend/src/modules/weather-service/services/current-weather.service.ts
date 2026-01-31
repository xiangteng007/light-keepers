import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CwaApiService, CWA_DATASETS } from './cwa-api.service';

export interface CurrentWeatherData {
    locationCode: string;
    locationName: string;
    temperature: number;
    humidity: number;
    rainfall: number;
    windSpeed: number;
    windDirection: string;
    pressure: number;
    description: string;
    updatedAt: Date;
}

/**
 * 即時天氣服務
 * 
 * 提供：
 * - 即時天氣觀測資料
 * - 自動同步排程
 * - 位置查詢
 */
@Injectable()
export class CurrentWeatherService {
    private readonly logger = new Logger(CurrentWeatherService.name);
    private weatherData: Map<string, CurrentWeatherData> = new Map();
    private lastSync: Date | null = null;

    constructor(private readonly cwaApi: CwaApiService) {
        this.initFallbackData();
    }

    /**
     * 每 10 分鐘同步天氣資料
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async syncWeatherData(): Promise<void> {
        this.logger.log('Syncing current weather data...');
        
        const data = await this.cwaApi.fetch(CWA_DATASETS.CURRENT_WEATHER);
        
        if (!data?.Station) {
            this.logger.warn('No weather data received, using fallback');
            return;
        }

        for (const station of data.Station) {
            const weather: CurrentWeatherData = {
                locationCode: station.StationId,
                locationName: station.StationName,
                temperature: parseFloat(station.WeatherElement?.AirTemperature) || 25,
                humidity: parseFloat(station.WeatherElement?.RelativeHumidity) || 70,
                rainfall: parseFloat(station.WeatherElement?.Now?.Precipitation) || 0,
                windSpeed: parseFloat(station.WeatherElement?.WindSpeed) || 0,
                windDirection: station.WeatherElement?.WindDirection || 'N',
                pressure: parseFloat(station.WeatherElement?.AirPressure) || 1013,
                description: this.getWeatherDescription(station.WeatherElement),
                updatedAt: new Date(station.ObsTime?.DateTime || Date.now()),
            };
            
            this.weatherData.set(weather.locationCode, weather);
        }

        this.lastSync = new Date();
        this.logger.log(`Synced ${this.weatherData.size} weather stations`);
    }

    /**
     * 取得所有天氣資料
     */
    getAll(): CurrentWeatherData[] {
        return Array.from(this.weatherData.values());
    }

    /**
     * 依位置名稱搜尋
     */
    getByLocation(locationName: string): CurrentWeatherData[] {
        return this.getAll().filter(w => 
            w.locationName.includes(locationName)
        );
    }

    /**
     * 依位置代碼取得
     */
    getByCode(locationCode: string): CurrentWeatherData | undefined {
        return this.weatherData.get(locationCode);
    }

    /**
     * 取得最近的測站（依座標）
     */
    getNearestStation(lat: number, lng: number): CurrentWeatherData | null {
        // 簡化實作：回傳第一個台北測站
        const taipei = this.getByLocation('臺北');
        return taipei[0] || null;
    }

    /**
     * 取得最後同步時間
     */
    getLastSyncTime(): Date | null {
        return this.lastSync;
    }

    /**
     * 生成天氣描述
     */
    private getWeatherDescription(element: any): string {
        if (!element) return '晴';
        
        const rainfall = parseFloat(element.Now?.Precipitation) || 0;
        const humidity = parseFloat(element.RelativeHumidity) || 70;
        
        if (rainfall > 10) return '大雨';
        if (rainfall > 1) return '雨';
        if (humidity > 90) return '陰';
        if (humidity > 75) return '多雲';
        return '晴';
    }

    /**
     * 初始化備援資料
     */
    private initFallbackData(): void {
        const locations = [
            { code: '466920', name: '臺北' },
            { code: '467490', name: '新北' },
            { code: '467571', name: '桃園' },
            { code: '467770', name: '臺中' },
            { code: '467410', name: '臺南' },
            { code: '467440', name: '高雄' },
        ];

        for (const loc of locations) {
            this.weatherData.set(loc.code, {
                locationCode: loc.code,
                locationName: loc.name,
                temperature: 25 + Math.random() * 5,
                humidity: 70 + Math.random() * 15,
                rainfall: 0,
                windSpeed: Math.random() * 5,
                windDirection: 'N',
                pressure: 1013,
                description: '晴',
                updatedAt: new Date(),
            });
        }
    }
}
