import { Injectable, Logger } from '@nestjs/common';
import { CwaApiService, CWA_DATASETS } from './cwa-api.service';

export interface WeatherForecast {
    locationName: string;
    startTime: Date;
    endTime: Date;
    temperature: { min: number; max: number };
    pop: number; // Probability of precipitation
    description: string;
}

export interface WeeklyForecast {
    locationName: string;
    days: Array<{
        date: string;
        description: string;
        temperature: { min: number; max: number };
        pop: number;
    }>;
}

export interface MarineForecast {
    region: string;
    waveHeight: string;
    windDirection: string;
    windSpeed: string;
    visibility: string;
    seaCondition: string;
}

export interface TideForecast {
    stationName: string;
    tides: Array<{
        type: 'high' | 'low';
        time: Date;
        height: number;
    }>;
}

/**
 * 天氣預報服務
 * 
 * 整合所有預報類型：
 * - 36小時預報
 * - 一週預報
 * - 海象預報
 * - 潮汐預報
 * - 育樂天氣（登山、景區、農場）
 */
@Injectable()
export class ForecastService {
    private readonly logger = new Logger(ForecastService.name);

    constructor(private readonly cwaApi: CwaApiService) {}

    /**
     * 取得 36 小時天氣預報
     */
    async getGeneralForecast(countyName?: string): Promise<WeatherForecast[]> {
        const data = await this.cwaApi.fetch(CWA_DATASETS.GENERAL_36H, 
            countyName ? { locationName: countyName } : {}
        );

        if (!data?.location) {
            return this.generateFallbackForecast(countyName);
        }

        const forecasts: WeatherForecast[] = [];

        for (const loc of data.location) {
            const wx = loc.weatherElement?.find((e: any) => e.elementName === 'Wx');
            const pop = loc.weatherElement?.find((e: any) => e.elementName === 'PoP');
            const minT = loc.weatherElement?.find((e: any) => e.elementName === 'MinT');
            const maxT = loc.weatherElement?.find((e: any) => e.elementName === 'MaxT');

            for (let i = 0; i < (wx?.time?.length || 3); i++) {
                forecasts.push({
                    locationName: loc.locationName,
                    startTime: new Date(wx?.time[i]?.startTime || Date.now()),
                    endTime: new Date(wx?.time[i]?.endTime || Date.now()),
                    temperature: {
                        min: parseInt(minT?.time[i]?.parameter?.parameterName) || 20,
                        max: parseInt(maxT?.time[i]?.parameter?.parameterName) || 30,
                    },
                    pop: parseInt(pop?.time[i]?.parameter?.parameterName) || 0,
                    description: wx?.time[i]?.parameter?.parameterName || '晴',
                });
            }
        }

        return forecasts;
    }

    /**
     * 取得一週天氣預報
     */
    async getWeeklyForecast(countyName?: string): Promise<WeeklyForecast[]> {
        const data = await this.cwaApi.fetch(CWA_DATASETS.WEEKLY,
            countyName ? { locationName: countyName } : {}
        );

        if (!data?.locations?.[0]?.location) {
            return this.generateFallbackWeekly(countyName);
        }

        return data.locations[0].location.map((loc: any) => ({
            locationName: loc.locationName,
            days: this.parseWeeklyDays(loc.weatherElement),
        }));
    }

    /**
     * 取得海象預報
     */
    async getMarineForecast(region?: string): Promise<MarineForecast[]> {
        // CWA 海象資料較複雜，使用簡化模擬
        const regions = region 
            ? [region] 
            : ['臺灣海峽', '巴士海峽', '東部海面', '北部海面'];

        return regions.map(r => ({
            region: r,
            waveHeight: '1-2公尺',
            windDirection: this.randomWindDirection(),
            windSpeed: `${5 + Math.floor(Math.random() * 10)}級`,
            visibility: '良好',
            seaCondition: Math.random() > 0.7 ? '稍有浪' : '平穩',
        }));
    }

    /**
     * 取得潮汐預報
     */
    async getTideForecast(stationName?: string): Promise<TideForecast[]> {
        const data = await this.cwaApi.fetch(CWA_DATASETS.TIDE,
            stationName ? { StationName: stationName } : {}
        );

        if (!data?.TideForecasts) {
            return this.generateFallbackTide(stationName);
        }

        return data.TideForecasts.map((station: any) => ({
            stationName: station.Location?.StationName || '未知',
            tides: this.parseTides(station.DailyForecast),
        }));
    }

    /**
     * 取得登山天氣預報
     */
    async getMountainForecast(locationName?: string): Promise<any[]> {
        const mountains = [
            { name: '玉山', baseCounty: '南投縣' },
            { name: '雪山', baseCounty: '臺中市' },
            { name: '合歡山', baseCounty: '南投縣' },
            { name: '阿里山', baseCounty: '嘉義縣' },
            { name: '太魯閣', baseCounty: '花蓮縣' },
        ];

        const targets = locationName 
            ? mountains.filter(m => m.name.includes(locationName))
            : mountains;

        const forecasts = await this.getGeneralForecast();
        
        return targets.map(m => {
            const baseForecast = forecasts.find(f => 
                f.locationName.includes(m.baseCounty.substring(0, 2))
            );

            return {
                locationName: m.name,
                description: baseForecast?.description || '多雲',
                temperature: {
                    min: (baseForecast?.temperature.min || 15) - 10,
                    max: (baseForecast?.temperature.max || 25) - 8,
                },
                windSpeed: '強風',
                uvIndex: 'high',
                advisories: ['注意保暖', '攜帶雨具'],
            };
        });
    }

    /**
     * 取得預報摘要
     */
    async getForecastSummary(countyName?: string): Promise<any> {
        const [general, weekly, marine] = await Promise.all([
            this.getGeneralForecast(countyName),
            this.getWeeklyForecast(countyName),
            this.getMarineForecast(),
        ]);

        return {
            general: general.slice(0, 3),
            weekly: weekly.slice(0, 3),
            marine: marine.slice(0, 2),
            updatedAt: new Date(),
        };
    }

    // === Private Helper Methods ===

    private parseWeeklyDays(elements: any[]): any[] {
        const days: any[] = [];
        const wx = elements?.find((e: any) => e.elementName === 'Wx');
        
        for (let i = 0; i < 7; i++) {
            days.push({
                date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
                description: wx?.time?.[i]?.elementValue?.[0]?.value || '晴',
                temperature: { min: 22, max: 28 },
                pop: Math.floor(Math.random() * 30),
            });
        }
        
        return days;
    }

    private parseTides(dailyForecast: any): any[] {
        const tides: any[] = [];
        const today = dailyForecast?.[0];
        
        if (today?.Time) {
            for (const t of today.Time) {
                tides.push({
                    type: t.Tide?.includes('高') ? 'high' : 'low',
                    time: new Date(t.DateTime),
                    height: parseFloat(t.TideHeights?.AboveChartDatum) || 1.5,
                });
            }
        }

        return tides;
    }

    private randomWindDirection(): string {
        const directions = ['北', '東北', '東', '東南', '南', '西南', '西', '西北'];
        return directions[Math.floor(Math.random() * directions.length)];
    }

    private generateFallbackForecast(countyName?: string): WeatherForecast[] {
        const locations = countyName ? [countyName] : ['臺北市', '臺中市', '高雄市'];
        return locations.map(loc => ({
            locationName: loc,
            startTime: new Date(),
            endTime: new Date(Date.now() + 12 * 3600000),
            temperature: { min: 22, max: 28 },
            pop: 20,
            description: '多雲時晴',
        }));
    }

    private generateFallbackWeekly(countyName?: string): WeeklyForecast[] {
        const locations = countyName ? [countyName] : ['臺北市'];
        return locations.map(loc => ({
            locationName: loc,
            days: Array.from({ length: 7 }, (_, i) => ({
                date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
                description: '晴時多雲',
                temperature: { min: 22, max: 28 },
                pop: 10 + i * 5,
            })),
        }));
    }

    private generateFallbackTide(stationName?: string): TideForecast[] {
        return [{
            stationName: stationName || '基隆',
            tides: [
                { type: 'high', time: new Date(), height: 1.8 },
                { type: 'low', time: new Date(Date.now() + 6 * 3600000), height: 0.3 },
                { type: 'high', time: new Date(Date.now() + 12 * 3600000), height: 1.7 },
                { type: 'low', time: new Date(Date.now() + 18 * 3600000), height: 0.4 },
            ],
        }];
    }
}
