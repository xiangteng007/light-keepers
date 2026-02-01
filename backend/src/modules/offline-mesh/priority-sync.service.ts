/**
 * Priority Sync Service
 * 
 * P0 災時韌性：優先同步佇列
 * 確保 SOS、傷亡等關鍵訊息優先同步
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 同步優先級
 */
export enum SyncPriority {
    CRITICAL = 1,  // SOS、傷亡、緊急求救 → 立即同步
    HIGH = 2,      // 資源請求、任務分配 → 5 分鐘內
    NORMAL = 3,    // 狀態更新、位置回報 → 30 分鐘內
    LOW = 4,       // 日誌、統計 → 網路恢復時
}

/**
 * 同步項目
 */
export interface SyncItem {
    id: string;
    type: string;
    priority: SyncPriority;
    payload: any;
    createdAt: Date;
    attempts: number;
    lastAttempt?: Date;
    expiresAt?: Date;
}

/**
 * 同步狀態
 */
export interface SyncStatus {
    pending: number;
    synced: number;
    failed: number;
    byPriority: Record<SyncPriority, number>;
    lastSyncAt?: Date;
}

/**
 * 優先同步服務
 * 
 * 功能:
 * - 優先級佇列管理
 * - 自動重試機制
 * - 過期項目清理
 * - 網路恢復自動同步
 */
@Injectable()
export class PrioritySyncService {
    private readonly logger = new Logger(PrioritySyncService.name);
    
    // 優先級佇列 (按優先級分組)
    private readonly queues = new Map<SyncPriority, SyncItem[]>([
        [SyncPriority.CRITICAL, []],
        [SyncPriority.HIGH, []],
        [SyncPriority.NORMAL, []],
        [SyncPriority.LOW, []],
    ]);
    
    // 已同步項目計數
    private syncedCount = 0;
    private failedCount = 0;
    private lastSyncAt?: Date;
    
    // 最大重試次數
    private readonly MAX_RETRIES = 5;
    
    // 重試間隔 (毫秒)
    private readonly RETRY_INTERVALS = {
        [SyncPriority.CRITICAL]: 5000,    // 5 秒
        [SyncPriority.HIGH]: 60000,       // 1 分鐘
        [SyncPriority.NORMAL]: 300000,    // 5 分鐘
        [SyncPriority.LOW]: 900000,       // 15 分鐘
    };

    constructor(private readonly eventEmitter: EventEmitter2) {}

    /**
     * 加入同步佇列
     */
    enqueue(
        type: string,
        payload: any,
        priority: SyncPriority = SyncPriority.NORMAL,
        expiresIn?: number,
    ): string {
        const id = this.generateId();
        const now = new Date();
        
        const item: SyncItem = {
            id,
            type,
            priority,
            payload,
            createdAt: now,
            attempts: 0,
            expiresAt: expiresIn ? new Date(now.getTime() + expiresIn) : undefined,
        };
        
        this.queues.get(priority)!.push(item);
        
        this.logger.debug(`Enqueued ${type} with priority ${priority}, id: ${id}`);
        
        // CRITICAL 項目立即觸發同步事件
        if (priority === SyncPriority.CRITICAL) {
            this.eventEmitter.emit('sync.critical', item);
        }
        
        return id;
    }

    /**
     * 快捷方法: 加入 SOS 訊息 (CRITICAL)
     */
    enqueueSOS(payload: any): string {
        return this.enqueue('sos', payload, SyncPriority.CRITICAL);
    }

    /**
     * 快捷方法: 加入資源請求 (HIGH)
     */
    enqueueResourceRequest(payload: any): string {
        return this.enqueue('resource_request', payload, SyncPriority.HIGH);
    }

    /**
     * 快捷方法: 加入狀態更新 (NORMAL)
     */
    enqueueStatusUpdate(payload: any): string {
        return this.enqueue('status_update', payload, SyncPriority.NORMAL);
    }

    /**
     * 取得下一個待同步項目 (按優先級)
     */
    dequeue(): SyncItem | null {
        for (const priority of [
            SyncPriority.CRITICAL,
            SyncPriority.HIGH,
            SyncPriority.NORMAL,
            SyncPriority.LOW,
        ]) {
            const queue = this.queues.get(priority)!;
            if (queue.length > 0) {
                return queue.shift()!;
            }
        }
        return null;
    }

    /**
     * 批次取得待同步項目
     */
    dequeueBatch(maxItems: number = 10): SyncItem[] {
        const items: SyncItem[] = [];
        
        while (items.length < maxItems) {
            const item = this.dequeue();
            if (!item) break;
            items.push(item);
        }
        
        return items;
    }

    /**
     * 標記同步成功
     */
    markSynced(id: string): void {
        this.syncedCount++;
        this.lastSyncAt = new Date();
        this.logger.debug(`Item ${id} synced successfully`);
    }

    /**
     * 標記同步失敗 (重新加入佇列)
     */
    markFailed(item: SyncItem, error?: string): boolean {
        item.attempts++;
        item.lastAttempt = new Date();
        
        if (item.attempts >= this.MAX_RETRIES) {
            this.failedCount++;
            this.logger.error(`Item ${item.id} failed after ${item.attempts} attempts: ${error}`);
            return false; // 不再重試
        }
        
        // 重新加入佇列
        this.queues.get(item.priority)!.push(item);
        this.logger.warn(`Item ${item.id} failed, retry ${item.attempts}/${this.MAX_RETRIES}`);
        return true;
    }

    /**
     * 取得佇列狀態
     */
    getStatus(): SyncStatus {
        const byPriority: Record<SyncPriority, number> = {
            [SyncPriority.CRITICAL]: this.queues.get(SyncPriority.CRITICAL)!.length,
            [SyncPriority.HIGH]: this.queues.get(SyncPriority.HIGH)!.length,
            [SyncPriority.NORMAL]: this.queues.get(SyncPriority.NORMAL)!.length,
            [SyncPriority.LOW]: this.queues.get(SyncPriority.LOW)!.length,
        };
        
        const pending = Object.values(byPriority).reduce((a, b) => a + b, 0);
        
        return {
            pending,
            synced: this.syncedCount,
            failed: this.failedCount,
            byPriority,
            lastSyncAt: this.lastSyncAt,
        };
    }

    /**
     * 取得 CRITICAL 項目數量
     */
    getCriticalCount(): number {
        return this.queues.get(SyncPriority.CRITICAL)!.length;
    }

    /**
     * 清理過期項目
     */
    cleanupExpired(): number {
        const now = new Date();
        let cleaned = 0;
        
        for (const queue of this.queues.values()) {
            const initialLength = queue.length;
            const filtered = queue.filter(item => {
                if (item.expiresAt && now > item.expiresAt) {
                    this.logger.debug(`Removing expired item ${item.id}`);
                    return false;
                }
                return true;
            });
            
            cleaned += initialLength - filtered.length;
            queue.length = 0;
            queue.push(...filtered);
        }
        
        if (cleaned > 0) {
            this.logger.log(`Cleaned up ${cleaned} expired sync items`);
        }
        
        return cleaned;
    }

    /**
     * 取得重試間隔
     */
    getRetryInterval(priority: SyncPriority): number {
        return this.RETRY_INTERVALS[priority];
    }

    /**
     * 檢查是否有待同步項目
     */
    hasPending(): boolean {
        for (const queue of this.queues.values()) {
            if (queue.length > 0) return true;
        }
        return false;
    }

    /**
     * 清空所有佇列
     */
    clear(): void {
        for (const queue of this.queues.values()) {
            queue.length = 0;
        }
        this.logger.log('All sync queues cleared');
    }

    // ==================== Private Helpers ====================

    private generateId(): string {
        return `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
