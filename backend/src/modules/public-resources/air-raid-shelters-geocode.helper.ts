import { Logger } from '@nestjs/common';
import { GeocodeFn } from './air-raid-shelters.importer';

const logger = new Logger('AirRaidSheltersGeocode');

/**
 * 地址轉座標（地理編碼）— 供防空避難處所匯入流程使用。
 *
 * 平台既有的地理編碼能力為 `MapboxService`
 * (backend/src/modules/tactical-maps/services/mapbox.service.ts)，其使用
 * Mapbox Geocoding API 並以 `MAPBOX_ACCESS_TOKEN` 環境變數設定金鑰。
 *
 * 本檔案刻意不直接 import `TacticalMapsModule`（該模組另外掛載
 * `AuthModule`/`EventEmitterModule` 等較重的相依），而是重用相同的 Mapbox
 * Geocoding API 與環境變數設定，維持輕量、無額外模組耦合，且可同時被
 * CLI 腳本（非 Nest DI 環境）與 Nest 排程服務共用。
 *
 * 若未設定 `MAPBOX_ACCESS_TOKEN`，回傳 `null`（不地理編碼），呼叫端應將
 * 座標留空並標記待補（見 `air-raid-shelters.importer.ts` 的
 * `missingCoordinates`），不得使用假座標。
 */
export function createMapboxGeocodeFn(accessToken: string | undefined): GeocodeFn {
    return async (address: string): Promise<{ lat: number; lng: number } | null> => {
        if (!accessToken) {
            return null;
        }

        try {
            const params = new URLSearchParams({
                access_token: accessToken,
                limit: '1',
                country: 'tw',
            });
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${params}`;

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Mapbox API error: ${response.status}`);
            }

            const data = (await response.json()) as { features?: { center: [number, number] }[] };
            const feature = data.features?.[0];
            if (!feature) return null;

            const [lng, lat] = feature.center;
            return { lat, lng };
        } catch (error) {
            logger.warn(`Geocoding failed for "${address}": ${(error as Error).message}`);
            return null;
        }
    };
}
