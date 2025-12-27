import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { parseStringPromise } from 'xml2js';
import { NcdrAlert } from './entities';
import {
    NcdrAlertQueryDto,
    CORE_ALERT_TYPES,
    NATURAL_DISASTER_TYPES,
    ALERT_TYPE_DEFINITIONS,
    AlertTypeDefinition,
    CENTRAL_ALERT_TYPES,
    ENTERPRISE_ALERT_TYPES,
    LOCAL_ALERT_TYPES,
    ALL_ALERT_TYPES,
    getAlertCategory,
} from './dto';
import { LineBotService } from '../line-bot/line-bot.service';

// NCDR API 端點
const NCDR_BASE_URL = 'https://alerts.ncdr.nat.gov.tw';
const NCDR_ATOM_FEED = `${NCDR_BASE_URL}/RssAtomFeeds.ashx`;

// CWA (中央氣象署) OpenData API
const CWA_BASE_URL = 'https://opendata.cwa.gov.tw/api/v1/rest/datastore';
const CWA_EARTHQUAKE_ENDPOINT = `${CWA_BASE_URL}/E-A0015-001`; // 顯著有感地震

@Injectable()
export class NcdrAlertsService {
    private readonly logger = new Logger(NcdrAlertsService.name);
    private lastSyncTime: Date | null = null;
    private syncInProgress = false;
    private readonly cwaApiKey: string;

    constructor(
        @InjectRepository(NcdrAlert)
        private readonly ncdrAlertRepository: Repository<NcdrAlert>,
        private readonly lineBotService: LineBotService,
        private readonly configService: ConfigService,
    ) {
        // CWA API Key (需到 opendata.cwa.gov.tw 申請)
        this.cwaApiKey = this.configService.get<string>('CWA_API_KEY', 'CWA-423AE96E-5E49-46E3-AD03-08A3A71E9034');
    }

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
     * 從 CAP 檔案中擷取 HTML 網頁連結和座標
     * CAP 檔案中的 <web> 元素包含政府公告的實際網頁連結
     * CAP 檔案中的 <area><circle> 或 <polygon> 或 EventLatLon 包含座標
     * @param capUrl CAP 檔案的 URL
     */
    async fetchCapData(capUrl: string): Promise<{ webLink: string | null; latitude: number | null; longitude: number | null }> {
        try {
            const response = await axios.get(capUrl, { timeout: 8000 });
            const result = await parseStringPromise(response.data, {
                explicitArray: false,
                ignoreAttrs: true,
            });

            // CAP 結構：alert > info > web, alert > info > area
            const alert = result.alert;
            if (!alert || !alert.info) {
                return { webLink: null, latitude: null, longitude: null };
            }

            // info 可能是陣列或單一物件
            const info = Array.isArray(alert.info) ? alert.info[0] : alert.info;

            // 擷取 web link
            let webLink: string | null = null;
            if (info?.web && typeof info.web === 'string' && info.web.startsWith('http')) {
                webLink = info.web;
            }

            // 擷取座標
            let latitude: number | null = null;
            let longitude: number | null = null;

            // 方法 1: 從 <area><circle> 擷取 (格式: "lat,lon radius")
            const area = info?.area;
            if (area) {
                const areas = Array.isArray(area) ? area : [area];
                for (const a of areas) {
                    if (a.circle && !latitude) {
                        // 格式: "22.881,121.078 0.000" (lat,lon radius)
                        const circleStr = String(a.circle);
                        const match = circleStr.match(/([0-9.]+),([0-9.]+)/);
                        if (match) {
                            latitude = parseFloat(match[1]);
                            longitude = parseFloat(match[2]);
                        }
                    }
                    if (a.polygon && !latitude) {
                        // 格式: "lat1,lon1 lat2,lon2 ..." - 取中心點
                        const polygonStr = String(a.polygon);
                        const coords = polygonStr.trim().split(/\s+/);
                        const lats: number[] = [];
                        const lngs: number[] = [];
                        for (const coord of coords) {
                            const parts = coord.split(',');
                            if (parts.length === 2) {
                                lats.push(parseFloat(parts[0]));
                                lngs.push(parseFloat(parts[1]));
                            }
                        }
                        if (lats.length > 0) {
                            latitude = lats.reduce((a, b) => a + b, 0) / lats.length;
                            longitude = lngs.reduce((a, b) => a + b, 0) / lngs.length;
                        }
                    }
                }
            }

            // 方法 2: 從 EventLatLon parameter 擷取
            if (!latitude && info?.parameter) {
                const params = Array.isArray(info.parameter) ? info.parameter : [info.parameter];
                for (const p of params) {
                    if (p.valueName === 'EventLatLon' && p.value) {
                        // 格式: "22.881,121.078 0.000"
                        const match = String(p.value).match(/([0-9.]+),([0-9.]+)/);
                        if (match) {
                            latitude = parseFloat(match[1]);
                            longitude = parseFloat(match[2]);
                        }
                    }
                }
            }

            return { webLink, latitude, longitude };
        } catch (error) {
            // CAP 擷取失敗不影響主流程，只記錄警告
            this.logger.warn(`Failed to fetch CAP data: ${capUrl} - ${error.message}`);
            return { webLink: null, latitude: null, longitude: null };
        }
    }

    /**
     * 從 CAP 檔案中擷取 HTML 網頁連結 (相容舊版呼叫)
     */
    async fetchWebLinkFromCap(capUrl: string): Promise<string | null> {
        const result = await this.fetchCapData(capUrl);
        return result.webLink;
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

            // 根據標題內容修正類別 (NCDR API 有時會將警報放在錯誤的 feed 中)
            // 使用正確的 5 位數 NCDR AlertType ID
            let actualTypeId = alertTypeId;
            const titleStr = String(title);

            // 自然災害優先檢測
            if (titleStr.includes('地震') || titleStr.includes('有感地震')) {
                actualTypeId = 10501; // 地震
            } else if (titleStr.includes('海嘯')) {
                actualTypeId = 10502; // 海嘯
            } else if (titleStr.includes('颱風') || titleStr.includes('熱帶性低氣壓')) {
                actualTypeId = 10401; // 颱風
            } else if (titleStr.includes('雷雨') || titleStr.includes('大雷雨')) {
                actualTypeId = 10701; // 大雨特報
            } else if (titleStr.includes('大雨') || titleStr.includes('豪雨') || titleStr.includes('降雨')) {
                actualTypeId = 10702; // 豪雨特報
            } else if (titleStr.includes('土石流')) {
                actualTypeId = 30501; // 土石流
            } else if (titleStr.includes('火災') && !titleStr.includes('鐵路')) {
                actualTypeId = 40601; // 火災
            } else if (titleStr.includes('林火') || titleStr.includes('森林火災')) {
                actualTypeId = 30301; // 林火
                // 氣象類
            } else if (titleStr.includes('低溫') || titleStr.includes('寒流')) {
                actualTypeId = 10601; // 低溫特報
            } else if (titleStr.includes('濃霧') || titleStr.includes('大霧')) {
                actualTypeId = 10603; // 濃霧特報
            } else if (titleStr.includes('強風') || titleStr.includes('陣風')) {
                actualTypeId = 10602; // 陸上強風特報
            } else if (titleStr.includes('高溫') || titleStr.includes('熱浪')) {
                actualTypeId = 10604; // 高溫特報
                // 水利類
            } else if (titleStr.includes('淹水')) {
                actualTypeId = 20101; // 淹水警戒
            } else if (titleStr.includes('水庫') && titleStr.includes('放流')) {
                actualTypeId = 20201; // 水庫放流
            } else if (titleStr.includes('河川') && titleStr.includes('水位')) {
                actualTypeId = 20301; // 河川高水位
                // 交通類
            } else if (titleStr.includes('鐵路事故') || titleStr.includes('臺鐵') || titleStr.includes('台鐵')) {
                actualTypeId = 50101; // 鐵路事故
            } else if (titleStr.includes('高鐵')) {
                actualTypeId = 50201; // 鐵路事故(高鐵)
            } else if (titleStr.includes('捷運')) {
                actualTypeId = 50501; // 捷運營運
            } else if (titleStr.includes('道路封閉') || titleStr.includes('道路中斷')) {
                actualTypeId = 50301; // 道路封閉
                // 公共服務類
            } else if (titleStr.includes('停水')) {
                actualTypeId = 60101; // 停水
            } else if (titleStr.includes('停電') || titleStr.includes('電力')) {
                actualTypeId = 60201; // 電力
            } else if (titleStr.includes('空氣品質') || titleStr.includes('空污')) {
                actualTypeId = 70101; // 空氣品質
            }

            // 從類別定義獲取資訊
            const typeInfo = ALERT_TYPE_DEFINITIONS.find(t => t.id === actualTypeId);

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
                // 根據警報類型設定預設座標（使用修正後的 actualTypeId)
                const defaultCoords: Record<number, [number, number]> = {
                    10501: [23.9, 121.6],       // 地震 - 台灣東部海域
                    10502: [23.5, 121.8],       // 海嘯 - 東海岸外海
                    10401: [23.6978, 120.9605], // 颱風 - 台灣中心
                    10701: [25.0330, 121.5654], // 大雨特報 - 台北
                    10702: [23.6978, 120.9605], // 豪雨特報 - 台灣中心
                    30501: [23.8, 120.8],       // 土石流 - 中部山區
                    40601: [25.0330, 121.5654], // 火災 - 台北
                    50101: [24.5, 121.0],       // 鐵路事故 - 中部鐵路線
                    50201: [24.8, 121.0],       // 高鐵 - 高鐵沿線
                    10601: [23.6978, 120.9605], // 低溫特報 - 台灣中心
                    10604: [23.6978, 120.9605], // 高溫特報 - 台灣中心
                    10602: [23.6978, 120.9605], // 陸上強風特報 - 台灣中心
                    10603: [23.6978, 120.9605], // 濃霧特報 - 台灣中心
                };
                const defaultCoord = defaultCoords[actualTypeId] || [23.6978, 120.9605];
                latitude = defaultCoord[0];
                longitude = defaultCoord[1];
            }

            return {
                alertId: String(alertId).substring(0, 255),
                alertTypeId: actualTypeId,
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
     * 以 RSS Feed 為唯一來源，不在 Feed 中的警報將被標記為非活動
     * @param typeIds 要同步的類別 IDs
     */
    async syncAlertTypes(typeIds: number[]): Promise<{ synced: number; errors: number; deactivated: number }> {
        if (this.syncInProgress) {
            this.logger.warn('Sync already in progress, skipping...');
            return { synced: 0, errors: 0, deactivated: 0 };
        }

        this.syncInProgress = true;
        let synced = 0;
        let errors = 0;
        let deactivated = 0;
        const activeAlertIds: string[] = []; // 收集 RSS Feed 中的所有 alertId

        try {
            for (const typeId of typeIds) {
                // 限制請求頻率，每個類別間隔 500ms
                await new Promise(resolve => setTimeout(resolve, 500));

                const entries = await this.fetchAlertsByType(typeId);

                for (const entry of entries) {
                    const parsed = this.parseAtomEntry(entry, typeId);
                    if (!parsed || !parsed.alertId) continue;

                    // 記錄此 alert 仍在 RSS Feed 中
                    activeAlertIds.push(parsed.alertId);

                    try {
                        // 檢查是否已存在
                        const existing = await this.ncdrAlertRepository.findOne({
                            where: { alertId: parsed.alertId },
                        });

                        if (!existing) {
                            // 從 CAP 擷取真正的 HTML 網頁連結和座標
                            if (parsed.sourceLink && parsed.sourceLink.endsWith('.cap')) {
                                const capData = await this.fetchCapData(parsed.sourceLink);
                                if (capData.webLink) {
                                    parsed.sourceLink = capData.webLink;
                                }
                                // 使用 CAP 中的座標（如果有的話）
                                if (capData.latitude && capData.longitude) {
                                    parsed.latitude = capData.latitude;
                                    parsed.longitude = capData.longitude;
                                    this.logger.debug(`Got coords from CAP: ${capData.latitude}, ${capData.longitude}`);
                                }
                            }
                            await this.ncdrAlertRepository.save(parsed);
                            synced++;

                            // 🔔 LINE 推播：重大災害警報自動廣播
                            if (parsed.severity === 'critical' && this.lineBotService.isEnabled()) {
                                try {
                                    const alertMsg = `⚠️ ${parsed.alertTypeName}警報\n\n${parsed.title}\n\n${parsed.description?.substring(0, 100) || ''}`;
                                    await this.lineBotService.broadcast(alertMsg);
                                    this.logger.log(`LINE broadcast sent for critical alert: ${parsed.title}`);
                                } catch (lineErr) {
                                    this.logger.warn(`Failed to send LINE broadcast: ${lineErr.message}`);
                                }
                            }
                        } else {
                            // 確保已存在的警報是活動的
                            if (!existing.isActive) {
                                await this.ncdrAlertRepository.update(existing.id, { isActive: true });
                                synced++;
                            }

                            // 檢查是否需要更新分類或座標
                            // 如果現有座標是預設座標（台灣中心附近），嘗試從 CAP 獲取精確座標
                            const isDefaultCoord = Math.abs(existing.latitude - 23.6978) < 0.1 && Math.abs(existing.longitude - 120.9605) < 0.1;

                            if (isDefaultCoord && parsed.sourceLink && parsed.sourceLink.endsWith('.cap')) {
                                const capData = await this.fetchCapData(parsed.sourceLink);
                                if (capData.latitude && capData.longitude) {
                                    await this.ncdrAlertRepository.update(existing.id, {
                                        latitude: capData.latitude,
                                        longitude: capData.longitude,
                                    });
                                    this.logger.log(`Updated coords for ${existing.alertId}: ${capData.latitude}, ${capData.longitude}`);
                                    synced++;
                                }
                            }

                            const coordsDiffer =
                                Math.abs((existing.latitude || 0) - (parsed.latitude || 0)) > 0.001 ||
                                Math.abs((existing.longitude || 0) - (parsed.longitude || 0)) > 0.001;

                            const needsUpdate =
                                existing.alertTypeId !== parsed.alertTypeId ||
                                existing.alertTypeName !== parsed.alertTypeName ||
                                (coordsDiffer && !isDefaultCoord);

                            if (needsUpdate) {
                                await this.ncdrAlertRepository.update(existing.id, {
                                    alertTypeId: parsed.alertTypeId,
                                    alertTypeName: parsed.alertTypeName,
                                    latitude: parsed.latitude,
                                    longitude: parsed.longitude,
                                });
                                synced++;
                            }
                        }
                    } catch (err) {
                        errors++;
                    }
                }
            }

            // 標記不在 RSS Feed 中的警報為非活動
            if (activeAlertIds.length > 0) {
                const deactivateResult = await this.ncdrAlertRepository
                    .createQueryBuilder()
                    .update(NcdrAlert)
                    .set({ isActive: false })
                    .where('alertTypeId IN (:...typeIds)', { typeIds })
                    .andWhere('isActive = :isActive', { isActive: true })
                    .andWhere('alertId NOT IN (:...activeAlertIds)', { activeAlertIds })
                    // 排除 CWA 地震資料 (由獨立同步管理)
                    .andWhere('alertId NOT LIKE :cwaPrefix', { cwaPrefix: 'CWA-%' })
                    .execute();

                deactivated = deactivateResult.affected || 0;
                if (deactivated > 0) {
                    this.logger.log(`Deactivated ${deactivated} alerts no longer in RSS feed`);
                }
            }

            this.lastSyncTime = new Date();
            this.logger.log(`Sync completed: ${synced} new/updated, ${deactivated} deactivated, ${errors} errors`);
        } finally {
            this.syncInProgress = false;
        }

        return { synced, errors, deactivated };
    }

    /**
     * 排程任務：每 10 分鐘同步核心類別
     */
    @Cron(CronExpression.EVERY_10_MINUTES)
    async scheduledSync(): Promise<void> {
        this.logger.log('Running scheduled sync for core alert types...');
        await this.syncAlertTypes(CORE_ALERT_TYPES);
    }

    /**
     * 排程任務：每 5 分鐘同步 CWA 地震資料
     * 使用 CWA OpenData API 取得最新地震報告
     */
    @Cron('0 */5 * * * *') // 每 5 分鐘
    async scheduledCwaEarthquakeSync(): Promise<void> {
        this.logger.log('Running scheduled CWA earthquake sync...');
        await this.syncCwaEarthquakes();
    }

    /**
     * 從 CWA OpenData 取得地震報告
     */
    async fetchCwaEarthquakes(): Promise<any[]> {
        try {
            const url = `${CWA_EARTHQUAKE_ENDPOINT}?Authorization=${this.cwaApiKey}&format=JSON&limit=10`;
            this.logger.log(`Fetching CWA earthquakes from: ${url.replace(this.cwaApiKey, '***')}`);

            const response = await axios.get(url, { timeout: 15000 });
            const records = response.data?.records?.Earthquake;

            if (!records || !Array.isArray(records)) {
                this.logger.warn('No earthquake data found in CWA response');
                return [];
            }

            return records;
        } catch (error) {
            this.logger.error(`Failed to fetch CWA earthquakes: ${error.message}`);
            return [];
        }
    }

    /**
     * 同步 CWA 地震資料到資料庫
     */
    async syncCwaEarthquakes(): Promise<{ synced: number; errors: number }> {
        let synced = 0;
        let errors = 0;

        try {
            const earthquakes = await this.fetchCwaEarthquakes();
            this.logger.log(`Fetched ${earthquakes.length} earthquakes from CWA`);

            for (const eq of earthquakes) {
                try {
                    const eqNo = eq.EarthquakeNo?.toString() || '';
                    const alertId = `CWA-EQ-${eqNo}`;

                    // 檢查是否已存在
                    const existing = await this.ncdrAlertRepository.findOne({
                        where: { alertId },
                    });

                    if (existing) {
                        continue; // 已存在，跳過
                    }

                    // 解析地震資料
                    const info = eq.EarthquakeInfo || {};
                    const epicenter = info.Epicenter || {};
                    const magnitude = info.EarthquakeMagnitude || {};
                    const originTime = info.OriginTime || new Date().toISOString();

                    // 生成描述
                    const location = epicenter.Location || '台灣地區';
                    const depth = info.FocalDepth || 0;
                    const magValue = magnitude.MagnitudeValue || 0;
                    const reportContent = eq.ReportContent || '';

                    // 決定嚴重程度
                    let severity: 'critical' | 'warning' | 'info' = 'info';
                    if (magValue >= 6.0) {
                        severity = 'critical';
                    } else if (magValue >= 4.5) {
                        severity = 'warning';
                    }

                    // 建立警報記錄
                    const alert: Partial<NcdrAlert> = {
                        alertId,
                        alertTypeId: 33, // 地震
                        alertTypeName: '地震',
                        title: `${location} 發生規模 ${magValue} 地震`,
                        description: reportContent || `震央位於 ${location}，震源深度 ${depth} 公里，地震規模 ${magValue}`,
                        severity,
                        sourceUnit: '中央氣象署',
                        publishedAt: new Date(originTime),
                        sourceLink: eq.ReportImageURI || `https://www.cwa.gov.tw/V8/C/E/EQ/EQ${eqNo}.html`,
                        latitude: parseFloat(epicenter.EpicenterLatitude) || 23.9,
                        longitude: parseFloat(epicenter.EpicenterLongitude) || 121.6,
                        isActive: true,
                    };

                    await this.ncdrAlertRepository.save(alert);
                    synced++;
                    this.logger.log(`Synced CWA earthquake: ${alert.title}`);

                    // 🔔 LINE 推播：規模 5.0 以上自動廣播
                    if (magValue >= 5.0 && this.lineBotService.isEnabled()) {
                        try {
                            const alertMsg = `🚨 地震警報\n\n${alert.title}\n\n${alert.description?.substring(0, 150) || ''}`;
                            await this.lineBotService.broadcast(alertMsg);
                            this.logger.log(`LINE broadcast sent for earthquake: ${alert.title}`);
                        } catch (lineErr) {
                            this.logger.warn(`Failed to send LINE broadcast: ${lineErr.message}`);
                        }
                    }
                } catch (err) {
                    errors++;
                    this.logger.error(`Failed to process earthquake: ${err.message}`);
                }
            }

            if (synced > 0) {
                this.lastSyncTime = new Date();
            }
            this.logger.log(`CWA earthquake sync completed: ${synced} new, ${errors} errors`);
        } catch (err) {
            this.logger.error(`CWA earthquake sync failed: ${err.message}`);
            errors++;
        }

        return { synced, errors };
    }

    /**
     * 查詢警報列表
     * 自然災害保留 7 天，非自然災害保留 72 小時
     */
    async findAll(query: NcdrAlertQueryDto): Promise<{ data: NcdrAlert[]; total: number }> {
        const { types, category, county, activeOnly, withLocation, limit = 50, offset = 0 } = query;

        const qb = this.ncdrAlertRepository.createQueryBuilder('alert');

        // 類別篩選
        if (types && types.length > 0) {
            qb.andWhere('alert.alertTypeId IN (:...types)', { types });
        }

        // 分類篩選 (中央部會/事業單位/地方政府)
        if (category) {
            let categoryTypes: number[];
            switch (category) {
                case 'central':
                    categoryTypes = CENTRAL_ALERT_TYPES;
                    break;
                case 'enterprise':
                    categoryTypes = ENTERPRISE_ALERT_TYPES;
                    break;
                case 'local':
                    categoryTypes = LOCAL_ALERT_TYPES;
                    break;
                default:
                    categoryTypes = ALL_ALERT_TYPES;
            }
            qb.andWhere('alert.alertTypeId IN (:...categoryTypes)', { categoryTypes });
        }

        // 僅有效警報 (依據 RSS Feed 生效狀態)
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

        // 時間範圍過濾：自然災害 7 天，非自然災害 72 小時
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

        // 使用 OR 條件：(自然災害 AND 7天內) OR (非自然災害 AND 72小時內)
        qb.andWhere(
            `(
                (alert.alertTypeId IN (:...naturalTypes) AND alert.publishedAt >= :sevenDaysAgo)
                OR
                (alert.alertTypeId NOT IN (:...naturalTypes) AND alert.publishedAt >= :threeDaysAgo)
            )`,
            {
                naturalTypes: NATURAL_DISASTER_TYPES,
                sevenDaysAgo,
                threeDaysAgo,
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
     * 自然災害保留 7 天，非自然災害保留 72 小時
     */
    async findWithLocation(types?: number[]): Promise<NcdrAlert[]> {
        const qb = this.ncdrAlertRepository.createQueryBuilder('alert')
            .where('alert.latitude IS NOT NULL')
            .andWhere('alert.longitude IS NOT NULL')
            .andWhere('alert.isActive = :isActive', { isActive: true });

        if (types && types.length > 0) {
            qb.andWhere('alert.alertTypeId IN (:...types)', { types });
        }

        // 時間範圍過濾：自然災害 7 天，非自然災害 72 小時
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const threeDaysAgo = new Date(now.getTime() - 72 * 60 * 60 * 1000);

        qb.andWhere(
            `(
                (alert.alertTypeId IN (:...naturalTypes) AND alert.publishedAt >= :sevenDaysAgo)
                OR
                (alert.alertTypeId NOT IN (:...naturalTypes) AND alert.publishedAt >= :threeDaysAgo)
            )`,
            {
                naturalTypes: NATURAL_DISASTER_TYPES,
                sevenDaysAgo,
                threeDaysAgo,
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

    /**
     * 更新現有警報的 sourceLink 為 HTML 網頁連結
     * 用於一次性更新已存在但使用 CAP 連結的警報
     */
    async updateExistingSourceLinks(): Promise<{ updated: number; errors: number }> {
        let updated = 0;
        let errors = 0;

        // 找出所有使用 CAP 連結的警報
        const alertsWithCapLinks = await this.ncdrAlertRepository.find({
            where: {},
        });

        const capAlerts = alertsWithCapLinks.filter(
            alert => alert.sourceLink && alert.sourceLink.endsWith('.cap')
        );

        this.logger.log(`Found ${capAlerts.length} alerts with CAP links to update`);

        for (const alert of capAlerts) {
            try {
                // 限制請求頻率
                await new Promise(resolve => setTimeout(resolve, 300));

                const webLink = await this.fetchWebLinkFromCap(alert.sourceLink);
                if (webLink) {
                    await this.ncdrAlertRepository.update(alert.id, { sourceLink: webLink });
                    updated++;
                    this.logger.log(`Updated alert ${alert.id}: ${webLink}`);
                }
            } catch (err) {
                errors++;
                this.logger.error(`Failed to update alert ${alert.id}: ${err.message}`);
            }
        }

        this.logger.log(`Source link update completed: ${updated} updated, ${errors} errors`);
        return { updated, errors };
    }

    /**
     * 批次更新現有警報的座標
     * 從 CAP 檔案擷取真實座標，更新使用預設座標的警報
     */
    async updateExistingCoordinates(): Promise<{ updated: number; errors: number; skipped: number }> {
        let updated = 0;
        let errors = 0;
        let skipped = 0;

        // 預設座標中心點（台灣中心）
        const defaultLat = 23.6978;
        const defaultLng = 120.9605;
        const defaultEarthquakeLat = 23.9;
        const defaultEarthquakeLng = 121.6;

        // 找出所有活動警報
        const alerts = await this.ncdrAlertRepository.find({
            where: { isActive: true },
        });

        this.logger.log(`Checking ${alerts.length} alerts for coordinate updates...`);

        for (const alert of alerts) {
            try {
                // 檢查是否使用預設座標
                const lat = parseFloat(String(alert.latitude));
                const lng = parseFloat(String(alert.longitude));

                const isDefaultCoord =
                    (Math.abs(lat - defaultLat) < 0.1 && Math.abs(lng - defaultLng) < 0.1) ||
                    (Math.abs(lat - defaultEarthquakeLat) < 0.1 && Math.abs(lng - defaultEarthquakeLng) < 0.1);

                if (!isDefaultCoord) {
                    skipped++;
                    continue;
                }

                // 尋找 CAP 連結 - 可能在 sourceLink 或需要構建
                let capUrl: string | null = null;

                if (alert.sourceLink && alert.sourceLink.endsWith('.cap')) {
                    capUrl = alert.sourceLink;
                } else if (alert.alertId) {
                    // 嘗試構建 CAP URL (例如 CWA 地震格式)
                    if (alert.alertId.startsWith('CWA-EQ')) {
                        // CWA-EQ114155-2025-1225-044030 → 構建 CAP URL
                        const parts = alert.alertId.split('-');
                        if (parts.length >= 4) {
                            const year = parts[2];
                            capUrl = `https://alerts.ncdr.nat.gov.tw/Capstorage/CWA/${year}/Earthquake/${alert.alertId}.cap`;
                        }
                    }
                }

                if (!capUrl) {
                    skipped++;
                    continue;
                }

                // 限制請求頻率
                await new Promise(resolve => setTimeout(resolve, 500));

                const capData = await this.fetchCapData(capUrl);
                if (capData.latitude && capData.longitude) {
                    await this.ncdrAlertRepository.update(alert.id, {
                        latitude: capData.latitude,
                        longitude: capData.longitude,
                    });
                    updated++;
                    this.logger.log(`Updated coords for ${alert.alertId}: ${capData.latitude}, ${capData.longitude}`);
                } else {
                    skipped++;
                }
            } catch (err) {
                errors++;
                this.logger.error(`Failed to update coords for ${alert.alertId}: ${err.message}`);
            }
        }

        this.logger.log(`Coordinate update completed: ${updated} updated, ${skipped} skipped, ${errors} errors`);
        return { updated, errors, skipped };
    }
}
