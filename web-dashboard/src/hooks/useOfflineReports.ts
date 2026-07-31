/**
 * 網路狀態 Hook
 *
 * FE-4 / 工作項 3.4：本檔原本還包含一個 `useOfflineReports` hook——**第三套**離線佇列
 * （IndexedDB `lightkeepers-offline`），與 `offline.service`（`LightKeepersOfflineDB`）、
 * `offlineOutbox`（`lightkeepers-outbox`）各自為政。該 hook 零消費者，且其同步邏輯
 * 用相對路徑 `/api/v1/reports` 且**完全沒有帶 Authorization**，上線後必定 401。
 *
 * 已隨離線層收斂刪除；離線寫入一律改用
 * `src/services/offline/offline.service.ts` 的 outbox（`queueReport` 等）。
 * 盤點與判定見 `docs/architecture/OFFLINE_LAYER_CONSOLIDATION.md`。
 *
 * 保留 `useNetworkStatus` 是因為它有實際消費者（`src/components/NetworkStatus.tsx`）。
 */
import { useState, useEffect } from 'react';

/** 回傳當下的線上/離線狀態，並隨 online/offline 事件更新 */
export function useNetworkStatus(): boolean {
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
