import { Injectable, Logger } from '@nestjs/common';

/**
 * Offline Map Cache Service
 * Map tile caching for offline use
 */
@Injectable()
export class OfflineMapCacheService {
    private readonly logger = new Logger(OfflineMapCacheService.name);
    private cachedRegions: Map<string, CachedRegion> = new Map();
    private tileCache: Map<string, TileData> = new Map();

    /**
     * 預載地區
     */
    preloadRegion(region: RegionInput): CacheResult {
        const regionId = `region-${Date.now()}`;
        const tiles = this.calculateTiles(region.bounds, region.minZoom, region.maxZoom);

        const cached: CachedRegion = {
            id: regionId,
            name: region.name,
            bounds: region.bounds,
            minZoom: region.minZoom,
            maxZoom: region.maxZoom,
            tileCount: tiles.length,
            status: 'downloading',
            progress: 0,
            createdAt: new Date(),
        };

        this.cachedRegions.set(regionId, cached);

        // 模擬下載
        this.simulateDownload(regionId, tiles);

        return { regionId, estimatedSize: tiles.length * 50, tileCount: tiles.length };
    }

    /**
     * 取得快取狀態
     */
    getCacheStatus(regionId: string): CachedRegion | undefined {
        return this.cachedRegions.get(regionId);
    }

    /**
     * 取得所有快取地區
     */
    listCachedRegions(): CachedRegion[] {
        return Array.from(this.cachedRegions.values());
    }

    /**
     * 刪除快取地區
     */
    deleteRegion(regionId: string): boolean {
        const region = this.cachedRegions.get(regionId);
        if (!region) return false;

        // 刪除相關 Tiles
        for (const [key] of this.tileCache) {
            if (key.startsWith(regionId)) {
                this.tileCache.delete(key);
            }
        }

        this.cachedRegions.delete(regionId);
        return true;
    }

    /**
     * 取得 Tile
     */
    getTile(z: number, x: number, y: number): TileData | null {
        const key = `${z}/${x}/${y}`;

        // 先查快取
        if (this.tileCache.has(key)) {
            return this.tileCache.get(key)!;
        }

        return null; // 需要從網路取得
    }

    /**
     * 儲存 Tile
     */
    saveTile(z: number, x: number, y: number, data: Buffer): void {
        const key = `${z}/${x}/${y}`;
        this.tileCache.set(key, {
            key,
            data,
            size: data.length,
            cachedAt: new Date(),
        });
    }

    /**
     * 計算儲存空間使用
     */
    getStorageUsage(): StorageStats {
        let totalSize = 0;
        for (const tile of this.tileCache.values()) {
            totalSize += tile.size;
        }

        return {
            totalTiles: this.tileCache.size,
            totalSize,
            totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
            regions: this.cachedRegions.size,
        };
    }

    /**
     * 清除過期快取
     */
    purgeOldCache(maxAgeDays: number = 30): PurgeResult {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - maxAgeDays);

        let purged = 0;
        for (const [key, tile] of this.tileCache) {
            if (tile.cachedAt < cutoff) {
                this.tileCache.delete(key);
                purged++;
            }
        }

        return { purgedTiles: purged };
    }

    /**
     * 取得預設離線區域
     */
    getDefaultRegions(): RegionInput[] {
        return [
            { name: '台北市', bounds: { north: 25.21, south: 24.96, east: 121.67, west: 121.45 }, minZoom: 10, maxZoom: 16 },
            { name: '新北市', bounds: { north: 25.30, south: 24.67, east: 122.01, west: 121.28 }, minZoom: 10, maxZoom: 16 },
            { name: '台中市', bounds: { north: 24.45, south: 23.98, east: 121.12, west: 120.46 }, minZoom: 10, maxZoom: 16 },
        ];
    }

    private calculateTiles(bounds: Bounds, minZoom: number, maxZoom: number): string[] {
        const tiles: string[] = [];

        for (let z = minZoom; z <= maxZoom; z++) {
            const minX = this.lng2tile(bounds.west, z);
            const maxX = this.lng2tile(bounds.east, z);
            const minY = this.lat2tile(bounds.north, z);
            const maxY = this.lat2tile(bounds.south, z);

            for (let x = minX; x <= maxX; x++) {
                for (let y = minY; y <= maxY; y++) {
                    tiles.push(`${z}/${x}/${y}`);
                }
            }
        }

        return tiles;
    }

    private lng2tile(lng: number, z: number): number {
        return Math.floor((lng + 180) / 360 * Math.pow(2, z));
    }

    private lat2tile(lat: number, z: number): number {
        return Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, z));
    }

    private simulateDownload(regionId: string, tiles: string[]): void {
        const region = this.cachedRegions.get(regionId);
        if (!region) return;

        let downloaded = 0;
        const interval = setInterval(() => {
            downloaded += Math.floor(tiles.length / 10);
            region.progress = Math.min(100, Math.floor(downloaded / tiles.length * 100));

            if (region.progress >= 100) {
                region.status = 'complete';
                region.completedAt = new Date();
                clearInterval(interval);
            }
        }, 500);
    }
}

// Types
interface Bounds { north: number; south: number; east: number; west: number; }
interface RegionInput { name: string; bounds: Bounds; minZoom: number; maxZoom: number; }
interface CachedRegion { id: string; name: string; bounds: Bounds; minZoom: number; maxZoom: number; tileCount: number; status: string; progress: number; createdAt: Date; completedAt?: Date; }
interface CacheResult { regionId: string; estimatedSize: number; tileCount: number; }
interface TileData { key: string; data: Buffer; size: number; cachedAt: Date; }
interface StorageStats { totalTiles: number; totalSize: number; totalSizeMB: string; regions: number; }
interface PurgeResult { purgedTiles: number; }
