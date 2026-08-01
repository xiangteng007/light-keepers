import * as Papa from 'papaparse';
import { Repository } from 'typeorm';
import { AirRaidShelter } from './entities/air-raid-shelter.entity';

/**
 * 防空避難處所 CSV 匯入邏輯（純函式，無 Nest DI 依賴）。
 *
 * 同時被以下兩處使用，避免邏輯重複：
 * - CLI 腳本：backend/src/scripts/import-air-raid-shelters.ts（手動/一次性匯入）
 * - 排程服務：AirRaidSheltersSyncService（@nestjs/schedule 月度自動更新）
 *
 * 資料來源：內政部警政署「防空避難處所」開放資料 (data.gov.tw)。
 * data.gov.tw 下載的 CSV 欄位名稱可能因資料集版本而略有差異，因此下方以
 * 多個候選欄位名稱（中文/英文）做 fallback 比對，與既有
 * `PublicResourcesService`（避難所/AED 解析）採用相同策略。
 */

/** 地理編碼函式介面 — 由呼叫端注入，讓本模組不直接依賴任何特定地圖服務 SDK。 */
export type GeocodeFn = (address: string) => Promise<{ lat: number; lng: number } | null>;

export interface AirRaidShelterCsvRow {
    sourceId?: string;
    name: string;
    city: string;
    district: string;
    address: string;
    capacity: number;
    basementLevels: number | null;
    managingOrg: string | null;
    contactPhone: string | null;
    latitude: number | null;
    longitude: number | null;
}

export interface ImportSummary {
    totalRows: number;
    inserted: number;
    updated: number;
    skipped: number;
    /** 匯入時缺少座標、且未能自動地理編碼補齊的地址（需人工後續補值） */
    missingCoordinates: string[];
}

function firstNonEmpty(row: Record<string, unknown>, keys: string[]): string {
    for (const key of keys) {
        const value = row[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') {
            return String(value).trim();
        }
    }
    return '';
}

function parseNumberOrNull(value: string): number | null {
    if (!value) return null;
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : null;
}

function parseIntOrNull(value: string): number | null {
    if (!value) return null;
    const n = parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
}

/**
 * 解析 data.gov.tw 下載格式 CSV 為結構化列。
 * 支援欄位名稱（依優先序 fallback）：
 * - 編號: 編號 / id / ID
 * - 名稱: 場所名稱 / 建物名稱 / 名稱 / name
 * - 縣市: 縣市 / 直轄市及縣（市) / city
 * - 鄉鎮市區: 鄉鎮市區 / district
 * - 地址: 地址 / address
 * - 容納人數: 容納人數 / 收容人數 / 避難人數 / capacity
 * - 地下樓層: 地下樓層 / 地下樓層數 / basementLevels
 * - 管理單位: 管理單位 / 管理維護機關 / managingOrg
 * - 電話: 聯絡電話 / 電話 / phone
 * - 緯度/經度: 緯度 / lat / latitude, 經度 / lng / longitude
 */
export function parseAirRaidShelterCsv(csvText: string): AirRaidShelterCsvRow[] {
    const parsed = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
    });

    return (parsed.data as Record<string, unknown>[])
        .map((r): AirRaidShelterCsvRow | null => {
            const address = firstNonEmpty(r, ['地址', 'Address', 'address']);
            if (!address) return null; // 地址是 upsert 去重鍵，缺少地址的資料列直接略過

            const name =
                firstNonEmpty(r, ['場所名稱', '建物名稱', '名稱', 'Name', 'name']) || address;

            return {
                sourceId: firstNonEmpty(r, ['編號', 'ID', 'id']) || undefined,
                name,
                city: firstNonEmpty(r, ['縣市', '直轄市及縣（市）', '直轄市及縣(市)', 'City', 'city']),
                district: firstNonEmpty(r, ['鄉鎮市區', 'District', 'district']),
                address,
                capacity:
                    parseIntOrNull(
                        firstNonEmpty(r, ['容納人數', '收容人數', '避難人數', 'Capacity', 'capacity']),
                    ) ?? 0,
                basementLevels: parseIntOrNull(
                    firstNonEmpty(r, ['地下樓層', '地下樓層數', 'BasementLevels', 'basementLevels']),
                ),
                managingOrg:
                    firstNonEmpty(r, ['管理單位', '管理維護機關', 'ManagingOrg', 'managingOrg']) || null,
                contactPhone: firstNonEmpty(r, ['聯絡電話', '電話', 'Phone', 'phone']) || null,
                latitude: parseNumberOrNull(firstNonEmpty(r, ['緯度', 'Lat', 'lat', 'latitude'])),
                longitude: parseNumberOrNull(firstNonEmpty(r, ['經度', 'Lng', 'lon', 'lng', 'longitude'])),
            };
        })
        .filter((row): row is AirRaidShelterCsvRow => row !== null);
}

/**
 * 將已解析的 CSV 列 upsert 進資料庫（同地址視為同一筆，更新而非新增）。
 *
 * 座標補值策略：
 * - CSV 若已提供緯度/經度，直接使用。
 * - 若缺少座標，且呼叫端提供 `geocode` 函式（例如 MapboxService.geocode），
 *   則嘗試以地址進行地理編碼；成功則標記 `isGeocoded = true`。
 * - 若無 geocode 函式可用，或地理編碼失敗，座標欄位留空（null），
 *   並記錄於回傳的 `missingCoordinates`，待後續人工或下次匯入補值。
 *   （注意：正式串接地理編碼服務屬部署後設定工作，見本檔案頂部說明。）
 */
export async function upsertAirRaidShelters(
    repo: Repository<AirRaidShelter>,
    rows: AirRaidShelterCsvRow[],
    options?: { geocode?: GeocodeFn },
): Promise<ImportSummary> {
    const summary: ImportSummary = {
        totalRows: rows.length,
        inserted: 0,
        updated: 0,
        skipped: 0,
        missingCoordinates: [],
    };

    const now = new Date();

    for (const row of rows) {
        try {
            let latitude = row.latitude;
            let longitude = row.longitude;
            let isGeocoded = false;

            if ((latitude === null || longitude === null) && options?.geocode) {
                const geocoded = await options.geocode(row.address);
                if (geocoded) {
                    latitude = geocoded.lat;
                    longitude = geocoded.lng;
                    isGeocoded = true;
                }
            }

            if (latitude === null || longitude === null) {
                summary.missingCoordinates.push(row.address);
            }

            const existing = await repo.findOne({ where: { address: row.address } });

            if (existing) {
                Object.assign(existing, {
                    sourceId: row.sourceId ?? existing.sourceId,
                    name: row.name,
                    city: row.city,
                    district: row.district,
                    capacity: row.capacity,
                    basementLevels: row.basementLevels,
                    managingOrg: row.managingOrg,
                    contactPhone: row.contactPhone,
                    latitude: latitude ?? existing.latitude,
                    longitude: longitude ?? existing.longitude,
                    isGeocoded: isGeocoded || existing.isGeocoded,
                    isActive: true,
                    lastImportedAt: now,
                });
                await repo.save(existing);
                summary.updated += 1;
            } else {
                const created = repo.create({
                    sourceId: row.sourceId,
                    name: row.name,
                    city: row.city,
                    district: row.district,
                    address: row.address,
                    capacity: row.capacity,
                    basementLevels: row.basementLevels ?? undefined,
                    managingOrg: row.managingOrg ?? undefined,
                    contactPhone: row.contactPhone ?? undefined,
                    latitude: latitude ?? undefined,
                    longitude: longitude ?? undefined,
                    isGeocoded,
                    isActive: true,
                    lastImportedAt: now,
                });
                await repo.save(created);
                summary.inserted += 1;
            }
        } catch {
            summary.skipped += 1;
        }
    }

    return summary;
}
