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

import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';

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
@Controller('public')
export class PublicController {

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
        // TODO: 注入 AnnouncementsService 並查詢公開公告
        // 目前返回空陣列，待模組整合完成
        return {
            data: [],
            total: 0,
        };
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
        // TODO: 注入 PublicResourcesService 並查詢避難所
        return {
            data: [],
            total: 0,
        };
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
        // TODO: 注入 PublicResourcesService 並查詢 AED
        return {
            data: [],
            total: 0,
        };
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
        // TODO: 注入 NcdrAlertsService 並查詢有效預警
        return {
            data: [],
            total: 0,
        };
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
    ): Promise<PublicWeather | null> {
        // TODO: 注入 WeatherForecastService 並查詢氣象
        return null;
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
