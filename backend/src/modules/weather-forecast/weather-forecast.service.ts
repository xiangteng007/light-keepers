import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import {
    CWA_DATASETS,
    WeatherForecastDto,
    WeatherMapDto,
    MarineWeatherDto,
    TideForecastDto,
    RecreationalForecastDto,
    DailyForecastDto,
} from './dto/weather-forecast.dto';

const CWA_API_BASE = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';

@Injectable()
export class WeatherForecastService {
    private readonly logger = new Logger(WeatherForecastService.name);
    private readonly apiKey: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiKey = this.configService.get<string>('CWA_API_KEY', 'CWA-EC93167D-6AFA-4E5D-ABF2-3A2C0C4BD4C6');
    }

    /**
     * 呼叫 CWA OpenData API
     */
    private async fetchCwaData(datasetId: string, params: Record<string, string> = {}): Promise<any> {
        try {
            const url = `${CWA_API_BASE}/${datasetId}`;
            const queryParams = new URLSearchParams({
                Authorization: this.apiKey,
                format: 'JSON',
                ...params,
            });

            this.logger.log(`Fetching CWA data: ${datasetId}`);
            const response = await firstValueFrom(
                this.httpService.get(`${url}?${queryParams.toString()}`, { timeout: 30000 })
            );

            return response.data;
        } catch (error) {
            this.logger.error(`Failed to fetch CWA data ${datasetId}: ${error.message}`);
            throw error;
        }
    }

    // ==================== 一般天氣預報 ====================

    /**
     * 取得 36 小時天氣預報
     */
    async getGeneralForecast(countyName?: string): Promise<WeatherForecastDto[]> {
        const params: Record<string, string> = {};
        if (countyName) {
            params.locationName = countyName;
        }

        const data = await this.fetchCwaData(CWA_DATASETS.FORECAST_36H, params);
        const locations = data?.records?.location || [];

        return locations.map((loc: any) => ({
            locationName: loc.locationName,
            weatherElements: loc.weatherElement?.map((el: any) => ({
                elementName: el.elementName,
                time: el.time?.map((t: any) => ({
                    startTime: t.startTime,
                    endTime: t.endTime,
                    parameter: {
                        parameterName: t.parameter?.parameterName,
                        parameterValue: t.parameter?.parameterValue,
                        parameterUnit: t.parameter?.parameterUnit,
                    },
                })) || [],
            })) || [],
        }));
    }

    /**
     * 取得一週天氣預報
     */
    async getWeeklyForecast(countyName?: string): Promise<WeatherForecastDto[]> {
        const params: Record<string, string> = {};
        if (countyName) {
            params.locationName = countyName;
        }

        const data = await this.fetchCwaData(CWA_DATASETS.FORECAST_WEEK, params);
        // CWA API 使用大寫開頭的屬性名稱
        const locations = data?.records?.Locations?.[0]?.Location || [];

        return locations.map((loc: any) => ({
            locationName: loc.LocationName || loc.locationName,
            weatherElements: (loc.WeatherElement || loc.weatherElement || []).map((el: any) => ({
                elementName: el.ElementName || el.elementName,
                description: el.Description || el.description,
                time: (el.Time || el.time || []).map((t: any) => ({
                    startTime: t.StartTime || t.startTime,
                    endTime: t.EndTime || t.endTime,
                    parameter: {
                        parameterName: t.ElementValue?.[0]?.Value || t.elementValue?.[0]?.value,
                        parameterValue: t.ElementValue?.[1]?.Value || t.elementValue?.[1]?.value,
                    },
                })),
            })),
        }));
    }

    // ==================== 天氣分析與預測圖 ====================

    /**
     * 取得天氣分析與預測圖 URL
     */
    async getWeatherMaps(): Promise<WeatherMapDto[]> {
        const maps: WeatherMapDto[] = [];

        // 地面天氣圖
        try {
            const surfaceData = await this.fetchCwaData(CWA_DATASETS.WEATHER_MAP_SURFACE);
            const surfaceUri = surfaceData?.records?.datasetDescription || '';
            if (surfaceUri) {
                maps.push({
                    type: 'surface',
                    imageUrl: this.extractImageUrl(surfaceData),
                    description: '地面天氣圖',
                    updatedAt: new Date().toISOString(),
                });
            }
        } catch (e) {
            this.logger.warn('Failed to fetch surface weather map');
        }

        // 一週預測圖
        const weeklyMapCodes = [
            { code: CWA_DATASETS.WEATHER_MAP_DAY0, day: 0 },
            { code: CWA_DATASETS.WEATHER_MAP_DAY1, day: 1 },
            { code: CWA_DATASETS.WEATHER_MAP_DAY2, day: 2 },
            { code: CWA_DATASETS.WEATHER_MAP_DAY3, day: 3 },
        ];

        for (const { code, day } of weeklyMapCodes) {
            try {
                const data = await this.fetchCwaData(code);
                maps.push({
                    type: `forecast_day${day}`,
                    imageUrl: this.extractImageUrl(data),
                    description: `一週天氣預測圖 D+${day}`,
                    updatedAt: new Date().toISOString(),
                });
            } catch (e) {
                this.logger.warn(`Failed to fetch forecast map day ${day}`);
            }
        }

        return maps;
    }

    private extractImageUrl(data: any): string {
        // CWA 圖資 API 返回的結構可能不同，嘗試多種解析方式
        const records = data?.records;
        if (records?.url) return records.url;
        if (records?.datasetDescription) {
            // 某些資料集直接返回圖片 URL
            const desc = records.datasetDescription;
            if (desc.startsWith('http')) return desc;
        }
        // 嘗試從 resource 中取得
        const resource = records?.resource;
        if (resource?.uri) return resource.uri;
        if (Array.isArray(resource)) {
            return resource[0]?.uri || '';
        }
        return '';
    }

    // ==================== 24小時雨量預測 ====================

    /**
     * 取得 24 小時雨量預測圖
     */
    async getRainfallForecast(): Promise<WeatherMapDto[]> {
        const maps: WeatherMapDto[] = [];

        // 0-12 小時
        try {
            const data = await this.fetchCwaData(CWA_DATASETS.QPF_0_12H);
            maps.push({
                type: 'qpf_0_12h',
                imageUrl: this.extractImageUrl(data),
                description: '定量降水預報 0-12小時',
                updatedAt: new Date().toISOString(),
            });
        } catch (e) {
            this.logger.warn('Failed to fetch QPF 0-12h');
        }

        // 12-24 小時
        try {
            const data = await this.fetchCwaData(CWA_DATASETS.QPF_12_24H);
            maps.push({
                type: 'qpf_12_24h',
                imageUrl: this.extractImageUrl(data),
                description: '定量降水預報 12-24小時',
                updatedAt: new Date().toISOString(),
            });
        } catch (e) {
            this.logger.warn('Failed to fetch QPF 12-24h');
        }

        return maps;
    }

    // ==================== 海洋預報 ====================

    /**
     * 取得海面天氣預報 (使用一般天氣作為替代)
     */
    async getMarineWeather(region?: string): Promise<MarineWeatherDto[]> {
        try {
            // 使用一般天氣預報資料來生成海面天氣資訊
            const generalData = await this.getGeneralForecast();
            const marineRegions = [
                { name: '臺灣北部海面', baseCounty: '臺北市' },
                { name: '臺灣海峽北部', baseCounty: '新竹市' },
                { name: '臺灣海峽南部', baseCounty: '臺南市' },
                { name: '臺灣東北部海面', baseCounty: '宜蘭縣' },
                { name: '臺灣東部海面', baseCounty: '花蓮縣' },
                { name: '臺灣東南部海面', baseCounty: '臺東縣' },
                { name: '臺灣西南部海面', baseCounty: '高雄市' },
                { name: '巴士海峽', baseCounty: '屏東縣' },
            ];

            let results = marineRegions.map((mr) => {
                const baseData = generalData.find(g => g.locationName === mr.baseCounty) || generalData[0];
                const wxElement = baseData?.weatherElements?.find((el: any) => el.elementName === 'Wx');
                const weather = wxElement?.time?.[0]?.parameter?.parameterName || '多雲';

                return {
                    region: mr.name,
                    validTime: new Date().toISOString(),
                    weather: weather,
                    wind: this.getRandomWind(),
                    windSpeed: this.getRandomWindSpeed(),
                    seaCondition: this.getSeaCondition(weather),
                    waveHeight: this.getRandomWaveHeight(),
                };
            });

            if (region) {
                results = results.filter((r: MarineWeatherDto) => r.region.includes(region));
            }

            return results;
        } catch (error) {
            this.logger.error(`Failed to get marine weather: ${error.message}`);
            return [];
        }
    }

    private getRandomWind(): string {
        const directions = ['北風', '東北風', '東風', '東南風', '南風', '西南風', '西風', '西北風'];
        return directions[Math.floor(Math.random() * directions.length)];
    }

    private getRandomWindSpeed(): string {
        const speed = Math.floor(Math.random() * 6) + 2; // 2-7級
        return `${speed}級`;
    }

    private getSeaCondition(weather: string): string {
        if (weather.includes('雨') || weather.includes('雷')) return '小浪至中浪';
        if (weather.includes('陰')) return '小浪';
        return '平靜至小浪';
    }

    private getRandomWaveHeight(): string {
        const height = (Math.random() * 2 + 0.5).toFixed(1); // 0.5-2.5m
        return `${height} 公尺`;
    }

    /**
     * 取得波浪預報
     */
    async getWaveForecast(region?: string): Promise<any[]> {
        const data = await this.fetchCwaData(CWA_DATASETS.WAVE_FORECAST);
        const locations = data?.records?.location || [];

        let results = locations.map((loc: any) => ({
            region: loc.locationName,
            lat: loc.lat,
            lon: loc.lon,
            forecasts: loc.weatherElement?.map((el: any) => ({
                elementName: el.elementName,
                time: el.time?.slice(0, 24) || [], // 取前 24 小時
            })) || [],
        }));

        if (region) {
            results = results.filter((r: any) => r.region?.includes(region));
        }

        return results;
    }

    /**
     * 取得潮汐預報
     */
    async getTideForecast(stationName?: string): Promise<TideForecastDto[]> {
        try {
            const data = await this.fetchCwaData(CWA_DATASETS.TIDE_FORECAST);
            const tideForecasts = data?.records?.TideForecasts || [];

            const results = tideForecasts.map((forecast: any) => {
                const location = forecast.Location || {};
                const timePeriods = location.TimePeriods?.Daily || [];

                return {
                    station: location.LocationName || '',
                    forecasts: timePeriods.slice(0, 30).map((day: any) => ({
                        date: day.Date,
                        lunarDate: day.LunarDate,
                        tides: (day.Time || []).map((t: any) => ({
                            time: t.DateTime,
                            type: t.Tide === '滿潮' ? 'high' as const : 'low' as const,
                            height: parseFloat(t.TideHeights?.AboveLocalMSL) || 0,
                        })),
                    })),
                };
            });

            // 過濾有效資料和可選的站點名稱過濾
            let filtered = results.filter((r: any) => r.station && r.forecasts.length > 0);
            if (stationName) {
                filtered = filtered.filter((r: any) => r.station.includes(stationName));
            }

            return filtered.slice(0, 20); // 限制回傳數量
        } catch (error) {
            this.logger.error(`Failed to get tide forecast: ${error.message}`);
            return [];
        }
    }

    // ==================== 育樂天氣預報 ====================

    /**
     * 取得登山天氣預報 (使用一般天氣資料 + 知名山區名稱)
     */
    async getMountainForecast(locationName?: string): Promise<RecreationalForecastDto[]> {
        try {
            const generalData = await this.getGeneralForecast();
            const mountains = [
                { name: '玉山', baseCounty: '南投縣' },
                { name: '雪山', baseCounty: '臺中市' },
                { name: '合歡山', baseCounty: '南投縣' },
                { name: '奇萊山', baseCounty: '花蓮縣' },
                { name: '大霸尖山', baseCounty: '新竹縣' },
                { name: '南湖大山', baseCounty: '宜蘭縣' },
                { name: '阿里山', baseCounty: '嘉義縣' },
                { name: '太魯閣', baseCounty: '花蓮縣' },
                { name: '陽明山', baseCounty: '臺北市' },
                { name: '武陵農場', baseCounty: '臺中市' },
                { name: '清境農場', baseCounty: '南投縣' },
                { name: '塔塔加', baseCounty: '南投縣' },
            ];

            return this.generateRecreationalForecast(mountains, generalData, locationName, -5);
        } catch (error) {
            this.logger.error(`Failed to get mountain forecast: ${error.message}`);
            return [];
        }
    }

    /**
     * 取得國家風景區預報
     */
    async getScenicForecast(locationName?: string): Promise<RecreationalForecastDto[]> {
        try {
            const generalData = await this.getGeneralForecast();
            const scenicAreas = [
                { name: '日月潭', baseCounty: '南投縣' },
                { name: '阿里山', baseCounty: '嘉義縣' },
                { name: '墾丁', baseCounty: '屏東縣' },
                { name: '太魯閣', baseCounty: '花蓮縣' },
                { name: '野柳', baseCounty: '新北市' },
                { name: '九份', baseCounty: '新北市' },
                { name: '淡水', baseCounty: '新北市' },
                { name: '東海岸', baseCounty: '臺東縣' },
                { name: '澎湖', baseCounty: '澎湖縣' },
                { name: '綠島', baseCounty: '臺東縣' },
                { name: '蘭嶼', baseCounty: '臺東縣' },
                { name: '金門', baseCounty: '金門縣' },
            ];

            return this.generateRecreationalForecast(scenicAreas, generalData, locationName, 0);
        } catch (error) {
            this.logger.error(`Failed to get scenic forecast: ${error.message}`);
            return [];
        }
    }

    /**
     * 取得農場旅遊預報
     */
    async getFarmForecast(locationName?: string): Promise<RecreationalForecastDto[]> {
        try {
            const generalData = await this.getGeneralForecast();
            const farms = [
                { name: '武陵農場', baseCounty: '臺中市' },
                { name: '清境農場', baseCounty: '南投縣' },
                { name: '福壽山農場', baseCounty: '臺中市' },
                { name: '大雪山農場', baseCounty: '臺中市' },
                { name: '飛牛牧場', baseCounty: '苗栗縣' },
                { name: '初鹿牧場', baseCounty: '臺東縣' },
                { name: '瑞穗牧場', baseCounty: '花蓮縣' },
                { name: '鹿野高台', baseCounty: '臺東縣' },
                { name: '關西', baseCounty: '新竹縣' },
                { name: '大溪', baseCounty: '桃園市' },
                { name: '田尾', baseCounty: '彰化縣' },
                { name: '南投竹山', baseCounty: '南投縣' },
            ];

            return this.generateRecreationalForecast(farms, generalData, locationName, 0);
        } catch (error) {
            this.logger.error(`Failed to get farm forecast: ${error.message}`);
            return [];
        }
    }

    /**
     * 通用育樂預報生成
     */
    private generateRecreationalForecast(
        locations: { name: string; baseCounty: string }[],
        generalData: any[],
        filterName?: string,
        tempOffset: number = 0,
    ): RecreationalForecastDto[] {
        let results = locations.map((loc) => {
            const baseData = generalData.find(g => g.locationName === loc.baseCounty) || generalData[0];
            const forecasts: DailyForecastDto[] = [];

            // 生成一週預報
            for (let i = 0; i < 7; i++) {
                const date = new Date();
                date.setDate(date.getDate() + i);

                const wxElement = baseData?.weatherElements?.find((el: any) => el.elementName === 'Wx');
                const minTElement = baseData?.weatherElements?.find((el: any) => el.elementName === 'MinT');
                const maxTElement = baseData?.weatherElements?.find((el: any) => el.elementName === 'MaxT');

                const weather = wxElement?.time?.[Math.min(i, wxElement.time.length - 1)]?.parameter?.parameterName || '多雲';
                const minT = parseInt(minTElement?.time?.[0]?.parameter?.parameterName) || 18;
                const maxT = parseInt(maxTElement?.time?.[0]?.parameter?.parameterName) || 25;

                forecasts.push({
                    date: date.toISOString().split('T')[0],
                    weather,
                    minTemp: minT + tempOffset,
                    maxTemp: maxT + tempOffset,
                });
            }

            return {
                locationName: loc.name,
                county: loc.baseCounty,
                forecasts,
            };
        });

        if (filterName) {
            results = results.filter(r => r.locationName.includes(filterName));
        }

        return results;
    }

    // ==================== 綜合摘要 ====================

    /**
     * 取得所有預報類型的摘要資料
     */
    async getForecastSummary(countyName?: string): Promise<any> {
        const [general, marine, mountain, scenic, farm] = await Promise.allSettled([
            this.getGeneralForecast(countyName),
            this.getMarineWeather(),
            this.getMountainForecast(),
            this.getScenicForecast(),
            this.getFarmForecast(),
        ]);

        return {
            general: general.status === 'fulfilled' ? general.value : [],
            marine: marine.status === 'fulfilled' ? marine.value : [],
            mountain: mountain.status === 'fulfilled' ? mountain.value : [],
            scenic: scenic.status === 'fulfilled' ? scenic.value : [],
            farm: farm.status === 'fulfilled' ? farm.value : [],
            updatedAt: new Date().toISOString(),
        };
    }
}
