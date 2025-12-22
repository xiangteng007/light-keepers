import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as Papa from 'papaparse';

export interface Shelter {
    id: string;
    name: string;
    city: string;
    district: string;
    address: string;
    latitude: number;
    longitude: number;
    capacity: number;
    type: string;
    status: 'open' | 'closed' | 'standby';
    phone?: string;
}

export interface AedLocation {
    id: string;
    name: string;
    address: string;
    city: string;
    district: string;
    latitude: number;
    longitude: number;
    placeName: string;
    floor?: string;
    openHours?: string;
    phone?: string;
}

@Injectable()
export class PublicResourcesService {
    private readonly logger = new Logger(PublicResourcesService.name);

    // 快取
    private shelterCache: Shelter[] = [];
    private aedCache: AedLocation[] = [];
    private shelterCacheTime: Date | null = null;
    private aedCacheTime: Date | null = null;
    private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 小時

    // 政府開放資料來源
    private readonly SHELTER_API = 'https://data.gov.tw/api/v2/rest/datastore/A68D1F66-FCDE-475D-9D9E-AF3B75B48D4F?format=json';
    private readonly AED_CSV_URL = 'https://tw-aed.mohw.gov.tw/openData?t=csv';

    constructor(private readonly httpService: HttpService) { }

    /**
     * 取得避難收容所資料
     */
    async getShelters(): Promise<Shelter[]> {
        // 檢查快取
        if (this.shelterCache.length > 0 && this.shelterCacheTime) {
            const age = Date.now() - this.shelterCacheTime.getTime();
            if (age < this.CACHE_TTL_MS) {
                return this.shelterCache;
            }
        }

        try {
            this.logger.log('Fetching shelters from government open data...');
            const response = await firstValueFrom(
                this.httpService.get(this.SHELTER_API, { timeout: 30000 })
            );

            const records = response.data?.result?.records || [];
            this.shelterCache = records.map((r: any, index: number) => ({
                id: r.id || `shelter-${index}`,
                name: r.name || r.Shelter_Name || r['收容所名稱'] || '未命名',
                city: r.city || r.City || r['縣市'] || '',
                district: r.district || r.District || r['鄉鎮市區'] || '',
                address: r.address || r.Address || r['地址'] || '',
                latitude: parseFloat(r.lat || r.Lat || r['緯度'] || 0),
                longitude: parseFloat(r.lon || r.Lon || r['經度'] || 0),
                capacity: parseInt(r.capacity || r.Capacity || r['收容人數'] || 0, 10),
                type: r.type || r.Type || r['類型'] || '一般',
                status: 'standby' as const,
            })).filter((s: Shelter) => s.latitude && s.longitude);

            this.shelterCacheTime = new Date();
            this.logger.log(`Loaded ${this.shelterCache.length} shelters`);
            return this.shelterCache;
        } catch (error) {
            this.logger.error(`Failed to fetch shelters: ${error.message}`);
            // 返回備用靜態資料
            return this.getStaticShelters();
        }
    }

    /**
     * 取得 AED 位置資料
     */
    async getAedLocations(): Promise<AedLocation[]> {
        // 檢查快取
        if (this.aedCache.length > 0 && this.aedCacheTime) {
            const age = Date.now() - this.aedCacheTime.getTime();
            if (age < this.CACHE_TTL_MS) {
                return this.aedCache;
            }
        }

        try {
            this.logger.log('Fetching AED locations from MOHW...');
            const response = await firstValueFrom(
                this.httpService.get<string>(this.AED_CSV_URL, {
                    timeout: 60000,
                    responseType: 'text',
                })
            );

            // 解析 CSV
            const csvData = response.data as string;
            const parsed = Papa.parse(csvData, {
                header: true,
                skipEmptyLines: true,
            });

            this.aedCache = (parsed.data as any[]).map((r: any, index: number) => ({
                id: `aed-${index}`,
                name: r['場所名稱'] || r['name'] || '未命名',
                address: r['地址'] || r['address'] || '',
                city: r['縣市'] || r['city'] || '',
                district: r['鄉鎮市區'] || r['district'] || '',
                latitude: parseFloat(r['緯度'] || r['lat'] || 0),
                longitude: parseFloat(r['經度'] || r['lng'] || 0),
                placeName: r['放置地點'] || r['place'] || '',
                floor: r['樓層'] || '',
                openHours: r['開放時間'] || '',
                phone: r['聯絡電話'] || '',
            })).filter((a: AedLocation) => a.latitude && a.longitude);

            this.aedCacheTime = new Date();
            this.logger.log(`Loaded ${this.aedCache.length} AED locations`);
            return this.aedCache;
        } catch (error) {
            this.logger.error(`Failed to fetch AED locations: ${error.message}`);
            return this.getStaticAedLocations();
        }
    }

    /**
     * 依據位置查找附近的避難所
     */
    async findNearbyShelters(lat: number, lng: number, radiusKm: number = 5): Promise<Shelter[]> {
        const shelters = await this.getShelters();
        return shelters.filter(s => {
            const distance = this.calculateDistance(lat, lng, s.latitude, s.longitude);
            return distance <= radiusKm;
        }).sort((a, b) => {
            const distA = this.calculateDistance(lat, lng, a.latitude, a.longitude);
            const distB = this.calculateDistance(lat, lng, b.latitude, b.longitude);
            return distA - distB;
        });
    }

    /**
     * 依據位置查找附近的 AED
     */
    async findNearbyAed(lat: number, lng: number, radiusKm: number = 2): Promise<AedLocation[]> {
        const aedLocations = await this.getAedLocations();
        return aedLocations.filter(a => {
            const distance = this.calculateDistance(lat, lng, a.latitude, a.longitude);
            return distance <= radiusKm;
        }).sort((a, b) => {
            const distA = this.calculateDistance(lat, lng, a.latitude, a.longitude);
            const distB = this.calculateDistance(lat, lng, b.latitude, b.longitude);
            return distA - distB;
        });
    }

    /**
     * Haversine 公式計算兩點距離（公里）
     */
    private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
        const R = 6371; // 地球半徑（公里）
        const dLat = this.toRad(lat2 - lat1);
        const dLon = this.toRad(lon2 - lon1);
        const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(this.toRad(lat1)) * Math.cos(this.toRad(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    private toRad(deg: number): number {
        return deg * (Math.PI / 180);
    }

    /**
     * 備用靜態避難所資料（主要縣市）
     */
    private getStaticShelters(): Shelter[] {
        return [
            { id: 's1', name: '台北市立體育館', city: '台北市', district: '松山區', address: '台北市松山區南京東路四段', latitude: 25.0510, longitude: 121.5569, capacity: 2000, type: '室內', status: 'standby' },
            { id: 's2', name: '新北市板橋體育館', city: '新北市', district: '板橋區', address: '新北市板橋區漢生東路', latitude: 25.0125, longitude: 121.4593, capacity: 1500, type: '室內', status: 'standby' },
            { id: 's3', name: '桃園巨蛋體育館', city: '桃園市', district: '桃園區', address: '桃園市桃園區三民路', latitude: 24.9936, longitude: 121.3010, capacity: 3000, type: '室內', status: 'standby' },
            { id: 's4', name: '台中市政府活動中心', city: '台中市', district: '西屯區', address: '台中市西屯區台灣大道', latitude: 24.1557, longitude: 120.6402, capacity: 1000, type: '室內', status: 'standby' },
            { id: 's5', name: '高雄巨蛋', city: '高雄市', district: '左營區', address: '高雄市左營區博愛二路', latitude: 22.6694, longitude: 120.3030, capacity: 5000, type: '室內', status: 'standby' },
        ];
    }

    /**
     * 備用靜態 AED 資料
     */
    private getStaticAedLocations(): AedLocation[] {
        return [
            { id: 'a1', name: '台北車站大廳', city: '台北市', district: '中正區', address: '台北市中正區北平西路3號', latitude: 25.0478, longitude: 121.5170, placeName: '1樓大廳服務台', openHours: '24小時' },
            { id: 'a2', name: '台北101購物中心', city: '台北市', district: '信義區', address: '台北市信義區信義路五段7號', latitude: 25.0339, longitude: 121.5644, placeName: 'B1服務台', openHours: '11:00-21:30' },
            { id: 'a3', name: '新北市政府', city: '新北市', district: '板橋區', address: '新北市板橋區中山路一段161號', latitude: 25.0105, longitude: 121.4649, placeName: '1樓大廳', openHours: '08:00-18:00' },
            { id: 'a4', name: '台中高鐵站', city: '台中市', district: '烏日區', address: '台中市烏日區站區二路8號', latitude: 24.1127, longitude: 120.6161, placeName: '1樓大廳', openHours: '06:00-24:00' },
            { id: 'a5', name: '高雄捷運美麗島站', city: '高雄市', district: '新興區', address: '高雄市新興區中山一路', latitude: 22.6317, longitude: 120.3020, placeName: '站內服務台', openHours: '06:00-24:00' },
        ];
    }
}
