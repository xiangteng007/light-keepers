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

    /** 手動同步：略過指數退避（使用者明確要求，不該再等） */
    const sync = useCallback(async () => {
        return offlineService.attemptSync({ force: true });
    }, []);

    /**
     * 清除離線快取。
     *
     * 刻意只清**唯讀快取**（`clearCaches`）而非 `clearAllData()`——後者會連同
     * 尚未送出的 outbox 一起刪掉，等於使用者按一下「清除」就把離線期間寫的
     * 災情回報弄丟了。見 `docs/architecture/OFFLINE_LAYER_CONSOLIDATION.md`。
     */
    const clearData = useCallback(async () => {
        await offlineService.clearCaches();
        const newStatus = await offlineService.getStatus();
        setStatus(newStatus);
    }, []);

    /** 重置已達重試上限的項目，讓它們能再次嘗試送出 */
    const retryFailed = useCallback(async () => {
        const count = await offlineService.retryFailed();
        if (count > 0) await offlineService.attemptSync({ force: true });
        return count;
    }, []);

    return {
        ...status,
        sync,
        clearData,
        retryFailed,
    };
}

export default useSyncStatus;
