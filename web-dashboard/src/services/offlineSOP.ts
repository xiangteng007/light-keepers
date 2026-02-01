/**
 * Offline SOP Service
 * 
 * 離線 SOP 文件存取服務
 * - 使用 IndexedDB 儲存 SOP 文件
 * - 自動同步線上更新
 * - 離線時提供快取資料
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// SOP 文件類型
export interface SOPDocument {
    id: string;
    title: string;
    category: string;
    content: string;
    version: string;
    lastUpdated: string;
    attachments?: Array<{
        name: string;
        url: string;
        size: number;
    }>;
}

// SOP 列表項目（較輕量）
export interface SOPListItem {
    id: string;
    title: string;
    category: string;
    version: string;
    lastUpdated: string;
}

// IndexedDB Schema
interface SOPDBSchema extends DBSchema {
    sops: {
        key: string;
        value: SOPDocument;
        indexes: { 'by-category': string; 'by-updated': string };
    };
    sopList: {
        key: string;
        value: SOPListItem;
    };
    syncMeta: {
        key: string;
        value: { key: string; lastSync: string; version: string };
    };
}

const DB_NAME = 'lightkeepers-sop';
const DB_VERSION = 1;

class OfflineSOPService {
    private db: IDBPDatabase<SOPDBSchema> | null = null;
    private isOnline: boolean = navigator.onLine;

    constructor() {
        // 監聽網路狀態
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncIfNeeded();
        });
        window.addEventListener('offline', () => {
            this.isOnline = false;
        });
    }

    /**
     * 初始化 IndexedDB
     */
    async init(): Promise<void> {
        if (this.db) return;

        this.db = await openDB<SOPDBSchema>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // SOP 全文文件
                const sopStore = db.createObjectStore('sops', { keyPath: 'id' });
                sopStore.createIndex('by-category', 'category');
                sopStore.createIndex('by-updated', 'lastUpdated');

                // SOP 列表（輕量）
                db.createObjectStore('sopList', { keyPath: 'id' });

                // 同步元資料
                db.createObjectStore('syncMeta', { keyPath: 'key' });
            },
        });
    }

    /**
     * 取得 SOP 列表
     */
    async getSOPList(): Promise<SOPListItem[]> {
        await this.init();

        // 優先嘗試線上取得
        if (this.isOnline) {
            try {
                const response = await fetch('/api/v1/sops');
                if (response.ok) {
                    const data = await response.json();
                    const items: SOPListItem[] = data.data || [];

                    // 更新快取
                    const tx = this.db!.transaction('sopList', 'readwrite');
                    for (const item of items) {
                        await tx.store.put(item);
                    }
                    await tx.done;

                    // 更新同步時間
                    await this.db!.put('syncMeta', {
                        key: 'sopList',
                        lastSync: new Date().toISOString(),
                        version: data.version || '1.0',
                    });

                    return items;
                }
            } catch (error) {
                console.warn('[OfflineSOP] 無法連線，使用離線資料', error);
            }
        }

        // 離線回退：從 IndexedDB 取得
        return this.db!.getAll('sopList');
    }

    /**
     * 取得單一 SOP 文件
     */
    async getSOP(id: string): Promise<SOPDocument | null> {
        await this.init();

        // 優先嘗試線上取得
        if (this.isOnline) {
            try {
                const response = await fetch(`/api/v1/sops/${id}`);
                if (response.ok) {
                    const data = await response.json();
                    const sop: SOPDocument = data.data;

                    // 更新快取
                    await this.db!.put('sops', sop);

                    return sop;
                }
            } catch (error) {
                console.warn('[OfflineSOP] 無法連線，使用離線資料', error);
            }
        }

        // 離線回退：從 IndexedDB 取得
        const cachedSop = await this.db!.get('sops', id);
        return cachedSop ?? null;
    }

    /**
     * 快取多個 SOP 文件（預載用）
     */
    async preloadSOPs(ids: string[]): Promise<void> {
        if (!this.isOnline) return;

        for (const id of ids) {
            try {
                await this.getSOP(id);
            } catch (error) {
                console.warn(`[OfflineSOP] 預載 SOP ${id} 失敗`, error);
            }
        }
    }

    /**
     * 取得同步狀態
     */
    async getSyncStatus(): Promise<{ lastSync: string | null; isStale: boolean }> {
        await this.init();

        const meta = await this.db!.get('syncMeta', 'sopList');
        if (!meta) {
            return { lastSync: null, isStale: true };
        }

        const lastSyncDate = new Date(meta.lastSync);
        const hoursSinceSync = (Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60);

        return {
            lastSync: meta.lastSync,
            isStale: hoursSinceSync > 24, // 超過 24 小時視為過期
        };
    }

    /**
     * 強制同步
     */
    async forceSync(): Promise<boolean> {
        if (!this.isOnline) return false;

        try {
            await this.getSOPList();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 按需同步
     */
    private async syncIfNeeded(): Promise<void> {
        const { isStale } = await this.getSyncStatus();
        if (isStale) {
            await this.forceSync();
        }
    }

    /**
     * 清除離線快取
     */
    async clearCache(): Promise<void> {
        await this.init();
        await this.db!.clear('sops');
        await this.db!.clear('sopList');
        await this.db!.clear('syncMeta');
    }
}

// 單例導出
export const offlineSOPService = new OfflineSOPService();

// React Hook
import { useState, useEffect, useCallback } from 'react';

export function useOfflineSOP() {
    const [sopList, setSopList] = useState<SOPListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isOffline, setIsOffline] = useState(!navigator.onLine);
    const [lastSync, setLastSync] = useState<string | null>(null);

    useEffect(() => {
        const handleOnline = () => setIsOffline(false);
        const handleOffline = () => setIsOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const loadSOPList = useCallback(async () => {
        setIsLoading(true);
        try {
            const list = await offlineSOPService.getSOPList();
            setSopList(list);

            const status = await offlineSOPService.getSyncStatus();
            setLastSync(status.lastSync);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const getSOP = useCallback(async (id: string) => {
        return offlineSOPService.getSOP(id);
    }, []);

    const refresh = useCallback(async () => {
        const success = await offlineSOPService.forceSync();
        if (success) {
            await loadSOPList();
        }
        return success;
    }, [loadSOPList]);

    useEffect(() => {
        loadSOPList();
    }, [loadSOPList]);

    return {
        sopList,
        isLoading,
        isOffline,
        lastSync,
        getSOP,
        refresh,
    };
}
