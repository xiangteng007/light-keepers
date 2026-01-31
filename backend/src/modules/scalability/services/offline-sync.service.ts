import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 離線操作類型
 */
export enum OfflineOperationType {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
}

/**
 * 衝突解決策略
 */
export enum ConflictResolutionStrategy {
    CLIENT_WINS = 'client_wins',
    SERVER_WINS = 'server_wins',
    MANUAL = 'manual',
    MERGE = 'merge',
    LAST_WRITE_WINS = 'last_write_wins',
}

export interface OfflineOperation {
    id: string;
    clientId: string;
    entityType: string;
    entityId: string;
    operation: OfflineOperationType;
    data: any;
    timestamp: Date;
    syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'failed';
    retryCount: number;
    conflictData?: any;
}

export interface SyncResult {
    operationId: string;
    success: boolean;
    conflict?: {
        clientData: any;
        serverData: any;
        resolution?: string;
    };
    error?: string;
}

export interface SyncBatchResult {
    clientId: string;
    synced: number;
    failed: number;
    conflicts: number;
    results: SyncResult[];
    syncedAt: Date;
}

/**
 * Offline Sync Service
 * 
 * 提供離線優先同步功能：
 * - 離線操作佇列
 * - 衝突偵測與解決
 * - 增量同步
 */
@Injectable()
export class OfflineSyncService {
    private readonly logger = new Logger(OfflineSyncService.name);
    private operations: Map<string, OfflineOperation> = new Map();
    private conflictStrategy = ConflictResolutionStrategy.LAST_WRITE_WINS;

    constructor(private readonly eventEmitter: EventEmitter2) {}

    /**
     * 排隊離線操作
     */
    queueOperation(data: Omit<OfflineOperation, 'id' | 'syncStatus' | 'retryCount'>): OfflineOperation {
        const operation: OfflineOperation = {
            ...data,
            id: `op-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            syncStatus: 'pending',
            retryCount: 0,
        };

        this.operations.set(operation.id, operation);
        this.logger.log(`Queued offline operation: ${operation.id} (${operation.operation} ${operation.entityType})`);
        
        return operation;
    }

    /**
     * 同步單一操作
     */
    async syncOperation(operationId: string): Promise<SyncResult> {
        const operation = this.operations.get(operationId);
        if (!operation) {
            return { operationId, success: false, error: 'Operation not found' };
        }

        operation.syncStatus = 'syncing';

        try {
            // 模擬衝突偵測
            const serverData = await this.fetchServerData(operation.entityType, operation.entityId);
            
            if (serverData && this.hasConflict(operation, serverData)) {
                const resolution = await this.resolveConflict(operation, serverData);
                
                if (resolution.resolved) {
                    operation.syncStatus = 'synced';
                    return {
                        operationId,
                        success: true,
                        conflict: {
                            clientData: operation.data,
                            serverData,
                            resolution: resolution.strategy,
                        },
                    };
                } else {
                    operation.syncStatus = 'conflict';
                    operation.conflictData = serverData;
                    return {
                        operationId,
                        success: false,
                        conflict: { clientData: operation.data, serverData },
                    };
                }
            }

            // 無衝突，直接同步
            operation.syncStatus = 'synced';
            this.eventEmitter.emit('offline.sync.success', { operation });
            
            return { operationId, success: true };
        } catch (error) {
            operation.syncStatus = 'failed';
            operation.retryCount++;
            
            return { operationId, success: false, error: error.message };
        }
    }

    /**
     * 批次同步
     */
    async syncBatch(clientId: string): Promise<SyncBatchResult> {
        const clientOperations = Array.from(this.operations.values())
            .filter(op => op.clientId === clientId && op.syncStatus === 'pending')
            .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

        let synced = 0;
        let failed = 0;
        let conflicts = 0;
        const results: SyncResult[] = [];

        for (const operation of clientOperations) {
            const result = await this.syncOperation(operation.id);
            results.push(result);

            if (result.success) {
                synced++;
            } else if (result.conflict) {
                conflicts++;
            } else {
                failed++;
            }
        }

        return {
            clientId,
            synced,
            failed,
            conflicts,
            results,
            syncedAt: new Date(),
        };
    }

    /**
     * 取得待同步操作
     */
    getPendingOperations(clientId: string): OfflineOperation[] {
        return Array.from(this.operations.values())
            .filter(op => op.clientId === clientId && op.syncStatus === 'pending');
    }

    /**
     * 取得衝突操作
     */
    getConflictOperations(clientId: string): OfflineOperation[] {
        return Array.from(this.operations.values())
            .filter(op => op.clientId === clientId && op.syncStatus === 'conflict');
    }

    /**
     * 手動解決衝突
     */
    resolveConflictManually(operationId: string, resolution: 'use_client' | 'use_server' | 'merge', mergedData?: any): boolean {
        const operation = this.operations.get(operationId);
        if (!operation || operation.syncStatus !== 'conflict') {
            return false;
        }

        switch (resolution) {
            case 'use_client':
                operation.syncStatus = 'synced';
                break;
            case 'use_server':
                operation.data = operation.conflictData;
                operation.syncStatus = 'synced';
                break;
            case 'merge':
                if (mergedData) {
                    operation.data = mergedData;
                    operation.syncStatus = 'synced';
                }
                break;
        }

        delete operation.conflictData;
        return true;
    }

    /**
     * 設定衝突解決策略
     */
    setConflictStrategy(strategy: ConflictResolutionStrategy): void {
        this.conflictStrategy = strategy;
    }

    // === Private ===

    private async fetchServerData(entityType: string, entityId: string): Promise<any | null> {
        // 模擬從伺服器取得資料
        return Math.random() > 0.7 ? { lastModified: new Date(), version: 2 } : null;
    }

    private hasConflict(operation: OfflineOperation, serverData: any): boolean {
        if (!serverData) return false;
        
        const serverTime = new Date(serverData.lastModified).getTime();
        const clientTime = operation.timestamp.getTime();
        
        return serverTime > clientTime;
    }

    private async resolveConflict(
        operation: OfflineOperation,
        serverData: any
    ): Promise<{ resolved: boolean; strategy?: string }> {
        switch (this.conflictStrategy) {
            case ConflictResolutionStrategy.CLIENT_WINS:
                return { resolved: true, strategy: 'client_wins' };
            
            case ConflictResolutionStrategy.SERVER_WINS:
                operation.data = serverData;
                return { resolved: true, strategy: 'server_wins' };
            
            case ConflictResolutionStrategy.LAST_WRITE_WINS:
                const serverTime = new Date(serverData.lastModified).getTime();
                const clientTime = operation.timestamp.getTime();
                if (clientTime > serverTime) {
                    return { resolved: true, strategy: 'client_wins_lww' };
                } else {
                    operation.data = serverData;
                    return { resolved: true, strategy: 'server_wins_lww' };
                }
            
            case ConflictResolutionStrategy.MANUAL:
            default:
                return { resolved: false };
        }
    }
}
