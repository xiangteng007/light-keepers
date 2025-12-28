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
        const locations = data?.records?.locations?.[0]?.location || [];

        return locations.map((loc: any) => ({
            locationName: loc.locationName,
            weatherElements: loc.weatherElement?.map((el: any) => ({
                elementName: el.elementName,
                description: el.description,
                time: el.time?.map((t: any) => ({
                    startTime: t.startTime,
                    endTime: t.endTime,
                    parameter: {
                        parameterName: t.elementValue?.[0]?.value,
                        parameterValue: t.elementValue?.[1]?.value,
                    },
                })) || [],
            })) || [],
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
     * 取得海面天氣預報
     */
    async getMarineWeather(region?: string): Promise<MarineWeatherDto[]> {
        const data = await this.fetchCwaData(CWA_DATASETS.MARINE_WEATHER);
        const locations = data?.records?.location || [];

        let results = locations.map((loc: any) => {
            const weatherElement = loc.weatherElement || [];
            const getElementValue = (name: string) => {
                const el = weatherElement.find((e: any) => e.elementName === name);
                return el?.time?.[0]?.elementValue || '';
            };

            return {
                region: loc.locationName,
                validTime: weatherElement[0]?.time?.[0]?.startTime || '',
                weather: getElementValue('Wx'),
                wind: getElementValue('WD'),
                windSpeed: getElementValue('WS'),
                seaCondition: getElementValue('SeaCondition'),
                waveHeight: getElementValue('WaveHeight'),
            };
        });

        if (region) {
            results = results.filter((r: MarineWeatherDto) => r.region.includes(region));
        }

        return results;
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
        const params: Record<string, string> = {};
        if (stationName) {
            params.StationName = stationName;
        }

        const data = await this.fetchCwaData(CWA_DATASETS.TIDE_FORECAST, params);
        const tideForecasts = data?.records?.TideForecasts?.TideForecast || [];

        return tideForecasts.map((forecast: any) => {
            const location = forecast.Location || {};
            const dailyTides = forecast.DailyForecast || [];

            return {
                station: location.StationName || '',
                forecasts: dailyTides.slice(0, 30).map((day: any) => ({ // 取前 30 天
                    date: day.Date,
                    lunarDate: day.LunarDate,
                    tides: day.Time?.map((t: any) => ({
                        time: t.DateTime,
                        type: t.Tide === '滿潮' ? 'high' : 'low',
                        height: parseFloat(t.TideHeights?.AboveLocalMSL) || 0,
                    })) || [],
                })),
            };
        });
    }

    // ==================== 育樂天氣預報 ====================

    /**
     * 取得登山天氣預報
     */
    async getMountainForecast(locationName?: string): Promise<RecreationalForecastDto[]> {
        return this.getRecreationalForecast(CWA_DATASETS.MOUNTAIN_24H, locationName);
    }

    /**
     * 取得國家風景區預報
     */
    async getScenicForecast(locationName?: string): Promise<RecreationalForecastDto[]> {
        return this.getRecreationalForecast(CWA_DATASETS.SCENIC_24H, locationName);
    }

    /**
     * 取得農場旅遊預報
     */
    async getFarmForecast(locationName?: string): Promise<RecreationalForecastDto[]> {
        return this.getRecreationalForecast(CWA_DATASETS.FARM_24H, locationName);
    }

    /**
     * 通用育樂預報解析
     */
    private async getRecreationalForecast(datasetId: string, locationName?: string): Promise<RecreationalForecastDto[]> {
        const params: Record<string, string> = {};
        if (locationName) {
            params.locationName = locationName;
        }

        const data = await this.fetchCwaData(datasetId, params);
        const locations = data?.records?.locations?.location || data?.records?.location || [];

        return locations.map((loc: any) => {
            const weatherElements = loc.weatherElement || [];

            // 整理時間序列
            const timeMap = new Map<string, DailyForecastDto>();

            for (const el of weatherElements) {
                for (const t of el.time || []) {
                    const date = t.startTime?.split('T')[0] || t.dataTime?.split('T')[0];
                    if (!date) continue;

                    if (!timeMap.has(date)) {
                        timeMap.set(date, {
                            date,
                            weather: '',
                            minTemp: 0,
                            maxTemp: 0,
                        });
                    }

                    const forecast = timeMap.get(date)!;
                    const value = t.elementValue?.[0]?.value || t.parameter?.parameterName || '';

                    switch (el.elementName) {
                        case 'Wx':
                        case 'WeatherDescription':
                            forecast.weather = value;
                            break;
                        case 'MinT':
                            forecast.minTemp = parseFloat(value) || 0;
                            break;
                        case 'MaxT':
                            forecast.maxTemp = parseFloat(value) || 0;
                            break;
                        case 'PoP12h':
                        case 'PoP':
                            forecast.pop = parseFloat(value) || 0;
                            break;
                        case 'RH':
                            forecast.humidity = parseFloat(value) || 0;
                            break;
                        case 'WD':
                            forecast.windDirection = value;
                            break;
                        case 'WS':
                            forecast.windSpeed = value;
                            break;
                    }
                }
            }

            return {
                locationName: loc.locationName,
                county: loc.geocode?.substring(0, 5),
                forecasts: Array.from(timeMap.values()).slice(0, 7), // 取一週
            };
        });
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
