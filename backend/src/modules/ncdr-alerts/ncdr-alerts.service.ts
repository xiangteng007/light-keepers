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

        qb.orderBy('alert.publishedAt', 'DESC')
            .take(limit)
            .skip(offset);

        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }

    /**
     * 獲取有座標的警報 (地圖用)
     */
    async findWithLocation(types?: number[]): Promise<NcdrAlert[]> {
        const qb = this.ncdrAlertRepository.createQueryBuilder('alert')
            .where('alert.latitude IS NOT NULL')
            .andWhere('alert.longitude IS NOT NULL')
            .andWhere('alert.isActive = :isActive', { isActive: true });

        if (types && types.length > 0) {
            qb.andWhere('alert.alertTypeId IN (:...types)', { types });
        }

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
