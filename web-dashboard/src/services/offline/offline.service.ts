/**
 * Offline Service — 全站唯一的離線快取與 outbox
 *
 * FE-4 / 工作項 3.4：離線層收斂。本檔收編了原本分散在
 * `offlineOutbox.ts`（真實重放、report/sos/location、retry 記錄、報告快取）與
 * `syncManager.ts`（週期同步、指數退避、Background Sync 註冊）的能力，
 * 這兩個檔案連同 `offlineSOP.ts` / rxdb 層 / `useOfflineSync.ts` 已一併刪除。
 * 盤點與判定依據見 `docs/architecture/OFFLINE_LAYER_CONSOLIDATION.md`。
 *
 * ## 資料不遺失的規則（本檔最重要的不變式）
 *
 * 佇列項目**只有在伺服器回 2xx 時才會被刪除**。以下情況一律保留資料：
 *   - 網路錯誤 / 逾時
 *   - 4xx（含 401：先 refresh 再重試一次，refresh 失敗也保留）
 *   - 5xx
 *   - 超過重試上限（只跳過，不刪除；由 `retryFailed()` 重置）
 *
 * 舊版 `attemptSync()` 用 `setTimeout` 假裝呼叫 API 後**無條件刪除**佇列項目，
 * 等於離線寫入 100% 靜默遺失；舊版 `offlineOutbox` 則從不檢查 `response.ok`，
 * 把 401/500 當成功。這兩個 bug 是本次修復的主因，對應測試在
 * `src/test/services/offline.service.test.ts`。
 *
 * ## HTTP 出口
 *
 * 一律經 `src/api/client.ts`（axios instance）：baseURL 已含 `/api/v1`、
 * request interceptor 注入當下最新的 Bearer token（**不是入列當時的快照**）、
 * response interceptor 自帶 401 → refresh → 重試。本檔另有一層 401 處理作為
 * 第二道防線（interceptor 的 `_retry` 旗標只允許重試一次的情境）。
 */

import Dexie, { Table } from 'dexie';
import api, { refreshAccessToken } from '../../api/client';

// ===== Type Definitions =====

export interface CachedAlert {
    id: string;
    title: string;
    description: string;
    severity: 'critical' | 'warning' | 'info';
    location?: string;
    createdAt: string;
    expiresAt?: string;
    source: string;
    cachedAt: number;
}

export interface CachedTask {
    id: string;
    title: string;
    description?: string;
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
    priority: 'low' | 'medium' | 'high' | 'critical';
    assigneeId?: string;
    location?: string;
    dueDate?: string;
    createdAt: string;
    updatedAt: string;
    cachedAt: number;
}

export interface CachedResource {
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    location?: string;
    lastUpdated: string;
    cachedAt: number;
}

/** 離線可讀的報告快取（承接 offlineOutbox 的 `reports-cache` store） */
export interface CachedReport {
    id: string;
    missionSessionId?: string;
    cachedAt?: number;
    [key: string]: unknown;
}

export type OutboxOperation = 'create' | 'update' | 'delete';
export type OutboxEntity = 'task' | 'resource' | 'report' | 'sos' | 'location';

export interface PendingSync {
    id?: number;
    type: OutboxOperation;
    entity: OutboxEntity;
    entityId: string;
    /**
     * task / resource：直接就是請求 body。
     * report / sos / location：`{ missionSessionId, payload }`（路徑需要 sessionId）。
     */
    data: Record<string, any>;
    createdAt: number;
    retryCount: number;
    lastError?: string;
    /** 指數退避：早於此時間戳不重試（`force` 可略過） */
    nextAttemptAt?: number;
}

export interface SyncStatus {
    lastSyncAt: number | null;
    pendingChanges: number;
    isOnline: boolean;
    isSyncing: boolean;
}

export interface SyncResult {
    success: number;
    failed: number;
    /** 因退避未到期或已達重試上限而跳過（資料仍在佇列） */
    skipped: number;
}

interface OutboxRequest {
    method: 'post' | 'put' | 'patch' | 'delete';
    url: string;
    data?: Record<string, any>;
    headers?: Record<string, string>;
}

// ===== Dexie Database Class =====

class OfflineDatabase extends Dexie {
    alerts!: Table<CachedAlert, string>;
    tasks!: Table<CachedTask, string>;
    resources!: Table<CachedResource, string>;
    reports!: Table<CachedReport, string>;
    pendingSync!: Table<PendingSync, number>;
    metadata!: Table<{ key: string; value: any }, string>;

    constructor() {
        super('LightKeepersOfflineDB');

        this.version(1).stores({
            alerts: 'id, severity, source, cachedAt',
            tasks: 'id, status, priority, assigneeId, cachedAt',
            resources: 'id, category, location, cachedAt',
            pendingSync: '++id, type, entity, entityId, createdAt',
            metadata: 'key',
        });

        // v2：收編 offlineOutbox 的 reports-cache（純新增，既有資料不受影響）
        this.version(2).stores({
            reports: 'id, missionSessionId, cachedAt',
        });
    }
}

// ===== Offline Service =====

/** 重試上限。到達後**不刪除**資料，只停止自動重試，等待 `retryFailed()`。 */
const MAX_RETRY_COUNT = 5;
/** 指數退避起點 */
const INITIAL_RETRY_DELAY_MS = 5_000;
/** 指數退避上限 */
const MAX_RETRY_DELAY_MS = 300_000;
/** 週期同步間隔（承接 syncManager） */
const AUTO_SYNC_INTERVAL_MS = 30_000;

class OfflineService {
    private db: OfflineDatabase;
    private _isSyncing: boolean = false;
    private _listeners: Set<(status: SyncStatus) => void> = new Set();
    private _autoSyncTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.db = new OfflineDatabase();
        this.setupNetworkListeners();
    }

    // ===== Network Status =====

    private setupNetworkListeners() {
        window.addEventListener('online', () => {
            void this.notifyListeners();
            void this.attemptSync();
        });

        window.addEventListener('offline', () => {
            void this.notifyListeners();
        });
    }

    /** 直接讀 `navigator.onLine`，避免快取旗標與實際狀態漂移 */
    get isOnline(): boolean {
        return navigator.onLine;
    }

    get isSyncing(): boolean {
        return this._isSyncing;
    }

    // ===== Alerts =====

    async cacheAlerts(alerts: CachedAlert[]): Promise<void> {
        const now = Date.now();
        const cached = alerts.map(a => ({ ...a, cachedAt: now }));
        await this.db.alerts.bulkPut(cached);
    }

    async getAlerts(options?: { severity?: string; limit?: number }): Promise<CachedAlert[]> {
        let query = this.db.alerts.orderBy('cachedAt').reverse();

        if (options?.severity) {
            query = query.filter(a => a.severity === options.severity);
        }

        if (options?.limit) {
            return query.limit(options.limit).toArray();
        }

        return query.toArray();
    }

    async clearExpiredAlerts(): Promise<number> {
        const now = Date.now();
        const expired = await this.db.alerts
            .filter(a => {
                if (!a.expiresAt) return false;
                return new Date(a.expiresAt).getTime() < now;
            })
            .primaryKeys();

        await this.db.alerts.bulkDelete(expired);
        return expired.length;
    }

    // ===== Tasks =====

    async cacheTasks(tasks: CachedTask[]): Promise<void> {
        const now = Date.now();
        const cached = tasks.map(t => ({ ...t, cachedAt: now }));
        await this.db.tasks.bulkPut(cached);
    }

    async getTasks(options?: { status?: string; assigneeId?: string }): Promise<CachedTask[]> {
        let collection = this.db.tasks.toCollection();

        if (options?.status) {
            collection = collection.filter(t => t.status === options.status);
        }
        if (options?.assigneeId) {
            collection = collection.filter(t => t.assigneeId === options.assigneeId);
        }

        return collection.toArray();
    }

    async getTask(id: string): Promise<CachedTask | undefined> {
        return this.db.tasks.get(id);
    }

    async updateTaskOffline(id: string, updates: Partial<CachedTask>): Promise<void> {
        await this.db.tasks.update(id, { ...updates, cachedAt: Date.now() });
        await this.queueSync('update', 'task', id, updates);
    }

    // ===== Resources =====

    async cacheResources(resources: CachedResource[]): Promise<void> {
        const now = Date.now();
        const cached = resources.map(r => ({ ...r, cachedAt: now }));
        await this.db.resources.bulkPut(cached);
    }

    async getResources(options?: { category?: string; location?: string }): Promise<CachedResource[]> {
        let collection = this.db.resources.toCollection();

        if (options?.category) {
            collection = collection.filter(r => r.category === options.category);
        }
        if (options?.location) {
            collection = collection.filter(r => r.location === options.location);
        }

        return collection.toArray();
    }

    // ===== Reports cache（承接 offlineOutbox 的 reports-cache）=====

    async cacheReports(reports: CachedReport[]): Promise<void> {
        const now = Date.now();
        await this.db.reports.bulkPut(reports.map(r => ({ ...r, cachedAt: now })));
    }

    async getCachedReports(missionSessionId: string): Promise<CachedReport[]> {
        return this.db.reports.where('missionSessionId').equals(missionSessionId).toArray();
    }

    // ===== Outbox：入列 =====

    async queueSync(
        type: OutboxOperation,
        entity: OutboxEntity,
        entityId: string,
        data: Record<string, any>
    ): Promise<void> {
        await this.db.pendingSync.add({
            type,
            entity,
            entityId,
            data,
            createdAt: Date.now(),
            retryCount: 0,
        });
        await this.notifyListeners();

        // 線上時立刻嘗試送出（不阻塞呼叫端）
        if (this.isOnline) {
            void this.attemptSync();
        }
    }

    /** 產生本地暫時 id（伺服器尚未配發 id 的 create 用） */
    private localId(prefix: string): string {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    }

    /** 離線災情回報入列 */
    async queueReport(missionSessionId: string, report: Record<string, any>): Promise<void> {
        await this.queueSync('create', 'report', this.localId('report'), {
            missionSessionId,
            payload: report,
        });
    }

    /** 離線 SOS 入列 */
    async queueSos(missionSessionId: string, sos: Record<string, any>): Promise<void> {
        await this.queueSync('create', 'sos', this.localId('sos'), {
            missionSessionId,
            payload: sos,
        });
    }

    /** 離線位置回報入列 */
    async queueLocation(missionSessionId: string, location: Record<string, any>): Promise<void> {
        await this.queueSync('create', 'location', this.localId('location'), {
            missionSessionId,
            payload: location,
        });
    }

    async getPendingChanges(): Promise<PendingSync[]> {
        const items = await this.db.pendingSync.toArray();
        // FIFO：`++id` 單調遞增，等同入列順序
        return items.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
    }

    async getPendingCount(): Promise<number> {
        return this.db.pendingSync.count();
    }

    // ===== Outbox：重放 =====

    /**
     * 把佇列項目對應到實際的 HTTP 請求。
     *
     * 路徑一律相對於 client 的 baseURL（`${VITE_API_URL}/api/v1`），
     * 因此**不要**在這裡再寫一次 `/api/v1`。
     */
    private buildRequest(item: PendingSync): OutboxRequest | null {
        const { type, entity, entityId, data } = item;
        const missionSessionId = data?.missionSessionId as string | undefined;
        const payload = (data?.payload ?? {}) as Record<string, any>;

        switch (entity) {
            case 'task':
                if (type === 'create') return { method: 'post', url: '/tasks', data };
                if (type === 'update') return { method: 'put', url: `/tasks/${entityId}`, data };
                return { method: 'delete', url: `/tasks/${entityId}` };

            case 'resource':
                if (type === 'create') return { method: 'post', url: '/resources', data };
                if (type === 'update') return { method: 'patch', url: `/resources/${entityId}`, data };
                return { method: 'delete', url: `/resources/${entityId}` };

            case 'report': {
                if (!missionSessionId) return null;
                const base = `/mission-sessions/${missionSessionId}/reports`;
                if (type === 'create') return { method: 'post', url: base, data: payload };
                if (type === 'update') {
                    // 後端以 If-Match 做樂觀鎖；入列時有帶 etag 才附上
                    const etag = data?.etag as string | undefined;
                    return {
                        method: 'patch',
                        url: `${base}/${entityId}`,
                        data: payload,
                        ...(etag ? { headers: { 'If-Match': etag } } : {}),
                    };
                }
                return { method: 'delete', url: `${base}/${entityId}` };
            }

            case 'sos':
                if (!missionSessionId) return null;
                return {
                    method: 'post',
                    url: `/mission-sessions/${missionSessionId}/sos`,
                    data: payload,
                };

            case 'location':
                if (!missionSessionId) return null;
                return {
                    method: 'post',
                    url: `/mission-sessions/${missionSessionId}/location/update`,
                    data: payload,
                };

            default:
                return null;
        }
    }

    private static statusOf(error: unknown): number | undefined {
        return (error as { response?: { status?: number } })?.response?.status;
    }

    private static messageOf(error: unknown): string {
        if (error instanceof Error) return error.message;
        return typeof error === 'string' ? error : 'Unknown error';
    }

    /**
     * 重放單筆。成功回傳 `true`；任何失敗回傳 `false`（呼叫端負責保留資料）。
     *
     * 401 處理：`src/api/client.ts` 的 interceptor 已經會做一次 refresh + 重試；
     * 若仍拿到 401（例如 interceptor 的 `_retry` 已用掉），這裡再顯式 refresh 一次
     * 並重送。**refresh 失敗時不丟棄資料**，只記錄錯誤等下一輪。
     */
    private async sendItem(request: OutboxRequest): Promise<void> {
        try {
            await api.request(request);
        } catch (error) {
            if (OfflineService.statusOf(error) !== 401) throw error;

            const newToken = await refreshAccessToken();
            if (!newToken) throw error;

            // 新 token 由 request interceptor 於重送時自動帶上
            await api.request(request);
        }
    }

    /**
     * 重放整個佇列（FIFO）。
     *
     * @param options.force 略過指數退避（手動「立即同步」用）。**不會**略過重試上限。
     */
    async attemptSync(options?: { force?: boolean }): Promise<SyncResult> {
        const empty: SyncResult = { success: 0, failed: 0, skipped: 0 };
        if (!this.isOnline || this._isSyncing) return empty;

        this._isSyncing = true;
        await this.notifyListeners();

        let success = 0;
        let failed = 0;
        let skipped = 0;

        try {
            const pending = await this.getPendingChanges();
            const now = Date.now();

            for (const item of pending) {
                // 已達重試上限：跳過但**保留**資料
                if (item.retryCount >= MAX_RETRY_COUNT) {
                    skipped++;
                    continue;
                }

                // 指數退避尚未到期
                if (!options?.force && item.nextAttemptAt && item.nextAttemptAt > now) {
                    skipped++;
                    continue;
                }

                const request = this.buildRequest(item);
                if (!request) {
                    // 無法組出請求（資料缺欄位）——同樣不刪除，記錄錯誤等人工處理
                    await this.markFailed(item, 'Unsupported or malformed outbox item');
                    failed++;
                    continue;
                }

                try {
                    await this.sendItem(request);
                    // 只有真正成功才刪除
                    await this.db.pendingSync.delete(item.id!);
                    success++;
                } catch (error) {
                    await this.markFailed(item, OfflineService.messageOf(error));
                    failed++;
                }
            }

            await this.db.metadata.put({ key: 'lastSyncAt', value: Date.now() });
        } finally {
            this._isSyncing = false;
            await this.notifyListeners();
        }

        return { success, failed, skipped };
    }

    /** 記錄失敗：遞增 retryCount、寫入 lastError、排定下次退避時間。**絕不刪除。** */
    private async markFailed(item: PendingSync, message: string): Promise<void> {
        const retryCount = item.retryCount + 1;
        const delay = Math.min(
            INITIAL_RETRY_DELAY_MS * Math.pow(2, item.retryCount),
            MAX_RETRY_DELAY_MS
        );

        await this.db.pendingSync.update(item.id!, {
            retryCount,
            lastError: message,
            nextAttemptAt: Date.now() + delay,
        });
    }

    /**
     * 重置所有「已達重試上限」的項目，讓它們能再次被重放。
     * @returns 被重置的項目數
     */
    async retryFailed(): Promise<number> {
        const stuck = (await this.getPendingChanges()).filter(
            i => i.retryCount >= MAX_RETRY_COUNT
        );

        for (const item of stuck) {
            await this.db.pendingSync.update(item.id!, {
                retryCount: 0,
                nextAttemptAt: undefined,
            });
        }

        await this.notifyListeners();
        return stuck.length;
    }

    // ===== 週期同步 / Background Sync（承接 syncManager）=====

    /** 啟動週期性背景同步（預設 30s） */
    startAutoSync(intervalMs: number = AUTO_SYNC_INTERVAL_MS): void {
        if (this._autoSyncTimer) return;

        this._autoSyncTimer = setInterval(() => {
            if (this.isOnline && !this._isSyncing) {
                void this.attemptSync();
            }
        }, intervalMs);
    }

    stopAutoSync(): void {
        if (this._autoSyncTimer) {
            clearInterval(this._autoSyncTimer);
            this._autoSyncTimer = null;
        }
    }

    /** 註冊 Background Sync API（瀏覽器支援時，關閉分頁後仍可補送） */
    async registerBackgroundSync(tag: string = 'outbox-sync'): Promise<boolean> {
        if (!('serviceWorker' in navigator)) return false;

        try {
            const registration = await navigator.serviceWorker.ready;
            const sync = (registration as ServiceWorkerRegistration & {
                sync?: { register: (tag: string) => Promise<void> };
            }).sync;

            if (sync) {
                await sync.register(tag);
                return true;
            }
        } catch {
            // Background Sync 不支援：週期同步 + online 事件已足夠作為回退
        }
        return false;
    }

    // ===== Metadata =====

    async getLastSyncTime(): Promise<number | null> {
        const record = await this.db.metadata.get('lastSyncAt');
        return record?.value || null;
    }

    async getStatus(): Promise<SyncStatus> {
        return {
            lastSyncAt: await this.getLastSyncTime(),
            pendingChanges: await this.getPendingCount(),
            isOnline: this.isOnline,
            isSyncing: this._isSyncing,
        };
    }

    // ===== Listeners =====

    subscribe(callback: (status: SyncStatus) => void): () => void {
        this._listeners.add(callback);
        return () => {
            this._listeners.delete(callback);
        };
    }

    private async notifyListeners(): Promise<void> {
        if (this._listeners.size === 0) return;
        const status = await this.getStatus();
        this._listeners.forEach(cb => cb(status));
    }

    // ===== Cleanup =====

    /**
     * 只清**唯讀快取**，保留未送出的 outbox 與同步元資料。
     *
     * 這是 UI「清除離線資料」該用的入口：使用者想釋放空間，不代表想丟掉
     * 還沒送出去的災情回報。要真的全清（含未送出資料）請顯式呼叫 `clearAllData()`。
     */
    async clearCaches(): Promise<void> {
        await Promise.all([
            this.db.alerts.clear(),
            this.db.tasks.clear(),
            this.db.resources.clear(),
            this.db.reports.clear(),
        ]);
        await this.notifyListeners();
    }

    /** **會刪除未送出的 outbox**。僅限登出／重置情境使用。 */
    async clearAllData(): Promise<void> {
        await Promise.all([
            this.db.alerts.clear(),
            this.db.tasks.clear(),
            this.db.resources.clear(),
            this.db.reports.clear(),
            this.db.pendingSync.clear(),
            this.db.metadata.clear(),
        ]);
    }

    /**
     * 清掉過舊的**唯讀快取**。
     * 刻意不碰 `pendingSync`——未送出的離線寫入沒有「過期」的概念。
     */
    async clearOldData(maxAgeDays: number = 7): Promise<void> {
        const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

        await Promise.all([
            this.db.alerts.where('cachedAt').below(cutoff).delete(),
            this.db.tasks.where('cachedAt').below(cutoff).delete(),
            this.db.resources.where('cachedAt').below(cutoff).delete(),
            this.db.reports.where('cachedAt').below(cutoff).delete(),
        ]);
    }
}

// ===== Singleton Export =====

export const offlineService = new OfflineService();
export default offlineService;
