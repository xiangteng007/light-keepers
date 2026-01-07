/**
 * Weather Hub Service - 氣象彙整服務
 * 
 * 整合三個氣象服務，提供統一的資料存取介面。
 */

import { Injectable } from '@nestjs/common';

@Injectable()
export class WeatherHubService {
    /**
     * 取得綜合氣象概況
     * 包含：當前天氣、預報、活動警報
     */
    async getOverview(location?: string): Promise<{
        current: any;
        forecast: any;
        alerts: any[];
    }> {
        // TODO: 注入子服務並彙整資料
        return {
            current: null,
            forecast: null,
            alerts: [],
        };
    }

    /**
     * 取得特定位置的完整氣象資訊
     */
    async getWeatherByLocation(lat: number, lng: number): Promise<any> {
        // TODO: 整合雷達、預報、警報
        return {
            location: { lat, lng },
            radar: null,
            forecast: null,
            alerts: [],
        };
    }
}
