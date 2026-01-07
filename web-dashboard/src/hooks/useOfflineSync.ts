/**
 * useOfflineSync Hook
 * Phase 6: PWA 離線功能
 * 
 * 提供離線狀態偵測和同步功能
 */

import { useState, useEffect, useCallback } from 'react';

interface OfflineQueueItem {
    id: string;
    url: string;
    method: string;
    body: any;
    timestamp: number;
}

interface SyncResult {
    id: string;
    success: boolean;
    status?: number;
    error?: string;
}

interface UseOfflineSyncReturn {
    isOnline: boolean;
    isSupported: boolean;
    queueLength: number;
    queue: OfflineQueueItem[];
    queueRequest: (url: string, method: string, body: any) => void;
    cacheSopDocuments: (sopUrls: string[]) => void;
    clearCache: () => Promise<void>;
    syncNow: () => Promise<void>;
}

export function useOfflineSync(): UseOfflineSyncReturn {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [queue, setQueue] = useState<OfflineQueueItem[]>([]);
    const [isSupported] = useState('serviceWorker' in navigator);

    // 監聽網路狀態變化
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            console.log('[useOfflineSync] Online');
        };

        const handleOffline = () => {
            setIsOnline(false);
            console.log('[useOfflineSync] Offline');
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 監聽 Service Worker 訊息
    useEffect(() => {
        if (!isSupported) return;

        const handleMessage = (event: MessageEvent) => {
            switch (event.data.type) {
                case 'QUEUE_UPDATE':
                    setQueue(event.data.queue || []);
                    break;
                case 'SYNC_COMPLETE':
                    console.log('[useOfflineSync] Sync complete:', event.data.results);
                    // 更新佇列
                    requestQueueStatus();
                    break;
            }
        };

        navigator.serviceWorker.addEventListener('message', handleMessage);

        // 初始取得佇列狀態
        requestQueueStatus();

        return () => {
            navigator.serviceWorker.removeEventListener('message', handleMessage);
        };
    }, [isSupported]);

    // 請求佇列狀態
    const requestQueueStatus = useCallback(() => {
        if (!isSupported) return;

        navigator.serviceWorker.ready.then((registration) => {
            registration.active?.postMessage({ type: 'GET_QUEUE' });
        });
    }, [isSupported]);

    // 加入離線請求佇列
    const queueRequest = useCallback((url: string, method: string, body: any) => {
        if (!isSupported) {
            console.warn('[useOfflineSync] Service Worker not supported');
            return;
        }

        navigator.serviceWorker.ready.then((registration) => {
            registration.active?.postMessage({
                type: 'QUEUE_REQUEST',
                data: { url, method, body },
            });
        });
    }, [isSupported]);

    // 預載 SOP 文件到快取
    const cacheSopDocuments = useCallback((sopUrls: string[]) => {
        if (!isSupported || sopUrls.length === 0) return;

        navigator.serviceWorker.ready.then((registration) => {
            registration.active?.postMessage({
                type: 'CACHE_SOP',
                data: { sopUrls },
            });
        });
    }, [isSupported]);

    // 清除所有快取
    const clearCache = useCallback(async () => {
        if (!isSupported) return;

        return new Promise<void>((resolve) => {
            const handleMessage = (event: MessageEvent) => {
                if (event.data.type === 'CACHE_CLEARED') {
                    navigator.serviceWorker.removeEventListener('message', handleMessage);
                    resolve();
                }
            };

            navigator.serviceWorker.addEventListener('message', handleMessage);

            navigator.serviceWorker.ready.then((registration) => {
                registration.active?.postMessage({ type: 'CLEAR_CACHE' });
            });
        });
    }, [isSupported]);

    // 手動觸發同步
    const syncNow = useCallback(async () => {
        if (!isSupported || !isOnline) return;

        try {
            const registration = await navigator.serviceWorker.ready;
            await registration.sync?.register('offline-sync');
            console.log('[useOfflineSync] Sync triggered');
        } catch (error) {
            console.error('[useOfflineSync] Sync registration failed:', error);
        }
    }, [isSupported, isOnline]);

    return {
        isOnline,
        isSupported,
        queueLength: queue.length,
        queue,
        queueRequest,
        cacheSopDocuments,
        clearCache,
        syncNow,
    };
}

/**
 * 離線狀態指示元件專用 Hook
 */
export function useOnlineStatus(): boolean {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return isOnline;
}

export default useOfflineSync;
