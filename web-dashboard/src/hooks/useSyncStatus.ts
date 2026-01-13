/**
 * Sync Status Hook
 * 
 * React hook for monitoring offline sync status
 * v1.0
 */

import { useState, useEffect, useCallback } from 'react';
import { offlineService, SyncStatus } from '../services/offline/offline.service';

export function useSyncStatus() {
    const [status, setStatus] = useState<SyncStatus>({
        lastSyncAt: null,
        pendingChanges: 0,
        isOnline: navigator.onLine,
        isSyncing: false,
    });

    useEffect(() => {
        // Get initial status
        offlineService.getStatus().then(setStatus);

        // Subscribe to updates
        const unsubscribe = offlineService.subscribe(setStatus);

        return () => {
            unsubscribe();
        };
    }, []);

    const sync = useCallback(async () => {
        return offlineService.attemptSync();
    }, []);

    const clearData = useCallback(async () => {
        await offlineService.clearAllData();
        const newStatus = await offlineService.getStatus();
        setStatus(newStatus);
    }, []);

    return {
        ...status,
        sync,
        clearData,
    };
}

export default useSyncStatus;
