import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { NcdrAlert } from './entities';
import {
    NcdrAlertQueryDto,
    CORE_ALERT_TYPES,
    NATURAL_DISASTER_TYPES,
    ALERT_TYPE_DEFINITIONS,
    AlertTypeDefinition,
} from './dto';

// NCDR API 端點
const NCDR_BASE_URL = 'https://alerts.ncdr.nat.gov.tw';
const NCDR_ATOM_FEED = `${NCDR_BASE_URL}/RssAtomFeed.ashx`;

@Injectable()
export class NcdrAlertsService {
    private readonly logger = new Logger(NcdrAlertsService.name);
    private lastSyncTime: Date | null = null;
    private syncInProgress = false;

    constructor(
        @InjectRepository(NcdrAlert)
        private readonly ncdrAlertRepository: Repository<NcdrAlert>,
    ) { }

    /**
     * 獲取所有示警類別定義
     */
    getAlertTypes(): AlertTypeDefinition[] {
        return ALERT_TYPE_DEFINITIONS;
    }

    /**
     * 獲取核心類別 IDs (預設載入)
     */
    getCoreAlertTypes(): number[] {
        return CORE_ALERT_TYPES;
    }

    /**
     * 從 NCDR 獲取指定類別的警報
     * @param alertTypeId 示警類別 ID
     */
    async fetchAlertsByType(alertTypeId: number): Promise<any[]> {
        try {
            const url = `${NCDR_ATOM_FEED}?AlertType=${alertTypeId}`;
            this.logger.log(`Fetching NCDR alerts from: ${url}`);

            const response = await axios.get(url, { timeout: 10000 });
            const result = await parseStringPromise(response.data, {
                explicitArray: false,
                ignoreAttrs: false,
            });

            const feed = result.feed;
            if (!feed || !feed.entry) {
                return [];
            }

            // 確保 entry 是陣列
            const entries = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
            return entries;
        } catch (error) {
            this.logger.error(`Failed to fetch NCDR alerts for type ${alertTypeId}: ${error.message}`);
            return [];
        }
    }

    /**
     * 解析 Atom Entry 為 NcdrAlert
     */
    parseAtomEntry(entry: any, alertTypeId: number): Partial<NcdrAlert> | null {
        try {
            const alertId = entry.id || entry.$.id;
            const title = entry.title?._ || entry.title || '';
            const summary = entry.summary?._ || entry.summary || '';
            const updated = entry.updated || new Date().toISOString();
            const link = entry.link?.$?.href || entry.link?.href || '';

            // 從類別定義獲取資訊
            const typeInfo = ALERT_TYPE_DEFINITIONS.find(t => t.id === alertTypeId);

            // 判斷嚴重程度
            let severity: 'critical' | 'warning' | 'info' = 'warning';
            if (['地震', '海嘯', '颱風'].some(k => title.includes(k))) {
                severity = 'critical';
            } else if (['低溫', '濃霧', '強風'].some(k => title.includes(k))) {
                severity = 'info';
            }

            // 解析座標 - 支援多種格式
            let latitude: number | null = null;
            let longitude: number | null = null;

            // 嘗試 georss:point (格式: "lat lon")
            const point = entry['georss:point'] || entry.point;
            if (point) {
                const coords = String(point).trim().split(/\s+/);
                if (coords.length >= 2) {
                    latitude = parseFloat(coords[0]);
                    longitude = parseFloat(coords[1]);
                }
            }

            // 嘗試 geo:lat 和 geo:long
            if (!latitude) {
                const geoLat = entry['geo:lat'] || entry.lat;
                const geoLong = entry['geo:long'] || entry['geo:lon'] || entry.long || entry.lon;
                if (geoLat && geoLong) {
                    latitude = parseFloat(String(geoLat));
                    longitude = parseFloat(String(geoLong));
                }
            }

            // 嘗試 georss:polygon (格式: "lat1 lon1 lat2 lon2 ...")，取中心點
            const polygon = entry['georss:polygon'] || entry.polygon;
            if (!latitude && polygon) {
                const coords = String(polygon).trim().split(/\s+/);
                if (coords.length >= 2) {
                    const lats: number[] = [];
                    const lngs: number[] = [];
                    for (let i = 0; i < coords.length - 1; i += 2) {
                        lats.push(parseFloat(coords[i]));
                        lngs.push(parseFloat(coords[i + 1]));
                    }
                    // 計算中心點
                    latitude = lats.reduce((a, b) => a + b, 0) / lats.length;
                    longitude = lngs.reduce((a, b) => a + b, 0) / lngs.length;
                }
            }

            // 對於台灣的警報，如果沒有座標，使用類型預設座標
            if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
                // 根據警報類型設定預設座標（台灣中心附近）
                const defaultCoords: Record<number, [number, number]> = {
                    33: [23.6978, 120.9605], // 地震 - 台灣中心
                    34: [23.5, 121.5],       // 海嘯 - 東海岸
                    5: [23.6978, 120.9605],  // 颱風 - 台灣中心
                    6: [25.0330, 121.5654],  // 雷雨 - 台北
                    37: [23.6978, 120.9605], // 降雨 - 台灣中心
                    38: [23.8, 120.8],       // 土石流 - 中部山區
                    53: [25.0330, 121.5654], // 火災 - 台北
                };
                const defaultCoord = defaultCoords[alertTypeId] || [23.6978, 120.9605];
                latitude = defaultCoord[0];
                longitude = defaultCoord[1];
            }

            return {
                alertId: String(alertId).substring(0, 255),
                alertTypeId,
                alertTypeName: typeInfo?.name || '未知',
                title: String(title).substring(0, 500),
                description: String(summary),
                severity,
                sourceUnit: typeInfo?.sourceUnit || '未知',
                publishedAt: new Date(updated),
                sourceLink: String(link).substring(0, 1000),
                latitude,
                longitude,
                isActive: true,
            };
        } catch (error) {
            this.logger.error(`Failed to parse entry: ${error.message}`);
            return null;
        }
    }

    /**
     * 同步指定類別的警報到資料庫
     * @param typeIds 要同步的類別 IDs
     */
    async syncAlertTypes(typeIds: number[]): Promise<{ synced: number; errors: number }> {
        if (this.syncInProgress) {
            this.logger.warn('Sync already in progress, skipping...');
            return { synced: 0, errors: 0 };
        }

        this.syncInProgress = true;
        let synced = 0;
        let errors = 0;

        try {
            for (const typeId of typeIds) {
                // 限制請求頻率，每個類別間隔 500ms
                await new Promise(resolve => setTimeout(resolve, 500));

                const entries = await this.fetchAlertsByType(typeId);

                for (const entry of entries) {
                    const parsed = this.parseAtomEntry(entry, typeId);
                    if (!parsed || !parsed.alertId) continue;

                    try {
                        // 檢查是否已存在
                        const existing = await this.ncdrAlertRepository.findOne({
                            where: { alertId: parsed.alertId },
                        });

                        if (!existing) {
                            await this.ncdrAlertRepository.save(parsed);
                            synced++;
                        } else if (!existing.latitude || !existing.longitude) {
                            // 更新缺少座標的現有記錄
                            await this.ncdrAlertRepository.update(existing.id, {
                                latitude: parsed.latitude,
                                longitude: parsed.longitude,
                            });
                            synced++;
                        }
                    } catch (err) {
                        errors++;
                    }
                }
            }

            this.lastSyncTime = new Date();
            this.logger.log(`Sync completed: ${synced} new alerts, ${errors} errors`);
        } finally {
            this.syncInProgress = false;
        }

        return { synced, errors };
    }

    /**
     * 排程任務：每 10 分鐘同步核心類別
     * 只同步核心類別以避免流量爆掉
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async scheduledSync(): Promise<void> {
        this.logger.log('Running scheduled sync for core alert types...');
        await this.syncAlertTypes(CORE_ALERT_TYPES);
    }

    /**
     * 查詢警報列表
     * 自然災害保留 7 天，非自然災害保留 24 小時
     */
    async findAll(query: NcdrAlertQueryDto): Promise<{ data: NcdrAlert[]; total: number }> {
        const { types, county, activeOnly, withLocation, limit = 50, offset = 0 } = query;

        const qb = this.ncdrAlertRepository.createQueryBuilder('alert');

        // 類別篩選
        if (types && types.length > 0) {
            qb.andWhere('alert.alertTypeId IN (:...types)', { types });
        }

        // 僅有效警報
        if (activeOnly) {
            qb.andWhere('alert.isActive = :isActive', { isActive: true });
        }

        // 僅有座標 (地圖用)
        if (withLocation) {
            qb.andWhere('alert.latitude IS NOT NULL');
            qb.andWhere('alert.longitude IS NOT NULL');
        }

        // 縣市篩選
        if (county) {
            qb.andWhere('alert.affectedAreas LIKE :county', { county: `%${county}%` });
        }

        // 時間範圍過濾：自然災害 7 天，非自然災害 24 小時
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        // 使用 OR 條件：(自然災害 AND 7天內) OR (非自然災害 AND 24小時內)
        qb.andWhere(
            `(
                (alert.alertTypeId IN (:...naturalTypes) AND alert.publishedAt >= :sevenDaysAgo)
                OR
                (alert.alertTypeId NOT IN (:...naturalTypes) AND alert.publishedAt >= :oneDayAgo)
            )`,
            {
                naturalTypes: NATURAL_DISASTER_TYPES,
                sevenDaysAgo,
                oneDayAgo,
            }
        );

        qb.orderBy('alert.publishedAt', 'DESC')
            .take(limit)
            .skip(offset);

        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }

    /**
     * 獲取有座標的警報 (地圖用)
     * 自然災害保留 7 天，非自然災害保留 24 小時
     */
    async findWithLocation(types?: number[]): Promise<NcdrAlert[]> {
        const qb = this.ncdrAlertRepository.createQueryBuilder('alert')
            .where('alert.latitude IS NOT NULL')
            .andWhere('alert.longitude IS NOT NULL')
            .andWhere('alert.isActive = :isActive', { isActive: true });

        if (types && types.length > 0) {
            qb.andWhere('alert.alertTypeId IN (:...types)', { types });
        }

        // 時間範圍過濾：自然災害 7 天，非自然災害 24 小時
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        qb.andWhere(
            `(
                (alert.alertTypeId IN (:...naturalTypes) AND alert.publishedAt >= :sevenDaysAgo)
                OR
                (alert.alertTypeId NOT IN (:...naturalTypes) AND alert.publishedAt >= :oneDayAgo)
            )`,
            {
                naturalTypes: NATURAL_DISASTER_TYPES,
                sevenDaysAgo,
                oneDayAgo,
            }
        );

        return qb.orderBy('alert.publishedAt', 'DESC').getMany();
    }

    /**
     * 獲取統計資料
     */
    async getStats(): Promise<{
        total: number;
        active: number;
        byType: { typeId: number; typeName: string; count: number }[];
        lastSyncTime: Date | null;
    }> {
        const total = await this.ncdrAlertRepository.count();
        const active = await this.ncdrAlertRepository.count({ where: { isActive: true } });

        const byType = await this.ncdrAlertRepository
            .createQueryBuilder('alert')
            .select('alert.alertTypeId', 'typeId')
            .addSelect('alert.alertTypeName', 'typeName')
            .addSelect('COUNT(*)', 'count')
            .groupBy('alert.alertTypeId')
            .addGroupBy('alert.alertTypeName')
            .getRawMany();

        return { total, active, byType, lastSyncTime: this.lastSyncTime };
    }

    /**
     * 標記過期警報為非活動
     */
    async deactivateExpiredAlerts(): Promise<number> {
        const result = await this.ncdrAlertRepository
            .createQueryBuilder()
            .update(NcdrAlert)
            .set({ isActive: false })
            .where('expiresAt IS NOT NULL')
            .andWhere('expiresAt < :now', { now: new Date() })
            .andWhere('isActive = :isActive', { isActive: true })
            .execute();

        return result.affected || 0;
    }
}
