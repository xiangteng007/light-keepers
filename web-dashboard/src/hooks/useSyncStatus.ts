/**
 * useSyncStatus Hook
 * Provides sync status and controls for offline data synchronization
 */

import { useState, useEffect, useCallback } from 'react';
import { syncManager } from '../services/syncManager';
import type { SyncStatus, SyncResult } from '../services/syncManager';

export interface UseSyncStatusReturn {
    status: SyncStatus;
    sync: () => Promise<SyncResult>;
    forceSync: () => Promise<SyncResult>;
    isOnline: boolean;
    isSyncing: boolean;
    pendingCount: number;
    lastSyncAt: Date | null;
}

/**
 * Hook for monitoring and controlling sync status
 */
export function useSyncStatus(): UseSyncStatusReturn {
    const [status, setStatus] = useState<SyncStatus>({
        isOnline: navigator.onLine,
        isSyncing: false,
        lastSyncAt: null,
        pendingCount: 0,
        failedCount: 0,
        syncProgress: 0,
    });

    // Subscribe to sync status changes
    useEffect(() => {
        const unsubscribe = syncManager.subscribe(setStatus);

        // Start sync manager when component mounts
        syncManager.start();

        return () => {
            unsubscribe();
            // Don't stop sync manager on unmount - it should run globally
        };
    }, []);

    // Sync action
    const sync = useCallback(async () => {
        return syncManager.sync();
    }, []);

    // Force sync action
    const forceSync = useCallback(async () => {
        return syncManager.forceSync();
    }, []);

    return {
        status,
        sync,
        forceSync,
        isOnline: status.isOnline,
        isSyncing: status.isSyncing,
        pendingCount: status.pendingCount,
        lastSyncAt: status.lastSyncAt ? new Date(status.lastSyncAt) : null,
    };
}

export default useSyncStatus;
