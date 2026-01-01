import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ConfigService } from '@nestjs/config';

export interface WeatherData {
    location: string;
    temperature: number;
    humidity: number;
    description: string;
    icon: string;
    windSpeed: number;
    updatedAt: Date;
}

export interface GeocodingResult {
    latitude: number;
    longitude: number;
    address: string;
    adminCode: string;
    city: string;
}

export interface NotificationPayload {
    userId?: string;
    lineUserId?: string;
    email?: string;
    title: string;
    message: string;
    link?: string;
}

@Injectable()
export class ExternalApiService {
    private readonly logger = new Logger(ExternalApiService.name);

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    // ===== 中央氣象署 API =====

    async getWeather(lat: number, lng: number): Promise<WeatherData | null> {
        try {
            // 使用中央氣象署開放資料 API
            const cwbApiKey = this.configService.get('CWB_API_KEY');
            if (!cwbApiKey) {
                this.logger.warn('CWB_API_KEY not configured');
                return this.getMockWeather(lat, lng);
            }

            const url = `https://opendata.cwa.gov.tw/api/v1/rest/datastore/O-A0001-001?Authorization=${cwbApiKey}`;

            const response = await firstValueFrom(
                this.httpService.get(url, { timeout: 10000 })
            );

            // 解析並找最近的觀測站
            const stations = response.data?.records?.Station || [];
            const nearest = this.findNearestStation(stations, lat, lng);

            if (nearest) {
                return {
                    location: nearest.StationName,
                    temperature: nearest.WeatherElement?.AirTemperature || 25,
                    humidity: nearest.WeatherElement?.RelativeHumidity || 60,
                    description: nearest.WeatherElement?.Weather || '晴天',
                    icon: '☀️',
                    windSpeed: nearest.WeatherElement?.WindSpeed || 0,
                    updatedAt: new Date(),
                };
            }

            return this.getMockWeather(lat, lng);
        } catch (error) {
            this.logger.error('Weather API error:', error);
            return this.getMockWeather(lat, lng);
        }
    }

    private findNearestStation(stations: any[], lat: number, lng: number): any | null {
        if (!stations.length) return null;

        let nearest = stations[0];
        let minDist = Infinity;

        for (const station of stations) {
            const sLat = parseFloat(station.GeoInfo?.Coordinates?.[0]?.StationLatitude || 0);
            const sLng = parseFloat(station.GeoInfo?.Coordinates?.[0]?.StationLongitude || 0);
            const dist = Math.sqrt((lat - sLat) ** 2 + (lng - sLng) ** 2);

            if (dist < minDist) {
                minDist = dist;
                nearest = station;
            }
        }

        return nearest;
    }

    private getMockWeather(lat: number, lng: number): WeatherData {
        return {
            location: '模擬站點',
            temperature: 25 + Math.random() * 5,
            humidity: 60 + Math.random() * 20,
            description: '晴時多雲',
            icon: '⛅',
            windSpeed: 5 + Math.random() * 10,
            updatedAt: new Date(),
        };
    }

    // ===== Google Maps Geocoding =====

    async geocode(address: string): Promise<GeocodingResult | null> {
        try {
            const apiKey = this.configService.get('GOOGLE_MAPS_API_KEY');
            if (!apiKey) {
                this.logger.warn('GOOGLE_MAPS_API_KEY not configured');
                return null;
            }

            const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}&language=zh-TW`;

            const response = await firstValueFrom(
                this.httpService.get(url, { timeout: 10000 })
            );

            const result = response.data?.results?.[0];
            if (!result) return null;

            const location = result.geometry.location;
            const components = result.address_components || [];

            return {
                latitude: location.lat,
                longitude: location.lng,
                address: result.formatted_address,
                adminCode: components.find((c: any) => c.types.includes('administrative_area_level_2'))?.short_name || '',
                city: components.find((c: any) => c.types.includes('administrative_area_level_1'))?.long_name || '',
            };
        } catch (error) {
            this.logger.error('Geocoding error:', error);
            return null;
        }
    }

    async reverseGeocode(lat: number, lng: number): Promise<string | null> {
        try {
            const apiKey = this.configService.get('GOOGLE_MAPS_API_KEY');
            if (!apiKey) return null;

            const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}&language=zh-TW`;

            const response = await firstValueFrom(
                this.httpService.get(url, { timeout: 10000 })
            );

            return response.data?.results?.[0]?.formatted_address || null;
        } catch (error) {
            this.logger.error('Reverse geocoding error:', error);
            return null;
        }
    }

    // ===== LINE Messaging API =====

    async sendLineNotification(userId: string, message: string): Promise<boolean> {
        try {
            const accessToken = this.configService.get('LINE_CHANNEL_ACCESS_TOKEN');
            if (!accessToken) {
                this.logger.warn('LINE_CHANNEL_ACCESS_TOKEN not configured');
                return false;
            }

            const url = 'https://api.line.me/v2/bot/message/push';

            await firstValueFrom(
                this.httpService.post(url, {
                    to: userId,
                    messages: [{ type: 'text', text: message }],
                }, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 10000,
                })
            );

            this.logger.log(`LINE notification sent to ${userId}`);
            return true;
        } catch (error) {
            this.logger.error('LINE notification error:', error);
            return false;
        }
    }

    async sendLineFlexMessage(userId: string, title: string, content: any): Promise<boolean> {
        try {
            const accessToken = this.configService.get('LINE_CHANNEL_ACCESS_TOKEN');
            if (!accessToken) return false;

            const flexMessage = {
                type: 'flex',
                altText: title,
                contents: {
                    type: 'bubble',
                    body: {
                        type: 'box',
                        layout: 'vertical',
                        contents: [
                            { type: 'text', text: title, weight: 'bold', size: 'xl' },
                            { type: 'text', text: content.message || '', wrap: true },
                        ],
                    },
                    footer: content.link ? {
                        type: 'box',
                        layout: 'vertical',
                        contents: [{
                            type: 'button',
                            action: { type: 'uri', label: '查看詳情', uri: content.link },
                            style: 'primary',
                        }],
                    } : undefined,
                },
            };

            const url = 'https://api.line.me/v2/bot/message/push';

            await firstValueFrom(
                this.httpService.post(url, {
                    to: userId,
                    messages: [flexMessage],
                }, {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                })
            );

            return true;
        } catch (error) {
            this.logger.error('LINE Flex message error:', error);
            return false;
        }
    }

    // ===== 通用通知 =====

    async sendNotification(payload: NotificationPayload): Promise<{ success: boolean; channels: string[] }> {
        const results: string[] = [];

        // LINE 通知
        if (payload.lineUserId) {
            const content = payload.link
                ? `${payload.title}\n\n${payload.message}\n\n👉 ${payload.link}`
                : `${payload.title}\n\n${payload.message}`;

            const lineSuccess = await this.sendLineNotification(payload.lineUserId, content);
            if (lineSuccess) results.push('line');
        }

        // Email 通知 (placeholder - 需要整合 Email 服務)
        if (payload.email) {
            this.logger.log(`Email notification queued for ${payload.email}`);
            results.push('email_queued');
        }

        return {
            success: results.length > 0,
            channels: results,
        };
    }

    // ===== Webhook 發送 =====

    async sendWebhook(url: string, payload: any): Promise<boolean> {
        try {
            await firstValueFrom(
                this.httpService.post(url, payload, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 15000,
                })
            );

            this.logger.log(`Webhook sent to ${url}`);
            return true;
        } catch (error) {
            this.logger.error(`Webhook error for ${url}:`, error);
            return false;
        }
    }
}
