import {
    Controller,
    Get,
    Query,
} from '@nestjs/common';
import { PublicResourcesService, Shelter, AedLocation } from './public-resources.service';

@Controller('public-resources')
export class PublicResourcesController {
    constructor(private readonly publicResourcesService: PublicResourcesService) { }

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
}
