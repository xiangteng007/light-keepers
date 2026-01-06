/**
 * Sync Manager Service
 * Coordinates background synchronization of offline data with retry logic
 * and conflict resolution
 */

import { offlineOutbox } from './offlineOutbox';

export interface SyncStatus {
    isOnline: boolean;
    isSyncing: boolean;
    lastSyncAt: string | null;
    pendingCount: number;
    failedCount: number;
    syncProgress: number; // 0-100
}

export interface SyncResult {
    success: boolean;
    synced: number;
    failed: number;
    conflicts: string[];
    errors: string[];
}

type SyncEventHandler = (status: SyncStatus) => void;

/**
 * SyncManager - Coordinates background synchronization
 */
class SyncManagerService {
    private isOnline = navigator.onLine;
    private isSyncing = false;
    private lastSyncAt: string | null = null;
    private listeners: Set<SyncEventHandler> = new Set();
    private syncInterval: number | null = null;
    private retryTimeouts: Map<string, number> = new Map();

    // Constants
    private readonly SYNC_INTERVAL_MS = 30000; // 30 seconds
    private readonly MAX_RETRY_DELAY_MS = 300000; // 5 minutes
    private readonly INITIAL_RETRY_DELAY_MS = 5000; // 5 seconds

    constructor() {
        this.initListeners();
    }

    /**
     * Initialize online/offline listeners and periodic sync
     */
    private initListeners(): void {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.notifyListeners();
            // Trigger immediate sync when coming online
            this.sync();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.notifyListeners();
            // Clear retry timeouts when going offline
            this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
            this.retryTimeouts.clear();
        });
    }

    /**
     * Start periodic background sync
     */
    start(): void {
        if (this.syncInterval) return;

        this.syncInterval = window.setInterval(() => {
            if (this.isOnline && !this.isSyncing) {
                this.sync();
            }
        }, this.SYNC_INTERVAL_MS);

        // Initial sync on start
        if (this.isOnline) {
            this.sync();
        }
    }

    /**
     * Stop periodic background sync
     */
    stop(): void {
        if (this.syncInterval) {
            clearInterval(this.syncInterval);
            this.syncInterval = null;
        }
        this.retryTimeouts.forEach((timeout) => clearTimeout(timeout));
        this.retryTimeouts.clear();
    }

    /**
     * Subscribe to sync status changes
     */
    subscribe(handler: SyncEventHandler): () => void {
        this.listeners.add(handler);
        // Immediately notify with current status
        this.getStatus().then(handler);
        return () => this.listeners.delete(handler);
    }

    /**
     * Get current sync status
     */
    async getStatus(): Promise<SyncStatus> {
        const outboxStatus = await offlineOutbox.getStatus();
        return {
            isOnline: this.isOnline,
            isSyncing: this.isSyncing,
            lastSyncAt: this.lastSyncAt,
            pendingCount: outboxStatus.pending,
            failedCount: 0, // Could track this separately
            syncProgress: 0,
        };
    }

    /**
     * Notify all listeners of status change
     */
    private async notifyListeners(): Promise<void> {
        const status = await this.getStatus();
        this.listeners.forEach(handler => handler(status));
    }

    /**
     * Perform synchronization
     */
    async sync(): Promise<SyncResult> {
        if (this.isSyncing || !this.isOnline) {
            return {
                success: false,
                synced: 0,
                failed: 0,
                conflicts: [],
                errors: ['Sync already in progress or offline'],
            };
        }

        this.isSyncing = true;
        await this.notifyListeners();

        try {
            const result = await offlineOutbox.syncOutbox();
            this.lastSyncAt = new Date().toISOString();

            return {
                success: result.failed === 0,
                synced: result.synced,
                failed: result.failed,
                conflicts: [],
                errors: [],
            };
        } catch (error) {
            console.error('[SyncManager] Sync failed:', error);
            return {
                success: false,
                synced: 0,
                failed: 0,
                conflicts: [],
                errors: [(error as Error).message],
            };
        } finally {
            this.isSyncing = false;
            await this.notifyListeners();
        }
    }

    /**
     * Schedule retry with exponential backoff
     */
    scheduleRetry(itemId: string, retryCount: number): void {
        if (!this.isOnline) return;

        // Clear existing timeout for this item
        if (this.retryTimeouts.has(itemId)) {
            clearTimeout(this.retryTimeouts.get(itemId));
        }

        // Calculate backoff delay
        const delay = Math.min(
            this.INITIAL_RETRY_DELAY_MS * Math.pow(2, retryCount),
            this.MAX_RETRY_DELAY_MS
        );

        const timeout = window.setTimeout(() => {
            this.retryTimeouts.delete(itemId);
            this.sync();
        }, delay);

        this.retryTimeouts.set(itemId, timeout);
    }

    /**
     * Force immediate sync
     */
    async forceSync(): Promise<SyncResult> {
        // Wait if already syncing
        if (this.isSyncing) {
            await new Promise(resolve => setTimeout(resolve, 100));
            return this.forceSync();
        }
        return this.sync();
    }

    /**
     * Check if we should use offline mode
     */
    shouldUseOffline(): boolean {
        return !this.isOnline;
    }

    /**
     * Register for Background Sync API (if supported)
     */
    async registerBackgroundSync(tag: string = 'outbox-sync'): Promise<boolean> {
        if (!('serviceWorker' in navigator)) return false;

        try {
            const registration = await navigator.serviceWorker.ready;
            // @ts-ignore - Background Sync API
            if (registration.sync) {
                // @ts-ignore
                await registration.sync.register(tag);
                console.log('[SyncManager] Background sync registered:', tag);
                return true;
            }
        } catch (error) {
            console.warn('[SyncManager] Background sync not supported:', error);
        }
        return false;
    }
}

// Export singleton instance
export const syncManager = new SyncManagerService();
export default syncManager;
