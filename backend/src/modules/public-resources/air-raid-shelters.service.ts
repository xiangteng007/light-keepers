import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AirRaidShelter } from './entities/air-raid-shelter.entity';
import {
    parseAirRaidShelterCsv,
    upsertAirRaidShelters,
    GeocodeFn,
    ImportSummary,
} from './air-raid-shelters.importer';

/**
 * 防空避難設施（Air-Raid Shelter）服務
 *
 * 與 `PublicResourcesService`（避難收容所 / AED，即時向政府 API/CSV 取資料、
 * 記憶體快取、不落地資料庫）不同：防空避難處所資料落地於 `air_raid_shelters`
 * 資料表，透過 backend/src/scripts/import-air-raid-shelters.ts 或
 * `AirRaidSheltersSyncService` 月度排程匯入/更新。
 */
@Injectable()
export class AirRaidSheltersService {
    private readonly logger = new Logger(AirRaidSheltersService.name);

    constructor(
        @InjectRepository(AirRaidShelter)
        private readonly repo: Repository<AirRaidShelter>,
    ) { }

    async findAll(): Promise<AirRaidShelter[]> {
        return this.repo.find({
            where: { isActive: true },
            order: { city: 'ASC', district: 'ASC' },
        });
    }

    /**
     * 依據位置查找附近的防空避難設施（Haversine 公式，km）。
     * 作法與 `PublicResourcesService.findNearbyShelters/findNearbyAed` 一致。
     */
    async findNearby(lat: number, lng: number, radiusKm = 2): Promise<AirRaidShelter[]> {
        const all = await this.findAll();
        return all
            .filter((s) => s.latitude !== null && s.longitude !== null)
            .filter((s) => this.calculateDistance(lat, lng, s.latitude, s.longitude) <= radiusKm)
            .sort(
                (a, b) =>
                    this.calculateDistance(lat, lng, a.latitude, a.longitude) -
                    this.calculateDistance(lat, lng, b.latitude, b.longitude),
            );
    }

    /**
     * 匯入/更新（upsert）防空避難處所資料。同一地址視為同一筆，更新既有資料。
     * 供 CLI 腳本與月度排程共用。
     */
    async importFromCsv(csvText: string, options?: { geocode?: GeocodeFn }): Promise<ImportSummary> {
        const rows = parseAirRaidShelterCsv(csvText);
        this.logger.log(`Parsed ${rows.length} air-raid shelter rows from CSV`);
        const summary = await upsertAirRaidShelters(this.repo, rows, options);
        this.logger.log(
            `Air-raid shelter import complete: +${summary.inserted} / ~${summary.updated} / skipped ${summary.skipped}` +
            (summary.missingCoordinates.length
                ? `; ${summary.missingCoordinates.length} rows missing coordinates`
                : ''),
        );
        return summary;
    }

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
}
