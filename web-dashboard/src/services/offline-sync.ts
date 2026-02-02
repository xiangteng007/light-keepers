/**
 * Offline Sync Service
 * 
 * Handles IndexedDB storage, conflict detection, and sync queue management
 * for PWA offline functionality.
 */

// Database configuration
const DB_NAME = 'lightkeepers-offline';
const DB_VERSION = 1;

// Store names
const STORES = {
    SYNC_QUEUE: 'sync-queue',
    FIELD_REPORTS: 'field-reports',
    TASKS: 'tasks',
    RESOURCES: 'resources',
    USER_DATA: 'user-data',
} as const;

export interface SyncQueueItem {
    id: string;
    type: 'CREATE' | 'UPDATE' | 'DELETE';
    entity: string;
    data: any;
    timestamp: number;
    retryCount: number;
    lastError?: string;
}

export interface ConflictInfo {
    localVersion: any;
    serverVersion: any;
    field: string;
    resolution?: 'local' | 'server' | 'merge';
}

/**
 * Open IndexedDB connection
 */
export function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;

            // Sync queue store
            if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                const syncStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id' });
                syncStore.createIndex('timestamp', 'timestamp', { unique: false });
                syncStore.createIndex('entity', 'entity', { unique: false });
            }

            // Field reports store
            if (!db.objectStoreNames.contains(STORES.FIELD_REPORTS)) {
                const reportsStore = db.createObjectStore(STORES.FIELD_REPORTS, { keyPath: 'id' });
                reportsStore.createIndex('syncStatus', 'syncStatus', { unique: false });
                reportsStore.createIndex('createdAt', 'createdAt', { unique: false });
            }

            // Tasks store
            if (!db.objectStoreNames.contains(STORES.TASKS)) {
                const tasksStore = db.createObjectStore(STORES.TASKS, { keyPath: 'id' });
                tasksStore.createIndex('status', 'status', { unique: false });
            }

            // Resources store
            if (!db.objectStoreNames.contains(STORES.RESOURCES)) {
                db.createObjectStore(STORES.RESOURCES, { keyPath: 'id' });
            }

            // User data store
            if (!db.objectStoreNames.contains(STORES.USER_DATA)) {
                db.createObjectStore(STORES.USER_DATA, { keyPath: 'key' });
            }
        };
    });
}

/**
 * Offline Sync Manager
 */
export class OfflineSyncManager {
    private db: IDBDatabase | null = null;
    private syncInProgress = false;
    private listeners: Set<(queue: SyncQueueItem[]) => void> = new Set();

    async init(): Promise<void> {
        this.db = await openDatabase();
        
        // Listen for online status
        window.addEventListener('online', () => this.processSyncQueue());
    }

    /**
     * Add item to sync queue
     */
    async addToQueue(item: Omit<SyncQueueItem, 'id' | 'timestamp' | 'retryCount'>): Promise<string> {
        if (!this.db) await this.init();

        const queueItem: SyncQueueItem = {
            ...item,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            retryCount: 0,
        };

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(STORES.SYNC_QUEUE, 'readwrite');
            const store = transaction.objectStore(STORES.SYNC_QUEUE);
            const request = store.add(queueItem);

            request.onsuccess = () => {
                this.notifyListeners();
                resolve(queueItem.id);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all items in sync queue
     */
    async getQueue(): Promise<SyncQueueItem[]> {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(STORES.SYNC_QUEUE, 'readonly');
            const store = transaction.objectStore(STORES.SYNC_QUEUE);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Process sync queue when online
     */
    async processSyncQueue(): Promise<void> {
        if (this.syncInProgress || !navigator.onLine) return;

        this.syncInProgress = true;
        const queue = await this.getQueue();

        for (const item of queue.sort((a, b) => a.timestamp - b.timestamp)) {
            try {
                await this.syncItem(item);
                await this.removeFromQueue(item.id);
            } catch (error: any) {
                await this.updateRetryCount(item.id, error.message);
                
                // Stop processing if too many failures
                if (item.retryCount >= 3) {
                    console.error(`[OfflineSync] Max retries reached for ${item.id}`);
                }
            }
        }

        this.syncInProgress = false;
        this.notifyListeners();
    }

    /**
     * Sync individual item to server
     */
    private async syncItem(item: SyncQueueItem): Promise<void> {
        const baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
        const endpoint = `${baseUrl}/${item.entity}`;

        const response = await fetch(endpoint, {
            method: item.type === 'DELETE' ? 'DELETE' : item.type === 'CREATE' ? 'POST' : 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
            },
            body: item.type !== 'DELETE' ? JSON.stringify(item.data) : undefined,
        });

        if (!response.ok) {
            throw new Error(`Sync failed: ${response.status}`);
        }
    }

    /**
     * Remove item from queue after successful sync
     */
    private async removeFromQueue(id: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction(STORES.SYNC_QUEUE, 'readwrite');
            const store = transaction.objectStore(STORES.SYNC_QUEUE);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update retry count on failure
     */
    private async updateRetryCount(id: string, error: string): Promise<void> {
        const transaction = this.db!.transaction(STORES.SYNC_QUEUE, 'readwrite');
        const store = transaction.objectStore(STORES.SYNC_QUEUE);
        const request = store.get(id);

        request.onsuccess = () => {
            const item = request.result;
            if (item) {
                item.retryCount++;
                item.lastError = error;
                store.put(item);
            }
        };
    }

    /**
     * Detect conflicts between local and server versions
     */
    detectConflicts(local: any, server: any): ConflictInfo[] {
        const conflicts: ConflictInfo[] = [];

        for (const key of Object.keys(local)) {
            if (server[key] !== undefined && local[key] !== server[key]) {
                // Check if both were modified (timestamp comparison)
                if (local.updatedAt && server.updatedAt) {
                    const localTime = new Date(local.updatedAt).getTime();
                    const serverTime = new Date(server.updatedAt).getTime();
                    
                    if (localTime !== serverTime) {
                        conflicts.push({
                            field: key,
                            localVersion: local[key],
                            serverVersion: server[key],
                        });
                    }
                }
            }
        }

        return conflicts;
    }

    /**
     * Subscribe to queue changes
     */
    subscribe(callback: (queue: SyncQueueItem[]) => void): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    private async notifyListeners(): Promise<void> {
        const queue = await this.getQueue();
        this.listeners.forEach(cb => cb(queue));
    }
}

// Singleton instance
export const offlineSyncManager = new OfflineSyncManager();
