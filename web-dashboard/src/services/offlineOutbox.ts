/**
 * Offline Outbox Service for Capacitor Field Worker App
 * Uses IndexedDB to store reports, SOS signals, and location updates
 * when the device is offline, then syncs when connectivity is restored.
 */

const DB_NAME = 'lightkeepers-outbox';
const DB_VERSION = 1;

interface OutboxItem {
    id: string;
    type: 'report' | 'sos' | 'location' | 'attachment';
    data: any;
    createdAt: string;
    retryCount: number;
    lastError?: string;
}

class OfflineOutboxService {
    private db: IDBDatabase | null = null;
    private isOnline = navigator.onLine;
    private syncInProgress = false;
    private onSyncCallback?: (item: OutboxItem, success: boolean) => void;

    constructor() {
        this.initListeners();
    }

    /**
     * Initialize the IndexedDB database
     */
    async init(): Promise<void> {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Outbox store for pending items
                if (!db.objectStoreNames.contains('outbox')) {
                    const store = db.createObjectStore('outbox', { keyPath: 'id' });
                    store.createIndex('type', 'type', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Cache store for reports (for offline viewing)
                if (!db.objectStoreNames.contains('reports-cache')) {
                    const cache = db.createObjectStore('reports-cache', { keyPath: 'id' });
                    cache.createIndex('missionSessionId', 'missionSessionId', { unique: false });
                }
            };
        });
    }

    /**
     * Initialize online/offline listeners
     */
    private initListeners(): void {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncOutbox();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * Set callback for sync events
     */
    onSync(callback: (item: OutboxItem, success: boolean) => void): void {
        this.onSyncCallback = callback;
    }

    /**
     * Add an item to the outbox
     */
    async addToOutbox(type: OutboxItem['type'], data: any): Promise<string> {
        if (!this.db) throw new Error('Database not initialized');

        const item: OutboxItem = {
            id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type,
            data,
            createdAt: new Date().toISOString(),
            retryCount: 0,
        };

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('outbox', 'readwrite');
            const store = tx.objectStore('outbox');
            const request = store.add(item);

            request.onsuccess = () => {
                // Try to sync immediately if online
                if (this.isOnline) {
                    this.syncOutbox();
                }
                resolve(item.id);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all pending items from outbox
     */
    async getPendingItems(): Promise<OutboxItem[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('outbox', 'readonly');
            const store = tx.objectStore('outbox');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Remove an item from outbox
     */
    async removeFromOutbox(id: string): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('outbox', 'readwrite');
            const store = tx.objectStore('outbox');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Update an item in outbox (for retry tracking)
     */
    async updateOutboxItem(item: OutboxItem): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('outbox', 'readwrite');
            const store = tx.objectStore('outbox');
            const request = store.put(item);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Sync all pending items when online
     */
    async syncOutbox(): Promise<{ synced: number; failed: number }> {
        if (!this.isOnline || this.syncInProgress) {
            return { synced: 0, failed: 0 };
        }

        this.syncInProgress = true;
        let synced = 0;
        let failed = 0;

        try {
            const items = await this.getPendingItems();

            for (const item of items) {
                try {
                    await this.syncItem(item);
                    await this.removeFromOutbox(item.id);
                    synced++;
                    this.onSyncCallback?.(item, true);
                } catch (error) {
                    item.retryCount++;
                    item.lastError = error instanceof Error ? error.message : 'Unknown error';

                    if (item.retryCount >= 5) {
                        // Max retries reached, keep in outbox but stop trying
                        console.error(`Max retries reached for item ${item.id}`);
                    }

                    await this.updateOutboxItem(item);
                    failed++;
                    this.onSyncCallback?.(item, false);
                }
            }
        } finally {
            this.syncInProgress = false;
        }

        return { synced, failed };
    }

    /**
     * Sync a single item to the server
     */
    private async syncItem(item: OutboxItem): Promise<void> {
        const { type, data } = item;
        const token = data.token;
        const apiUrl = import.meta.env.VITE_API_URL || '';

        switch (type) {
            case 'report':
                await fetch(`${apiUrl}/mission-sessions/${data.missionSessionId}/reports`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(data.report),
                });
                break;

            case 'sos':
                await fetch(`${apiUrl}/mission-sessions/${data.missionSessionId}/sos`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(data.sos),
                });
                break;

            case 'location':
                await fetch(`${apiUrl}/mission-sessions/${data.missionSessionId}/location/update`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify(data.location),
                });
                break;

            case 'attachment':
                // Attachments need special handling - upload to signed URL
                // This is handled by UploadQueue separately
                throw new Error('Attachments should be synced via UploadQueue');
        }
    }

    /**
     * Cache reports for offline viewing
     */
    async cacheReports(reports: any[]): Promise<void> {
        if (!this.db) throw new Error('Database not initialized');

        const tx = this.db.transaction('reports-cache', 'readwrite');
        const store = tx.objectStore('reports-cache');

        for (const report of reports) {
            store.put(report);
        }

        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    }

    /**
     * Get cached reports for a mission session
     */
    async getCachedReports(missionSessionId: string): Promise<any[]> {
        if (!this.db) throw new Error('Database not initialized');

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('reports-cache', 'readonly');
            const store = tx.objectStore('reports-cache');
            const index = store.index('missionSessionId');
            const request = index.getAll(missionSessionId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get outbox status
     */
    async getStatus(): Promise<{
        pending: number;
        byType: Record<string, number>;
        isOnline: boolean;
    }> {
        const items = await this.getPendingItems();
        const byType: Record<string, number> = {};

        for (const item of items) {
            byType[item.type] = (byType[item.type] || 0) + 1;
        }

        return {
            pending: items.length,
            byType,
            isOnline: this.isOnline,
        };
    }
}

// Export singleton instance
export const offlineOutbox = new OfflineOutboxService();
export default offlineOutbox;
