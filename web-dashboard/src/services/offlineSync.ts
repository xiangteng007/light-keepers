/**
 * Offline Sync Service
 * 
 * 離線資料同步與衝突處理服務
 * - Last-write-wins 衝突策略
 * - 衝突事件記錄
 * - 可回放 log
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb';

// 同步項目類型
export type SyncEntityType = 'task' | 'report' | 'checkin';

// 離線操作記錄
export interface OfflineOperation {
    id: string;
    entityType: SyncEntityType;
    entityId: string;
    operation: 'create' | 'update' | 'delete';
    data: Record<string, unknown>;
    clientTs: string;
    serverTs?: string;
    status: 'pending' | 'synced' | 'conflict' | 'failed';
    conflictDetails?: ConflictDetails;
}

// 衝突詳情
export interface ConflictDetails {
    serverVersion: Record<string, unknown>;
    clientVersion: Record<string, unknown>;
    resolution: 'client-wins' | 'server-wins' | 'merged' | 'pending';
    resolvedAt?: string;
}

// 衝突事件（可回放）
export interface ConflictEvent {
    id: string;
    timestamp: string;
    entityType: SyncEntityType;
    entityId: string;
    conflictType: 'concurrent-update' | 'stale-update' | 'deleted-on-server';
    serverData: Record<string, unknown>;
    clientData: Record<string, unknown>;
    resolution: 'client-wins' | 'server-wins' | 'merged';
    resolvedBy: 'auto' | 'user';
}

// IndexedDB Schema
interface SyncDBSchema extends DBSchema {
    operations: {
        key: string;
        value: OfflineOperation;
        indexes: { 'by-status': string; 'by-entity': [SyncEntityType, string] };
    };
    conflictLog: {
        key: string;
        value: ConflictEvent;
    };
}

const DB_NAME = 'lightkeepers-sync';
const DB_VERSION = 1;

class OfflineSyncService {
    private db: IDBPDatabase<SyncDBSchema> | null = null;
    private isOnline: boolean = navigator.onLine;
    private syncInProgress: boolean = false;

    constructor() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.processQueue();
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

        this.db = await openDB<SyncDBSchema>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                const opStore = db.createObjectStore('operations', { keyPath: 'id' });
                opStore.createIndex('by-status', 'status');
                opStore.createIndex('by-entity', ['entityType', 'entityId']);

                db.createObjectStore('conflictLog', { keyPath: 'id' });
            },
        });
    }

    /**
     * 新增離線操作
     */
    async queueOperation(
        entityType: SyncEntityType,
        entityId: string,
        operation: 'create' | 'update' | 'delete',
        data: Record<string, unknown>,
    ): Promise<string> {
        await this.init();

        const op: OfflineOperation = {
            id: crypto.randomUUID(),
            entityType,
            entityId,
            operation,
            data,
            clientTs: new Date().toISOString(),
            status: 'pending',
        };

        await this.db!.put('operations', op);

        // 如果在線，立即嘗試同步
        if (this.isOnline) {
            this.processQueue();
        }

        return op.id;
    }

    /**
     * 處理待同步隊列
     */
    async processQueue(): Promise<void> {
        if (!this.isOnline || this.syncInProgress) return;

        await this.init();
        this.syncInProgress = true;

        try {
            const pending = await this.db!.getAllFromIndex('operations', 'by-status', 'pending');

            for (const op of pending) {
                await this.syncOperation(op);
            }
        } finally {
            this.syncInProgress = false;
        }
    }

    /**
     * 同步單一操作
     */
    private async syncOperation(op: OfflineOperation): Promise<void> {
        const endpoint = this.getEndpoint(op.entityType, op.entityId, op.operation);
        const method = this.getMethod(op.operation);

        try {
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: op.operation !== 'delete' ? JSON.stringify({
                    ...op.data,
                    clientTs: op.clientTs,
                }) : undefined,
            });

            if (response.ok) {
                const result = await response.json();
                op.status = 'synced';
                op.serverTs = result.serverTs || new Date().toISOString();
                await this.db!.put('operations', op);
            } else if (response.status === 409) {
                // 衝突處理
                const serverData = await response.json();
                await this.handleConflict(op, serverData);
            } else {
                op.status = 'failed';
                await this.db!.put('operations', op);
            }
        } catch (error) {
            console.warn('[OfflineSync] 同步失敗', error);
            // 保持 pending 狀態，等待網路恢復
        }
    }

    /**
     * 處理衝突 (Last-write-wins)
     */
    private async handleConflict(
        op: OfflineOperation,
        serverResponse: { data: Record<string, unknown>; serverTs: string },
    ): Promise<void> {
        const serverTs = new Date(serverResponse.serverTs);
        const clientTs = new Date(op.clientTs);

        const conflictEvent: ConflictEvent = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            entityType: op.entityType,
            entityId: op.entityId,
            conflictType: 'concurrent-update',
            serverData: serverResponse.data,
            clientData: op.data,
            resolution: clientTs > serverTs ? 'client-wins' : 'server-wins',
            resolvedBy: 'auto',
        };

        // 記錄衝突
        await this.db!.put('conflictLog', conflictEvent);

        // Last-write-wins: 使用較新的版本
        if (clientTs > serverTs) {
            // Client wins: 重新提交
            op.status = 'pending';
            await this.db!.put('operations', op);
            // 強制重試
            await this.forceSync(op);
        } else {
            // Server wins: 標記為已解決
            op.status = 'conflict';
            op.conflictDetails = {
                serverVersion: serverResponse.data,
                clientVersion: op.data,
                resolution: 'server-wins',
                resolvedAt: new Date().toISOString(),
            };
            await this.db!.put('operations', op);
        }
    }

    /**
     * 強制同步（覆蓋衝突）
     */
    private async forceSync(op: OfflineOperation): Promise<void> {
        const endpoint = this.getEndpoint(op.entityType, op.entityId, op.operation) + '?force=true';
        const method = this.getMethod(op.operation);

        try {
            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...op.data, clientTs: op.clientTs }),
            });

            if (response.ok) {
                op.status = 'synced';
                await this.db!.put('operations', op);
            }
        } catch (error) {
            console.error('[OfflineSync] 強制同步失敗', error);
        }
    }

    /**
     * 取得衝突記錄（可回放）
     */
    async getConflictLog(): Promise<ConflictEvent[]> {
        await this.init();
        return this.db!.getAll('conflictLog');
    }

    /**
     * 取得待同步數量
     */
    async getPendingCount(): Promise<number> {
        await this.init();
        return (await this.db!.getAllFromIndex('operations', 'by-status', 'pending')).length;
    }

    /**
     * 取得衝突數量
     */
    async getConflictCount(): Promise<number> {
        await this.init();
        return (await this.db!.getAllFromIndex('operations', 'by-status', 'conflict')).length;
    }

    private getEndpoint(type: SyncEntityType, id: string, op: string): string {
        const base = '/api/v1';
        const paths: Record<SyncEntityType, string> = {
            task: 'tasks',
            report: 'reports',
            checkin: 'checkins',
        };

        if (op === 'create') return `${base}/${paths[type]}`;
        return `${base}/${paths[type]}/${id}`;
    }

    private getMethod(op: 'create' | 'update' | 'delete'): string {
        return { create: 'POST', update: 'PUT', delete: 'DELETE' }[op];
    }
}

// 單例導出
export const offlineSyncService = new OfflineSyncService();

// React Hook
import { useState, useEffect, useCallback } from 'react';

export function useOfflineSync() {
    const [pendingCount, setPendingCount] = useState(0);
    const [conflictCount, setConflictCount] = useState(0);
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

    const refreshCounts = useCallback(async () => {
        setPendingCount(await offlineSyncService.getPendingCount());
        setConflictCount(await offlineSyncService.getConflictCount());
    }, []);

    const queueOperation = useCallback(async (
        entityType: SyncEntityType,
        entityId: string,
        operation: 'create' | 'update' | 'delete',
        data: Record<string, unknown>,
    ) => {
        const id = await offlineSyncService.queueOperation(entityType, entityId, operation, data);
        await refreshCounts();
        return id;
    }, [refreshCounts]);

    const getConflictLog = useCallback(async () => {
        return offlineSyncService.getConflictLog();
    }, []);

    useEffect(() => {
        refreshCounts();
        // 定期更新
        const interval = setInterval(refreshCounts, 5000);
        return () => clearInterval(interval);
    }, [refreshCounts]);

    return {
        isOnline,
        pendingCount,
        conflictCount,
        queueOperation,
        getConflictLog,
        refreshCounts,
    };
}
