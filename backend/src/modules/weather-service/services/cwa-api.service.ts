import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

/**
 * CWA (Central Weather Administration) API 資料集
 */
export const CWA_DATASETS = {
    // 天氣預報
    GENERAL_36H: 'F-C0032-001',           // 36小時天氣預報
    WEEKLY: 'F-D0047-091',                // 一週縣市預報
    
    // 天氣觀測
    CURRENT_WEATHER: 'O-A0003-001',       // 即時天氣觀測
    RAINFALL: 'O-A0002-001',              // 雨量觀測
    
    // 警報
    ALERTS: 'W-C0033-001',                // 氣象警報
    TYPHOON: 'W-C0034-001',               // 颱風警報
    
    // 海象
    WAVE_FORECAST: 'F-A0019-001',         // 波浪預報
    TIDE: 'F-A0021-001',                  // 潮汐預報
    
    // 分析圖
    WEATHER_MAPS: 'F-A0012-001',          // 天氣分析預測圖
    RADAR: 'O-A0058-001',                 // 雷達回波
} as const;

export interface CwaApiResponse {
    success: string;
    result: {
        resource_id: string;
        fields: unknown[];
    };
    records: unknown;
}

/**
 * CWA OpenData API 整合服務
 * 
 * 提供中央氣象署 OpenData API 的底層存取:
 * - 統一 API 呼叫
 * - 錯誤處理
 * - 快取策略
 */
@Injectable()
export class CwaApiService {
    private readonly logger = new Logger(CwaApiService.name);
    private readonly baseUrl = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
    private readonly apiKey: string;
    
    // 簡易快取
    private cache: Map<string, { data: unknown; expiry: number }> = new Map();
    private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.apiKey = this.configService.get<string>('CWA_API_KEY') || '';
        
        if (!this.apiKey) {
            this.logger.warn('CWA_API_KEY not configured - weather features will use fallback data');
        }
    }

    /**
     * 檢查 API 是否可用
     */
    isAvailable(): boolean {
        return !!this.apiKey;
    }

    /**
     * 呼叫 CWA API
     */
    async fetch<T = any>(
        datasetId: string,
        params: Record<string, string> = {},
        useCache: boolean = true
    ): Promise<T | null> {
        const cacheKey = `${datasetId}:${JSON.stringify(params)}`;
        
        // 檢查快取
        if (useCache) {
            const cached = this.cache.get(cacheKey);
            if (cached && cached.expiry > Date.now()) {
                return cached.data as T;
            }
        }

        if (!this.apiKey) {
            this.logger.warn(`CWA API unavailable for dataset: ${datasetId}`);
            return null;
        }

        const url = `${this.baseUrl}/${datasetId}`;
        const queryParams = {
            Authorization: this.apiKey,
            format: 'JSON',
            ...params,
        };

        try {
            const response = await firstValueFrom(
                this.httpService.get<CwaApiResponse>(url, { params: queryParams })
            );

            if (response.data.success === 'true') {
                const data = response.data.records as T;
                
                // 更新快取
                this.cache.set(cacheKey, {
                    data,
                    expiry: Date.now() + this.CACHE_TTL,
                });
                
                return data;
            }

            this.logger.warn(`CWA API returned unsuccessful for ${datasetId}`);
            return null;
        } catch (error) {
            this.logger.error(`CWA API error for ${datasetId}: ${error.message}`);
            return null;
        }
    }

    /**
     * 清除快取
     */
    clearCache(): void {
        this.cache.clear();
    }

    /**
     * 取得資料集列表
     */
    getDatasets(): typeof CWA_DATASETS {
        return CWA_DATASETS;
    }
}
