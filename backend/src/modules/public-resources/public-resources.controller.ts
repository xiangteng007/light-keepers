import {
    Controller,
    Get,
    Query,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PublicResourcesService, Shelter, AedLocation } from './public-resources.service';
import { AirRaidSheltersService } from './air-raid-shelters.service';
import { AirRaidShelter } from './entities/air-raid-shelter.entity';
import { Public } from '../shared/guards';

// 定級理由：避難收容所與 AED 位置屬救命用公開資訊（全為唯讀、無個資），與 PublicController(Level 0) 同性質，default-deny 下補標 @Public()。
@Public()
@Controller('public-resources')
export class PublicResourcesController {
    constructor(
        private readonly publicResourcesService: PublicResourcesService,
        private readonly airRaidSheltersService: AirRaidSheltersService,
    ) { }

    /**
     * 取得所有避難收容所
     * GET /public-resources/shelters
     */
    @Get('shelters')
    async getShelters(): Promise<{ data: Shelter[]; total: number }> {
        const shelters = await this.publicResourcesService.getShelters();
        return { data: shelters, total: shelters.length };
    }

    /**
     * 查找附近避難收容所
     * GET /public-resources/shelters/nearby?lat=25.05&lng=121.55&radius=5
     */
    @Get('shelters/nearby')
    async getNearbyShelters(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radius') radius?: string,
    ): Promise<{ data: Shelter[]; total: number }> {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radiusKm = parseFloat(radius || '5');

        if (isNaN(latitude) || isNaN(longitude)) {
            return { data: [], total: 0 };
        }

        const shelters = await this.publicResourcesService.findNearbyShelters(
            latitude,
            longitude,
            radiusKm,
        );
        return { data: shelters, total: shelters.length };
    }

    /**
     * 取得所有 AED 位置
     * GET /public-resources/aed
     */
    @Get('aed')
    async getAedLocations(): Promise<{ data: AedLocation[]; total: number }> {
        const aedLocations = await this.publicResourcesService.getAedLocations();
        return { data: aedLocations, total: aedLocations.length };
    }

    /**
     * 查找附近 AED
     * GET /public-resources/aed/nearby?lat=25.05&lng=121.55&radius=2
     */
    @Get('aed/nearby')
    async getNearbyAed(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radius') radius?: string,
    ): Promise<{ data: AedLocation[]; total: number }> {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radiusKm = parseFloat(radius || '2');

        if (isNaN(latitude) || isNaN(longitude)) {
            return { data: [], total: 0 };
        }

        const aedLocations = await this.publicResourcesService.findNearbyAed(
            latitude,
            longitude,
            radiusKm,
        );
        return { data: aedLocations, total: aedLocations.length };
    }

    /**
     * 取得地圖用資料（合併格式）
     * GET /public-resources/map?types=shelters,aed
     */
    @Get('map')
    async getMapData(
        @Query('types') types?: string,
    ): Promise<{ shelters?: Shelter[]; aed?: AedLocation[] }> {
        const requestedTypes = types ? types.split(',') : ['shelters', 'aed'];
        const result: { shelters?: Shelter[]; aed?: AedLocation[] } = {};

        if (requestedTypes.includes('shelters')) {
            result.shelters = await this.publicResourcesService.getShelters();
        }

        if (requestedTypes.includes('aed')) {
            result.aed = await this.publicResourcesService.getAedLocations();
        }

        return result;
    }

    /**
     * 取得所有防空避難設施（防空避難處所）
     * GET /public-resources/air-raid-shelters
     *
     * 資料來源：內政部警政署「防空避難處所」開放資料 (data.gov.tw)，經
     * backend/src/scripts/import-air-raid-shelters.ts 或月度排程匯入。
     * 與 /public-resources/shelters（長期收容所）為不同性質的設施，見
     * AirRaidShelter entity 註解說明。
     *
     * Level 0 公開端點：@Public() 允許匿名存取，@Throttle 限制每分鐘 30 次請求。
     */
    @Public()
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @Get('air-raid-shelters')
    async getAirRaidShelters(): Promise<{ data: AirRaidShelter[]; total: number }> {
        const shelters = await this.airRaidSheltersService.findAll();
        return { data: shelters, total: shelters.length };
    }

    /**
     * 查找附近防空避難設施
     * GET /public-resources/air-raid-shelters/nearby?lat=25.05&lng=121.55&radius=2
     *
     * Level 0 公開端點：@Public() 允許匿名存取，@Throttle 限制每分鐘 30 次請求。
     */
    @Public()
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    @Get('air-raid-shelters/nearby')
    async getNearbyAirRaidShelters(
        @Query('lat') lat: string,
        @Query('lng') lng: string,
        @Query('radius') radius?: string,
    ): Promise<{ data: AirRaidShelter[]; total: number }> {
        const latitude = parseFloat(lat);
        const longitude = parseFloat(lng);
        const radiusKm = parseFloat(radius || '2');

        if (isNaN(latitude) || isNaN(longitude)) {
            return { data: [], total: 0 };
        }

        const shelters = await this.airRaidSheltersService.findNearby(
            latitude,
            longitude,
            radiusKm,
        );
        return { data: shelters, total: shelters.length };
    }
}
