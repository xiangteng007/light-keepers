/**
 * Conflict Resolver Service
 * 
 * P0 災時韌性：離線衝突解決策略
 * 處理資源雙重分配、位置不一致、任務搶占等衝突
 */

import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * 衝突類型
 */
export enum ConflictType {
    RESOURCE_ALLOCATION = 'resource_allocation',  // 資源雙重分配
    TASK_ASSIGNMENT = 'task_assignment',          // 任務搶占
    LOCATION_UPDATE = 'location_update',          // 位置不一致
    STATUS_UPDATE = 'status_update',              // 狀態衝突
    DATA_MODIFICATION = 'data_modification',      // 資料修改衝突
}

/**
 * 解決策略
 */
export enum ResolutionStrategy {
    LAST_WRITE_WINS = 'last_write_wins',          // 最後寫入優先
    FIRST_WRITE_WINS = 'first_write_wins',        // 先寫入優先
    MERGE = 'merge',                               // 合併
    MANUAL = 'manual',                             // 需人工處理
    PRIORITY_BASED = 'priority_based',             // 依優先級
    COMMANDER_PRIORITY = 'commander_priority',     // 指揮官優先
}

/**
 * 衝突記錄
 */
export interface ConflictRecord {
    id: string;
    type: ConflictType;
    entityType: string;
    entityId: string;
    localVersion: any;
    remoteVersion: any;
    localTimestamp: Date;
    remoteTimestamp: Date;
    localUserId: string;
    remoteUserId: string;
    resolution?: ResolutionStrategy;
    resolvedAt?: Date;
    resolvedBy?: string;
    resolvedValue?: any;
}

/**
 * 解決結果
 */
export interface ResolutionResult {
    success: boolean;
    strategy: ResolutionStrategy;
    resolvedValue: any;
    requiresManual: boolean;
    message?: string;
}

/**
 * 衝突解決服務
 * 
 * 功能:
 * - 自動衝突偵測
 * - 策略式解決
 * - 人工審核佇列
 * - 衝突歷史追蹤
 */
@Injectable()
export class ConflictResolverService {
    private readonly logger = new Logger(ConflictResolverService.name);
    
    // 待人工處理的衝突
    private readonly manualQueue: ConflictRecord[] = [];
    
    // 已解決的衝突歷史
    private readonly resolvedHistory: ConflictRecord[] = [];
    
    // 衝突類型對應的預設策略
    private readonly defaultStrategies: Record<ConflictType, ResolutionStrategy> = {
        [ConflictType.RESOURCE_ALLOCATION]: ResolutionStrategy.COMMANDER_PRIORITY,
        [ConflictType.TASK_ASSIGNMENT]: ResolutionStrategy.COMMANDER_PRIORITY,
        [ConflictType.LOCATION_UPDATE]: ResolutionStrategy.LAST_WRITE_WINS,
        [ConflictType.STATUS_UPDATE]: ResolutionStrategy.LAST_WRITE_WINS,
        [ConflictType.DATA_MODIFICATION]: ResolutionStrategy.MERGE,
    };

    constructor(private readonly eventEmitter: EventEmitter2) {}

    /**
     * 解決衝突
     */
    resolve(conflict: ConflictRecord): ResolutionResult {
        const strategy = conflict.resolution || this.defaultStrategies[conflict.type];
        
        this.logger.log(`Resolving ${conflict.type} conflict for ${conflict.entityType}:${conflict.entityId}`);
        
        switch (strategy) {
            case ResolutionStrategy.LAST_WRITE_WINS:
                return this.resolveLastWriteWins(conflict);
            
            case ResolutionStrategy.FIRST_WRITE_WINS:
                return this.resolveFirstWriteWins(conflict);
            
            case ResolutionStrategy.MERGE:
                return this.resolveMerge(conflict);
            
            case ResolutionStrategy.COMMANDER_PRIORITY:
                return this.resolveCommanderPriority(conflict);
            
            case ResolutionStrategy.PRIORITY_BASED:
                return this.resolvePriorityBased(conflict);
            
            case ResolutionStrategy.MANUAL:
            default:
                return this.queueForManualReview(conflict);
        }
    }

    /**
     * 解決資源分配衝突
     */
    resolveResourceConflict(
        resourceId: string,
        localAllocation: { userId: string; timestamp: Date; quantity: number },
        remoteAllocation: { userId: string; timestamp: Date; quantity: number },
    ): ResolutionResult {
        const conflict: ConflictRecord = {
            id: this.generateId(),
            type: ConflictType.RESOURCE_ALLOCATION,
            entityType: 'resource',
            entityId: resourceId,
            localVersion: localAllocation,
            remoteVersion: remoteAllocation,
            localTimestamp: localAllocation.timestamp,
            remoteTimestamp: remoteAllocation.timestamp,
            localUserId: localAllocation.userId,
            remoteUserId: remoteAllocation.userId,
        };
        
        return this.resolve(conflict);
    }

    /**
     * 解決任務分配衝突
     */
    resolveTaskConflict(
        taskId: string,
        localAssignment: { assigneeId: string; timestamp: Date; assignedBy: string },
        remoteAssignment: { assigneeId: string; timestamp: Date; assignedBy: string },
    ): ResolutionResult {
        const conflict: ConflictRecord = {
            id: this.generateId(),
            type: ConflictType.TASK_ASSIGNMENT,
            entityType: 'task',
            entityId: taskId,
            localVersion: localAssignment,
            remoteVersion: remoteAssignment,
            localTimestamp: localAssignment.timestamp,
            remoteTimestamp: remoteAssignment.timestamp,
            localUserId: localAssignment.assignedBy,
            remoteUserId: remoteAssignment.assignedBy,
        };
        
        return this.resolve(conflict);
    }

    /**
     * 解決位置更新衝突
     */
    resolveLocationConflict(
        entityId: string,
        localLocation: { lat: number; lng: number; timestamp: Date; userId: string },
        remoteLocation: { lat: number; lng: number; timestamp: Date; userId: string },
    ): ResolutionResult {
        const conflict: ConflictRecord = {
            id: this.generateId(),
            type: ConflictType.LOCATION_UPDATE,
            entityType: 'location',
            entityId,
            localVersion: localLocation,
            remoteVersion: remoteLocation,
            localTimestamp: localLocation.timestamp,
            remoteTimestamp: remoteLocation.timestamp,
            localUserId: localLocation.userId,
            remoteUserId: remoteLocation.userId,
        };
        
        return this.resolve(conflict);
    }

    /**
     * 取得待人工處理的衝突
     */
    getManualQueue(): ConflictRecord[] {
        return [...this.manualQueue];
    }

    /**
     * 人工解決衝突
     */
    resolveManually(
        conflictId: string,
        resolvedValue: any,
        resolvedBy: string,
    ): boolean {
        const index = this.manualQueue.findIndex(c => c.id === conflictId);
        
        if (index === -1) {
            this.logger.warn(`Conflict ${conflictId} not found in manual queue`);
            return false;
        }
        
        const conflict = this.manualQueue.splice(index, 1)[0];
        conflict.resolution = ResolutionStrategy.MANUAL;
        conflict.resolvedAt = new Date();
        conflict.resolvedBy = resolvedBy;
        conflict.resolvedValue = resolvedValue;
        
        this.resolvedHistory.push(conflict);
        
        // 發送解決事件
        this.eventEmitter.emit('conflict.resolved', conflict);
        
        this.logger.log(`Conflict ${conflictId} resolved manually by ${resolvedBy}`);
        return true;
    }

    /**
     * 取得解決歷史
     */
    getResolutionHistory(limit: number = 100): ConflictRecord[] {
        return this.resolvedHistory.slice(-limit);
    }

    /**
     * 取得統計
     */
    getStats(): {
        pendingManual: number;
        resolved: number;
        byType: Record<ConflictType, number>;
    } {
        const byType = {} as Record<ConflictType, number>;
        
        for (const conflict of this.resolvedHistory) {
            byType[conflict.type] = (byType[conflict.type] || 0) + 1;
        }
        
        return {
            pendingManual: this.manualQueue.length,
            resolved: this.resolvedHistory.length,
            byType,
        };
    }

    // ==================== Resolution Strategies ====================

    private resolveLastWriteWins(conflict: ConflictRecord): ResolutionResult {
        const resolvedValue = conflict.localTimestamp > conflict.remoteTimestamp
            ? conflict.localVersion
            : conflict.remoteVersion;
        
        this.recordResolution(conflict, ResolutionStrategy.LAST_WRITE_WINS, resolvedValue);
        
        return {
            success: true,
            strategy: ResolutionStrategy.LAST_WRITE_WINS,
            resolvedValue,
            requiresManual: false,
            message: `Resolved using ${conflict.localTimestamp > conflict.remoteTimestamp ? 'local' : 'remote'} version`,
        };
    }

    private resolveFirstWriteWins(conflict: ConflictRecord): ResolutionResult {
        const resolvedValue = conflict.localTimestamp < conflict.remoteTimestamp
            ? conflict.localVersion
            : conflict.remoteVersion;
        
        this.recordResolution(conflict, ResolutionStrategy.FIRST_WRITE_WINS, resolvedValue);
        
        return {
            success: true,
            strategy: ResolutionStrategy.FIRST_WRITE_WINS,
            resolvedValue,
            requiresManual: false,
        };
    }

    private resolveMerge(conflict: ConflictRecord): ResolutionResult {
        // 簡單合併: 深度合併兩個版本
        const resolvedValue = this.deepMerge(conflict.localVersion, conflict.remoteVersion);
        
        this.recordResolution(conflict, ResolutionStrategy.MERGE, resolvedValue);
        
        return {
            success: true,
            strategy: ResolutionStrategy.MERGE,
            resolvedValue,
            requiresManual: false,
            message: 'Versions merged',
        };
    }

    private resolveCommanderPriority(conflict: ConflictRecord): ResolutionResult {
        // 指揮官的決定優先
        // 這裡需要查詢使用者角色，簡化處理：使用 remote 版本 (假設來自上級)
        const resolvedValue = conflict.remoteVersion;
        
        this.recordResolution(conflict, ResolutionStrategy.COMMANDER_PRIORITY, resolvedValue);
        
        return {
            success: true,
            strategy: ResolutionStrategy.COMMANDER_PRIORITY,
            resolvedValue,
            requiresManual: false,
            message: 'Command authority applied',
        };
    }

    private resolvePriorityBased(conflict: ConflictRecord): ResolutionResult {
        // 依資料優先級解決
        const localPriority = conflict.localVersion?.priority || 0;
        const remotePriority = conflict.remoteVersion?.priority || 0;
        
        const resolvedValue = localPriority >= remotePriority
            ? conflict.localVersion
            : conflict.remoteVersion;
        
        this.recordResolution(conflict, ResolutionStrategy.PRIORITY_BASED, resolvedValue);
        
        return {
            success: true,
            strategy: ResolutionStrategy.PRIORITY_BASED,
            resolvedValue,
            requiresManual: false,
        };
    }

    private queueForManualReview(conflict: ConflictRecord): ResolutionResult {
        conflict.resolution = ResolutionStrategy.MANUAL;
        this.manualQueue.push(conflict);
        
        // 發送需人工處理事件
        this.eventEmitter.emit('conflict.manual_required', conflict);
        
        this.logger.warn(`Conflict ${conflict.id} queued for manual review`);
        
        return {
            success: false,
            strategy: ResolutionStrategy.MANUAL,
            resolvedValue: null,
            requiresManual: true,
            message: 'Queued for manual review',
        };
    }

    // ==================== Private Helpers ====================

    private recordResolution(
        conflict: ConflictRecord,
        strategy: ResolutionStrategy,
        resolvedValue: any,
    ): void {
        conflict.resolution = strategy;
        conflict.resolvedAt = new Date();
        conflict.resolvedValue = resolvedValue;
        this.resolvedHistory.push(conflict);
    }

    private generateId(): string {
        return `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private deepMerge(target: any, source: any): any {
        if (!target || typeof target !== 'object') return source;
        if (!source || typeof source !== 'object') return target;
        
        const result = { ...target };
        
        for (const key of Object.keys(source)) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                result[key] = this.deepMerge(target[key], source[key]);
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
}
