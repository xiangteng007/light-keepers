/**
 * offline-hub.service.ts
 * 
 * v4.0: 離線功能中心 - PWA 離線支援
 * 
 * 整合模組:
 * - offline-sync
 * - offline-map-cache
 * - offline-mesh
 * - offline-tiles
 * - mobile-sync
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface SyncItem {
    id: string;
    type: 'incident' | 'task' | 'report' | 'location';
    action: 'create' | 'update' | 'delete';
    data: any;
    timestamp: Date;
    deviceId: string;
    synced: boolean;
}

export interface CacheManifest {
    version: string;
    resources: { url: string; type: string; size: number }[];
    tiles: { region: string; zoom: number; count: number }[];
    lastUpdated: Date;
}

export interface SyncStatus {
    pendingItems: number;
    lastSyncTime: Date | null;
    syncInProgress: boolean;
    conflictCount: number;
}

@Injectable()
export class OfflineHubService implements OnModuleInit {
    private readonly logger = new Logger(OfflineHubService.name);
    private syncQueue: Map<string, SyncItem> = new Map();
    private cacheManifest: CacheManifest | null = null;

    constructor(
        private readonly eventEmitter: EventEmitter2,
    ) { }

    onModuleInit() {
        this.logger.log('📴 OfflineHub initialized');
        this.initCacheManifest();
    }

    // ===== 同步佇列 =====

    /**
     * 添加待同步項目
     */
    queueForSync(item: Omit<SyncItem, 'id' | 'timestamp' | 'synced'>): string {
        const id = `sync-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;

        const syncItem: SyncItem = {
            ...item,
            id,
            timestamp: new Date(),
            synced: false,
        };

        this.syncQueue.set(id, syncItem);
        this.logger.debug(`Queued: ${item.type} ${item.action}`);

        return id;
    }

    /**
     * 處理同步佇列
     */
    async processSyncQueue(): Promise<{ synced: number; failed: number; conflicts: number }> {
        const result = { synced: 0, failed: 0, conflicts: 0 };

        for (const [id, item] of this.syncQueue) {
            if (item.synced) continue;

            try {
                const syncResult = await this.syncItem(item);

                if (syncResult.success) {
                    item.synced = true;
                    result.synced++;
                } else if (syncResult.conflict) {
                    result.conflicts++;
                    // 發送衝突事件讓前端處理
                    this.eventEmitter.emit('offline.sync.conflict', {
                        itemId: id,
                        localData: item.data,
                        serverData: syncResult.serverData,
                    });
                } else {
                    result.failed++;
                }
            } catch (error) {
                result.failed++;
                this.logger.error(`Sync failed for ${id}`, error);
            }
        }

        // 清除已同步項目
        for (const [id, item] of this.syncQueue) {
            if (item.synced) this.syncQueue.delete(id);
        }

        this.eventEmitter.emit('offline.sync.completed', result);
        return result;
    }

    private async syncItem(item: SyncItem): Promise<{ success: boolean; conflict?: boolean; serverData?: any }> {
        // 模擬同步邏輯
        await this.delay(100);

        // 隨機模擬衝突 (5%)
        if (Math.random() < 0.05) {
            return { success: false, conflict: true, serverData: { ...item.data, serverModified: true } };
        }

        return { success: true };
    }

    /**
     * 取得同步狀態
     */
    getSyncStatus(): SyncStatus {
        const pendingItems = Array.from(this.syncQueue.values()).filter(i => !i.synced).length;
        const syncedItems = Array.from(this.syncQueue.values()).filter(i => i.synced);

        return {
            pendingItems,
            lastSyncTime: syncedItems.length > 0
                ? new Date(Math.max(...syncedItems.map(i => i.timestamp.getTime())))
                : null,
            syncInProgress: false,
            conflictCount: 0,
        };
    }

    // ===== 快取管理 =====

    private initCacheManifest() {
        this.cacheManifest = {
            version: '4.0.0',
            resources: [
                { url: '/offline/app.js', type: 'script', size: 512000 },
                { url: '/offline/app.css', type: 'style', size: 64000 },
                { url: '/offline/icons.svg', type: 'image', size: 32000 },
            ],
            tiles: [
                { region: '台北市', zoom: 15, count: 256 },
                { region: '新北市', zoom: 14, count: 512 },
            ],
            lastUpdated: new Date(),
        };
    }

    getCacheManifest(): CacheManifest | null {
        return this.cacheManifest;
    }

    /**
     * 預載離線地圖區塊
     */
    async preloadMapTiles(region: string, zoom: number): Promise<{ tiles: number; size: number }> {
        // 模擬預載
        await this.delay(1000);

        const tiles = Math.pow(2, zoom - 10) * 64;
        const size = tiles * 25000; // ~25KB per tile

        this.logger.log(`Preloaded ${tiles} tiles for ${region} at zoom ${zoom}`);

        return { tiles, size };
    }

    /**
     * 清除離線快取
     */
    async clearCache(type?: 'tiles' | 'data' | 'all'): Promise<{ cleared: number }> {
        let cleared = 0;

        if (type === 'all' || type === 'data') {
            cleared += this.syncQueue.size;
            this.syncQueue.clear();
        }

        this.logger.log(`Cleared ${cleared} cached items (type: ${type || 'all'})`);
        return { cleared };
    }

    // ===== Mesh 網路 (P2P 備援) =====

    /**
     * 註冊 Mesh 節點
     */
    registerMeshNode(nodeInfo: {
        deviceId: string;
        capabilities: string[];
        location?: { lat: number; lng: number };
    }): { nodeId: string; meshNetwork: string } {
        const nodeId = `mesh-${nodeInfo.deviceId}`;
        this.logger.log(`Mesh node registered: ${nodeId}`);

        return {
            nodeId,
            meshNetwork: 'lightkeepers-mesh-v1',
        };
    }

    /**
     * 透過 Mesh 發送緊急訊息
     */
    async sendMeshMessage(message: {
        type: 'sos' | 'status' | 'data';
        payload: any;
        targetNodes?: string[];
    }): Promise<{ sent: number; received: number }> {
        // 模擬 Mesh 傳播
        await this.delay(500);

        return {
            sent: message.targetNodes?.length || 5,
            received: Math.floor((message.targetNodes?.length || 5) * 0.8),
        };
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
