import { Injectable, Logger } from '@nestjs/common';

/**
 * Offline Sync Service
 * Manages data synchronization for offline-capable clients
 */
@Injectable()
export class OfflineSyncService {
    private readonly logger = new Logger(OfflineSyncService.name);
    private pendingSync: Map<string, SyncItem[]> = new Map();

    /**
     * 註冊待同步項目
     */
    registerPendingSync(userId: string, item: SyncItem): void {
        if (!this.pendingSync.has(userId)) {
            this.pendingSync.set(userId, []);
        }
        this.pendingSync.get(userId)!.push({
            ...item,
            id: `sync-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            createdAt: new Date(),
            status: 'pending',
        });
    }

    /**
     * 取得待同步項目
     */
    getPendingItems(userId: string): SyncItem[] {
        return this.pendingSync.get(userId) || [];
    }

    /**
     * 處理同步
     */
    async processSync(userId: string, items: ClientSyncData[]): Promise<SyncResult> {
        const results: SyncItemResult[] = [];

        for (const item of items) {
            try {
                // 根據類型處理同步
                switch (item.type) {
                    case 'incident_report':
                        // TODO: 呼叫 IncidentService
                        results.push({ id: item.clientId, success: true, serverId: `inc-${Date.now()}` });
                        break;
                    case 'location_update':
                        // TODO: 呼叫 LocationService
                        results.push({ id: item.clientId, success: true });
                        break;
                    case 'photo_upload':
                        // TODO: 呼叫 FileUploadService
                        results.push({ id: item.clientId, success: true, url: '/uploads/synced.jpg' });
                        break;
                    default:
                        results.push({ id: item.clientId, success: false, error: 'Unknown type' });
                }
            } catch (error) {
                results.push({ id: item.clientId, success: false, error: String(error) });
            }
        }

        // 清除已處理的待同步項目
        const pending = this.pendingSync.get(userId) || [];
        const successIds = results.filter((r) => r.success).map((r) => r.id);
        this.pendingSync.set(userId, pending.filter((p) => !successIds.includes(p.id!)));

        return {
            processed: results.length,
            successful: results.filter((r) => r.success).length,
            failed: results.filter((r) => !r.success).length,
            results,
        };
    }

    /**
     * 取得需要下載的更新
     */
    getUpdatesForClient(userId: string, lastSyncTime: Date): ClientUpdate[] {
        // TODO: 查詢各服務取得更新
        return [
            { type: 'incident', action: 'update', data: { id: 'inc-1', status: 'resolved' }, updatedAt: new Date() },
            { type: 'alert', action: 'create', data: { id: 'alert-1', message: '新警報' }, updatedAt: new Date() },
        ];
    }

    /**
     * 計算衝突
     */
    detectConflicts(serverData: any, clientData: any): SyncConflict | null {
        if (!serverData || !clientData) return null;

        if (serverData.updatedAt > clientData.modifiedAt) {
            return {
                type: 'server_newer',
                serverValue: serverData,
                clientValue: clientData,
                resolution: 'server_wins',
            };
        }

        return null;
    }

    /**
     * 離線資料摘要
     */
    getOfflineDataSummary(): OfflineSummary {
        let totalItems = 0;
        let totalUsers = 0;

        for (const items of this.pendingSync.values()) {
            totalUsers++;
            totalItems += items.length;
        }

        return { totalUsers, totalItems, types: {} };
    }
}

// Types
interface SyncItem { id?: string; type: string; data: any; createdAt?: Date; status?: string; }
interface ClientSyncData { clientId: string; type: string; data: any; modifiedAt: Date; }
interface SyncItemResult { id: string; success: boolean; serverId?: string; url?: string; error?: string; }
interface SyncResult { processed: number; successful: number; failed: number; results: SyncItemResult[]; }
interface ClientUpdate { type: string; action: string; data: any; updatedAt: Date; }
interface SyncConflict { type: string; serverValue: any; clientValue: any; resolution: string; }
interface OfflineSummary { totalUsers: number; totalItems: number; types: Record<string, number>; }
