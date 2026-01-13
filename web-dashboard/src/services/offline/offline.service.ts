/**
 * Offline Database Service
 * 
 * IndexedDB wrapper using Dexie for offline data persistence
 * v1.0: Alerts, tasks, resources caching
 */

import Dexie, { Table } from 'dexie';

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

export interface PendingSync {
    id?: number;
    type: 'create' | 'update' | 'delete';
    entity: 'task' | 'resource' | 'report';
    entityId: string;
    data: Record<string, any>;
    createdAt: number;
    retryCount: number;
}

export interface SyncStatus {
    lastSyncAt: number | null;
    pendingChanges: number;
    isOnline: boolean;
    isSyncing: boolean;
}

// ===== Dexie Database Class =====

class OfflineDatabase extends Dexie {
    alerts!: Table<CachedAlert, string>;
    tasks!: Table<CachedTask, string>;
    resources!: Table<CachedResource, string>;
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
    }
}

// ===== Offline Service =====

class OfflineService {
    private db: OfflineDatabase;
    private _isOnline: boolean = navigator.onLine;
    private _isSyncing: boolean = false;
    private _listeners: Set<(status: SyncStatus) => void> = new Set();

    constructor() {
        this.db = new OfflineDatabase();
        this.setupNetworkListeners();
    }

    // ===== Network Status =====

    private setupNetworkListeners() {
        window.addEventListener('online', () => {
            this._isOnline = true;
            this.notifyListeners();
            this.attemptSync();
        });

        window.addEventListener('offline', () => {
            this._isOnline = false;
            this.notifyListeners();
        });
    }

    get isOnline(): boolean {
        return this._isOnline;
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

    // ===== Sync Queue =====

    async queueSync(
        type: PendingSync['type'],
        entity: PendingSync['entity'],
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
        this.notifyListeners();
    }

    async getPendingChanges(): Promise<PendingSync[]> {
        return this.db.pendingSync.toArray();
    }

    async getPendingCount(): Promise<number> {
        return this.db.pendingSync.count();
    }

    async attemptSync(): Promise<{ success: number; failed: number }> {
        if (!this._isOnline || this._isSyncing) {
            return { success: 0, failed: 0 };
        }

        this._isSyncing = true;
        this.notifyListeners();

        const pending = await this.db.pendingSync.toArray();
        let success = 0;
        let failed = 0;

        for (const item of pending) {
            try {
                // Attempt to sync with server
                // In a real implementation, this would call the actual API
                console.log(`[Sync] ${item.type} ${item.entity}/${item.entityId}`);

                // Simulate API call
                await new Promise(resolve => setTimeout(resolve, 100));

                // Remove from queue on success
                await this.db.pendingSync.delete(item.id!);
                success++;
            } catch (error) {
                // Increment retry count
                await this.db.pendingSync.update(item.id!, {
                    retryCount: item.retryCount + 1
                });
                failed++;
            }
        }

        // Update last sync time
        await this.db.metadata.put({ key: 'lastSyncAt', value: Date.now() });

        this._isSyncing = false;
        this.notifyListeners();

        return { success, failed };
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
            isOnline: this._isOnline,
            isSyncing: this._isSyncing,
        };
    }

    // ===== Listeners =====

    subscribe(callback: (status: SyncStatus) => void): () => void {
        this._listeners.add(callback);
        return () => this._listeners.delete(callback);
    }

    private async notifyListeners(): Promise<void> {
        const status = await this.getStatus();
        this._listeners.forEach(cb => cb(status));
    }

    // ===== Cleanup =====

    async clearAllData(): Promise<void> {
        await Promise.all([
            this.db.alerts.clear(),
            this.db.tasks.clear(),
            this.db.resources.clear(),
            this.db.pendingSync.clear(),
            this.db.metadata.clear(),
        ]);
    }

    async clearOldData(maxAgeDays: number = 7): Promise<void> {
        const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000;

        await Promise.all([
            this.db.alerts.where('cachedAt').below(cutoff).delete(),
            this.db.tasks.where('cachedAt').below(cutoff).delete(),
            this.db.resources.where('cachedAt').below(cutoff).delete(),
        ]);
    }
}

// ===== Singleton Export =====

export const offlineService = new OfflineService();
export default offlineService;
