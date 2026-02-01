/**
 * Public Controller - Level 0 公開端點
 * 
 * 所有端點皆為公開，不需要登入即可存取。
 * 
 * 安全規範：
 * - 僅回傳可公開的資料
 * - 個資遮罩或移除
 * - 禁止回傳敏感資訊
 */

import { Controller, Get, Query, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AnnouncementsService } from '../announcements/announcements.service';
import { PublicResourcesService } from '../public-resources/public-resources.service';
import { NcdrAlertsService } from '../ncdr-alerts/ncdr-alerts.service';
import { WeatherService } from '../weather-service/weather.service';
import { Public } from '../shared/shared-auth.module';

// 公開公告 DTO (已遮罩)
interface PublicAnnouncement {
    id: string;
    title: string;
    content: string;
    category: string;
    publishedAt: string;
    expiresAt?: string;
}

// 公開避難所 DTO
interface PublicShelter {
    id: string;
    name: string;
    address: string;
    latitude: number;
    longitude: number;
    capacity: number;
    type: string;
    phone?: string;
}

// 公開預警 DTO
interface PublicAlert {
    id: string;
    title: string;
    description: string;
    severity: string;
    category: string;
    effectiveAt: string;
    expiresAt?: string;
    affectedAreas: string[];
}

// 公開氣象 DTO
interface PublicWeather {
    location: string;
    temperature: number;
    description: string;
    humidity: number;
    windSpeed: number;
    updatedAt: string;
}

@ApiTags('Public (Level 0)')
@Public()
@Controller('public')
export class PublicController {
    private readonly logger = new Logger(PublicController.name);

    constructor(
        private readonly announcementsService: AnnouncementsService,
        private readonly publicResourcesService: PublicResourcesService,
        private readonly ncdrAlertsService: NcdrAlertsService,
        private readonly weatherService: WeatherService,
    ) {}

    /**
     * 取得公開公告列表
     * Level 0 - 免登入
     */
    @Get('announcements')
    @ApiOperation({ summary: '取得公開公告列表 (Level 0)' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'category', required: false, type: String })
    async getPublicAnnouncements(
        @Query('limit') limit?: number,
        @Query('category') category?: string,
    ): Promise<{ data: PublicAnnouncement[]; total: number }> {
        try {
            const announcements = await this.announcementsService.findPublished({
                category: category as any,
                limit: limit || 20,
            });

            const data: PublicAnnouncement[] = announcements.map(a => ({
                id: a.id,
                title: a.title,
                content: a.content || '',
                category: a.category || 'general',
                publishedAt: a.publishedAt?.toISOString() || new Date().toISOString(),
                expiresAt: a.expireAt?.toISOString(),
            }));

            return { data, total: data.length };
        } catch (error) {
            this.logger.error('Failed to fetch announcements', error);
            return { data: [], total: 0 };
        }
    }

    /**
     * 取得公開避難所列表
     * Level 0 - 免登入
     */
    @Get('shelters')
    @ApiOperation({ summary: '取得公開避難所列表 (Level 0)' })
    @ApiQuery({ name: 'lat', required: false, type: Number, description: '緯度' })
    @ApiQuery({ name: 'lng', required: false, type: Number, description: '經度' })
    @ApiQuery({ name: 'radius', required: false, type: Number, description: '半徑 (km)' })
    @ApiQuery({ name: 'type', required: false, type: String, description: '類型篩選' })
    async getPublicShelters(
        @Query('lat') lat?: number,
        @Query('lng') lng?: number,
        @Query('radius') radius?: number,
        @Query('type') type?: string,
    ): Promise<{ data: PublicShelter[]; total: number }> {
        try {
            let shelters;
            if (lat && lng) {
                shelters = await this.publicResourcesService.findNearbyShelters(
                    Number(lat),
                    Number(lng),
                    Number(radius) || 5,
                );
            } else {
                shelters = await this.publicResourcesService.getShelters();
            }

            // Type filter
            if (type) {
                shelters = shelters.filter(s => s.type === type);
            }

            const data: PublicShelter[] = shelters.map(s => ({
                id: s.id,
                name: s.name,
                address: s.address,
                latitude: s.latitude,
                longitude: s.longitude,
                capacity: s.capacity,
                type: s.type,
                phone: s.phone,
            }));

            return { data, total: data.length };
        } catch (error) {
            this.logger.error('Failed to fetch shelters', error);
            return { data: [], total: 0 };
        }
    }

    /**
     * 取得公開 AED 位置
     * Level 0 - 免登入
     */
    @Get('aed')
    @ApiOperation({ summary: '取得公開 AED 位置 (Level 0)' })
    @ApiQuery({ name: 'lat', required: false, type: Number })
    @ApiQuery({ name: 'lng', required: false, type: Number })
    @ApiQuery({ name: 'radius', required: false, type: Number })
    async getPublicAed(
        @Query('lat') lat?: number,
        @Query('lng') lng?: number,
        @Query('radius') radius?: number,
    ): Promise<{ data: any[]; total: number }> {
        try {
            let aedLocations;
            if (lat && lng) {
                aedLocations = await this.publicResourcesService.findNearbyAed(
                    Number(lat),
                    Number(lng),
                    Number(radius) || 2,
                );
            } else {
                aedLocations = await this.publicResourcesService.getAedLocations();
            }

            return { data: aedLocations, total: aedLocations.length };
        } catch (error) {
            this.logger.error('Failed to fetch AED locations', error);
            return { data: [], total: 0 };
        }
    }

    /**
     * 取得公開預警資訊
     * Level 0 - 免登入
     */
    @Get('alerts')
    @ApiOperation({ summary: '取得公開預警資訊 (Level 0)' })
    @ApiQuery({ name: 'severity', required: false, type: String })
    @ApiQuery({ name: 'category', required: false, type: String })
    async getPublicAlerts(
        @Query('severity') severity?: string,
        @Query('category') category?: string,
    ): Promise<{ data: PublicAlert[]; total: number }> {
        try {
            const result = await this.ncdrAlertsService.findAll({
                activeOnly: true,
                limit: 50,
            });

            // Parse affectedAreas JSON and map to public DTO
            const data: PublicAlert[] = result.data.map(alert => {
                let areas: string[] = [];
                try {
                    areas = alert.affectedAreas ? JSON.parse(alert.affectedAreas) : [];
                } catch {
                    areas = [];
                }
                return {
                    id: alert.id,
                    title: alert.title,
                    description: alert.description || '',
                    severity: alert.severity || 'unknown',
                    category: alert.alertTypeName || 'general',
                    effectiveAt: alert.publishedAt?.toISOString() || new Date().toISOString(),
                    expiresAt: alert.expiresAt?.toISOString(),
                    affectedAreas: areas,
                };
            });

            // Filter by severity if provided
            const filteredData = severity
                ? data.filter(a => a.severity === severity)
                : data;

            return { data: filteredData, total: filteredData.length };
        } catch (error) {
            this.logger.error('Failed to fetch alerts', error);
            return { data: [], total: 0 };
        }
    }

    /**
     * 取得公開氣象資訊
     * Level 0 - 免登入
     */
    @Get('weather')
    @ApiOperation({ summary: '取得公開氣象資訊 (Level 0)' })
    @ApiQuery({ name: 'location', required: false, type: String })
    async getPublicWeather(
        @Query('location') location?: string,
    ): Promise<PublicWeather | { data: PublicWeather[]; total: number }> {
        try {
            const weatherData = this.weatherService.getCurrentWeather(location);

            if (weatherData.length === 0) {
                return { data: [], total: 0 };
            }

            const data: PublicWeather[] = weatherData.map(w => ({
                location: w.locationName || 'Unknown',
                temperature: w.temperature,
                description: w.description || '',
                humidity: w.humidity,
                windSpeed: w.windSpeed,
                updatedAt: w.updatedAt?.toISOString() || new Date().toISOString(),
            }));

            // If location specified, return single result
            if (location && data.length > 0) {
                return data[0];
            }

            return { data, total: data.length };
        } catch (error) {
            this.logger.error('Failed to fetch weather', error);
            return { data: [], total: 0 } as any;
        }
    }

    /**
     * 公開健康檢查
     * Level 0 - 用於前端確認 API 可用性
     */
    @Get('ping')
    @ApiOperation({ summary: '公開 ping (Level 0)' })
    ping(): { status: string; timestamp: string } {
        return {
            status: 'ok',
            timestamp: new Date().toISOString(),
        };
    }

    /**
     * 取得平台公開資訊
     * Level 0 - 免登入
     */
    @Get('info')
    @ApiOperation({ summary: '取得平台公開資訊 (Level 0)' })
    getPublicInfo(): {
        name: string;
        version: string;
        description: string;
        contact: { email: string };
    } {
        return {
            name: '光守護者災防平台',
            version: '1.0.0',
            description: '台灣光守護者協會 - AI 災害防救平台',
            contact: {
                email: 'contact@lightkeepers.ngo',
            },
        };
    }
}
