/**
 * 離線回報管理 Hook
 * 使用 IndexedDB 儲存離線時的災情回報，並在上線後自動同步
 */
import { useState, useEffect, useCallback } from 'react';

// IndexedDB 配置
const DB_NAME = 'lightkeepers-offline';
const DB_VERSION = 1;
const STORE_NAME = 'pending-reports';

export interface OfflineReport {
    id: string;
    type: string;
    title: string;
    description: string;
    latitude: number;
    longitude: number;
    address?: string;
    photos?: string[]; // Base64 encoded
    contactName?: string;
    contactPhone?: string;
    createdAt: Date;
    syncAttempts: number;
    lastSyncError?: string;
}

// 開啟 IndexedDB
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                store.createIndex('createdAt', 'createdAt', { unique: false });
            }
        };
    });
}

// 生成唯一 ID
function generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function useOfflineReports() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);

    // 監聽網路狀態
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            // 上線後自動同步
            syncPendingReports();
        };

        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // 初始化時檢查待同步數量
        loadPendingCount();

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 讀取待同步數量
    const loadPendingCount = async () => {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const count = await new Promise<number>((resolve) => {
                const request = store.count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(0);
            });
            setPendingCount(count);
            db.close();
        } catch (error) {
            console.error('Failed to load pending count:', error);
        }
    };

    // 儲存離線回報
    const saveOfflineReport = useCallback(async (report: Omit<OfflineReport, 'id' | 'createdAt' | 'syncAttempts'>) => {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            const offlineReport: OfflineReport = {
                ...report,
                id: generateId(),
                createdAt: new Date(),
                syncAttempts: 0,
            };

            await new Promise<void>((resolve, reject) => {
                const request = store.add(offlineReport);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });

            db.close();
            await loadPendingCount();

            return { success: true, id: offlineReport.id };
        } catch (error) {
            console.error('Failed to save offline report:', error);
            return { success: false, error: (error as Error).message };
        }
    }, []);

    // 取得所有待同步回報
    const getPendingReports = useCallback(async (): Promise<OfflineReport[]> => {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);

            const reports = await new Promise<OfflineReport[]>((resolve) => {
                const request = store.getAll();
                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => resolve([]);
            });

            db.close();
            return reports;
        } catch (error) {
            console.error('Failed to get pending reports:', error);
            return [];
        }
    }, []);

    // 刪除已同步的回報
    const deleteReport = useCallback(async (id: string) => {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            await new Promise<void>((resolve) => {
                const request = store.delete(id);
                request.onsuccess = () => resolve();
                request.onerror = () => resolve();
            });

            db.close();
            await loadPendingCount();
        } catch (error) {
            console.error('Failed to delete report:', error);
        }
    }, []);

    // 更新同步狀態
    const updateReportSyncStatus = useCallback(async (id: string, error?: string) => {
        try {
            const db = await openDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            const store = tx.objectStore(STORE_NAME);

            const report = await new Promise<OfflineReport | undefined>((resolve) => {
                const request = store.get(id);
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(undefined);
            });

            if (report) {
                report.syncAttempts++;
                report.lastSyncError = error;
                await new Promise<void>((resolve) => {
                    const request = store.put(report);
                    request.onsuccess = () => resolve();
                    request.onerror = () => resolve();
                });
            }

            db.close();
        } catch (error) {
            console.error('Failed to update sync status:', error);
        }
    }, []);

    // 同步待處理回報
    const syncPendingReports = useCallback(async () => {
        if (!navigator.onLine || isSyncing) return;

        setIsSyncing(true);
        const reports = await getPendingReports();

        for (const report of reports) {
            try {
                // 嘗試上傳
                const response = await fetch('/api/v1/reports', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        type: report.type,
                        title: report.title,
                        description: report.description,
                        latitude: report.latitude,
                        longitude: report.longitude,
                        address: report.address,
                        photos: report.photos,
                        contactName: report.contactName,
                        contactPhone: report.contactPhone,
                        source: 'offline',
                    }),
                });

                if (response.ok) {
                    // 同步成功，刪除本地記錄
                    await deleteReport(report.id);
                    console.log(`Synced offline report: ${report.id}`);
                } else {
                    const errorText = await response.text();
                    await updateReportSyncStatus(report.id, errorText);
                }
            } catch (error) {
                await updateReportSyncStatus(report.id, (error as Error).message);
            }
        }

        setIsSyncing(false);
        await loadPendingCount();
    }, [getPendingReports, deleteReport, updateReportSyncStatus, isSyncing]);

    return {
        isOnline,
        pendingCount,
        isSyncing,
        saveOfflineReport,
        getPendingReports,
        deleteReport,
        syncPendingReports,
    };
}

// 網路狀態 Hook（簡化版）
export function useNetworkStatus() {
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
