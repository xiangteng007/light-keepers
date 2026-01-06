/**
 * Offline Tiles Service - 離線地圖包管理
 * 短期擴展功能
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';

// ============ Types ============

export interface TilePackage {
    id: string;
    name: string;
    region: string;
    bounds: {
        north: number;
        south: number;
        east: number;
        west: number;
    };
    minZoom: number;
    maxZoom: number;
    tileCount: number;
    sizeBytes: number;
    format: 'pmtiles' | 'mbtiles' | 'directory';
    style: 'satellite' | 'street' | 'terrain' | 'hybrid';
    createdAt: Date;
    downloadUrl?: string;
    localPath?: string;
    status: 'available' | 'downloading' | 'downloaded' | 'error';
}

export interface DownloadProgress {
    packageId: string;
    bytesDownloaded: number;
    totalBytes: number;
    tilesDownloaded: number;
    totalTiles: number;
    percentComplete: number;
}

// ============ Service ============

@Injectable()
export class OfflineTilesService {
    private readonly logger = new Logger(OfflineTilesService.name);
    private readonly tilesDir: string;

    // Available packages
    private packages: Map<string, TilePackage> = new Map();
    private downloadProgress: Map<string, DownloadProgress> = new Map();

    constructor(private readonly configService: ConfigService) {
        this.tilesDir = this.configService.get<string>('OFFLINE_TILES_DIR') || './data/tiles';
        this.initializePackages();
    }

    private initializePackages() {
        // Pre-defined Taiwan region packages
        const defaultPackages: Omit<TilePackage, 'status'>[] = [
            {
                id: 'taiwan-north',
                name: '北台灣',
                region: '台北、新北、基隆、桃園、新竹',
                bounds: { north: 25.3, south: 24.5, east: 122.0, west: 120.8 },
                minZoom: 8,
                maxZoom: 16,
                tileCount: 45000,
                sizeBytes: 280 * 1024 * 1024, // 280MB
                format: 'pmtiles',
                style: 'street',
                createdAt: new Date(),
                downloadUrl: '/api/tiles/packages/taiwan-north.pmtiles',
            },
            {
                id: 'taiwan-central',
                name: '中台灣',
                region: '台中、彰化、南投、雲林',
                bounds: { north: 24.5, south: 23.5, east: 121.5, west: 120.2 },
                minZoom: 8,
                maxZoom: 16,
                tileCount: 38000,
                sizeBytes: 220 * 1024 * 1024,
                format: 'pmtiles',
                style: 'street',
                createdAt: new Date(),
                downloadUrl: '/api/tiles/packages/taiwan-central.pmtiles',
            },
            {
                id: 'taiwan-south',
                name: '南台灣',
                region: '嘉義、台南、高雄、屏東',
                bounds: { north: 23.5, south: 21.9, east: 121.0, west: 120.0 },
                minZoom: 8,
                maxZoom: 16,
                tileCount: 42000,
                sizeBytes: 250 * 1024 * 1024,
                format: 'pmtiles',
                style: 'street',
                createdAt: new Date(),
                downloadUrl: '/api/tiles/packages/taiwan-south.pmtiles',
            },
            {
                id: 'taiwan-east',
                name: '東台灣',
                region: '宜蘭、花蓮、台東',
                bounds: { north: 24.8, south: 22.5, east: 121.6, west: 120.8 },
                minZoom: 8,
                maxZoom: 16,
                tileCount: 35000,
                sizeBytes: 180 * 1024 * 1024,
                format: 'pmtiles',
                style: 'street',
                createdAt: new Date(),
                downloadUrl: '/api/tiles/packages/taiwan-east.pmtiles',
            },
            {
                id: 'taiwan-satellite',
                name: '全台衛星影像',
                region: '台灣全島',
                bounds: { north: 25.3, south: 21.9, east: 122.0, west: 120.0 },
                minZoom: 8,
                maxZoom: 14,
                tileCount: 65000,
                sizeBytes: 1.2 * 1024 * 1024 * 1024, // 1.2GB
                format: 'pmtiles',
                style: 'satellite',
                createdAt: new Date(),
                downloadUrl: '/api/tiles/packages/taiwan-satellite.pmtiles',
            },
        ];

        for (const pkg of defaultPackages) {
            this.packages.set(pkg.id, {
                ...pkg,
                status: 'available',
            });
        }

        this.logger.log(`Initialized ${this.packages.size} tile packages`);
    }

    // ==================== Package Management ====================

    /**
     * 列出所有可用包
     */
    listPackages(): TilePackage[] {
        return Array.from(this.packages.values());
    }

    /**
     * 取得包詳情
     */
    getPackage(id: string): TilePackage | undefined {
        return this.packages.get(id);
    }

    /**
     * 檢查包是否已下載
     */
    isDownloaded(packageId: string): boolean {
        const pkg = this.packages.get(packageId);
        return pkg?.status === 'downloaded';
    }

    /**
     * 取得下載進度
     */
    getDownloadProgress(packageId: string): DownloadProgress | undefined {
        return this.downloadProgress.get(packageId);
    }

    // ==================== Download Simulation ====================

    /**
     * 開始下載包 (模擬)
     */
    async startDownload(packageId: string): Promise<boolean> {
        const pkg = this.packages.get(packageId);
        if (!pkg || pkg.status === 'downloading') return false;

        pkg.status = 'downloading';

        const progress: DownloadProgress = {
            packageId,
            bytesDownloaded: 0,
            totalBytes: pkg.sizeBytes,
            tilesDownloaded: 0,
            totalTiles: pkg.tileCount,
            percentComplete: 0,
        };
        this.downloadProgress.set(packageId, progress);

        // Simulate download progress
        this.simulateDownload(packageId, pkg, progress);

        return true;
    }

    private async simulateDownload(packageId: string, pkg: TilePackage, progress: DownloadProgress) {
        const steps = 20;
        const bytesPerStep = pkg.sizeBytes / steps;
        const tilesPerStep = pkg.tileCount / steps;

        for (let i = 1; i <= steps; i++) {
            await new Promise(resolve => setTimeout(resolve, 500)); // 500ms per step

            progress.bytesDownloaded = Math.min(bytesPerStep * i, pkg.sizeBytes);
            progress.tilesDownloaded = Math.min(Math.floor(tilesPerStep * i), pkg.tileCount);
            progress.percentComplete = Math.floor((i / steps) * 100);
        }

        pkg.status = 'downloaded';
        pkg.localPath = path.join(this.tilesDir, `${packageId}.pmtiles`);
        this.downloadProgress.delete(packageId);
        this.logger.log(`Package ${packageId} download complete (simulated)`);
    }

    /**
     * 刪除已下載的包
     */
    async deletePackage(packageId: string): Promise<boolean> {
        const pkg = this.packages.get(packageId);
        if (!pkg || pkg.status !== 'downloaded') return false;

        if (pkg.localPath && fs.existsSync(pkg.localPath)) {
            fs.unlinkSync(pkg.localPath);
        }

        pkg.status = 'available';
        pkg.localPath = undefined;
        this.logger.log(`Package ${packageId} deleted`);
        return true;
    }

    // ==================== Tile Serving ====================

    /**
     * 取得 tile 路徑
     */
    getTilePath(packageId: string, z: number, x: number, y: number): string | null {
        const pkg = this.packages.get(packageId);
        if (!pkg?.localPath) return null;

        // For PMTiles, we'd use the pmtiles library to extract
        // For now, return the package path
        return pkg.localPath;
    }

    /**
     * 計算區域所需的 tile 數量
     */
    calculateTileCount(
        bounds: { north: number; south: number; east: number; west: number },
        minZoom: number,
        maxZoom: number
    ): number {
        let totalTiles = 0;

        for (let z = minZoom; z <= maxZoom; z++) {
            const n = Math.pow(2, z);
            const xMin = Math.floor((bounds.west + 180) / 360 * n);
            const xMax = Math.floor((bounds.east + 180) / 360 * n);
            const yMin = Math.floor((1 - Math.log(Math.tan(bounds.north * Math.PI / 180) + 1 / Math.cos(bounds.north * Math.PI / 180)) / Math.PI) / 2 * n);
            const yMax = Math.floor((1 - Math.log(Math.tan(bounds.south * Math.PI / 180) + 1 / Math.cos(bounds.south * Math.PI / 180)) / Math.PI) / 2 * n);

            totalTiles += (xMax - xMin + 1) * (yMax - yMin + 1);
        }

        return totalTiles;
    }
}
