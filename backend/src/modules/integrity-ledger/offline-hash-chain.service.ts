/**
 * Offline Hash Chain Service
 * Phase 1.3: 輕量化離線完整性驗證
 * 
 * 功能:
 * 1. 任務進行中 - 僅本地 SHA-256 串接 (不即時上鏈)
 * 2. 任務結束後 - 批次上傳至 IntegrityLedgerService
 * 3. 離線期間維持完整性驗證能力
 */

import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { IntegrityLedgerService, CreateBlockDto } from './ledger.service';

/**
 * 離線區塊結構 (輕量化)
 */
export interface OfflineBlock {
    id: string;
    missionSessionId: string;
    resourceId: string;
    action: string;
    actorId: string;
    timestamp: string;
    prevHash: string;
    currHash: string;
    blockNumber: number;
    metadata?: Record<string, any>;
    isSynced: boolean;
}

/**
 * 離線鏈狀態
 */
export interface OfflineChainState {
    missionSessionId: string;
    totalBlocks: number;
    lastHash: string;
    pendingSyncCount: number;
    createdAt: string;
    lastUpdatedAt: string;
}

@Injectable()
export class OfflineHashChainService {
    private readonly logger = new Logger(OfflineHashChainService.name);
    private readonly GENESIS_HASH = '0'.repeat(64);

    // 記憶體中的離線鏈 (key: missionSessionId)
    private offlineChains: Map<string, OfflineBlock[]> = new Map();

    constructor(
        private readonly ledgerService: IntegrityLedgerService,
    ) { }

    // ==================== 離線區塊建立 ====================

    /**
     * 建立離線區塊 (不上鏈，僅本地 Hash)
     * 適用於任務進行中，低延遲記錄
     */
    createOfflineBlock(
        missionSessionId: string,
        resourceId: string,
        action: string,
        actorId: string,
        metadata?: Record<string, any>
    ): OfflineBlock {
        const chain = this.getOrCreateChain(missionSessionId);
        const blockNumber = chain.length + 1;
        const prevHash = chain.length > 0 ? chain[chain.length - 1].currHash : this.GENESIS_HASH;
        const timestamp = new Date().toISOString();

        // 計算 Hash
        const dataString = this.buildDataString(
            resourceId, action, actorId, prevHash, timestamp, blockNumber, metadata
        );
        const currHash = this.calculateHash(dataString);

        const block: OfflineBlock = {
            id: `offline-${missionSessionId}-${blockNumber}`,
            missionSessionId,
            resourceId,
            action,
            actorId,
            timestamp,
            prevHash,
            currHash,
            blockNumber,
            metadata,
            isSynced: false,
        };

        chain.push(block);
        this.logger.debug(`Offline block created: ${block.id} (${action})`);

        return block;
    }

    /**
     * 批量建立離線區塊
     */
    createOfflineBlocks(
        missionSessionId: string,
        entries: Array<{
            resourceId: string;
            action: string;
            actorId: string;
            metadata?: Record<string, any>;
        }>
    ): OfflineBlock[] {
        return entries.map(entry =>
            this.createOfflineBlock(
                missionSessionId,
                entry.resourceId,
                entry.action,
                entry.actorId,
                entry.metadata
            )
        );
    }

    // ==================== 鏈結驗證 (本地) ====================

    /**
     * 驗證離線鏈完整性 (不需網路)
     */
    validateOfflineChain(missionSessionId: string): {
        isValid: boolean;
        totalBlocks: number;
        invalidBlockNumbers: number[];
    } {
        const chain = this.offlineChains.get(missionSessionId);

        if (!chain || chain.length === 0) {
            return { isValid: true, totalBlocks: 0, invalidBlockNumbers: [] };
        }

        const invalidBlockNumbers: number[] = [];
        let isValid = true;

        for (let i = 0; i < chain.length; i++) {
            const block = chain[i];
            const expectedPrevHash = i === 0 ? this.GENESIS_HASH : chain[i - 1].currHash;

            // 驗證前一個 Hash 連結
            if (block.prevHash !== expectedPrevHash) {
                isValid = false;
                invalidBlockNumbers.push(block.blockNumber);
                continue;
            }

            // 重新計算並驗證 Hash
            const recalculatedHash = this.calculateHash(
                this.buildDataString(
                    block.resourceId,
                    block.action,
                    block.actorId,
                    block.prevHash,
                    block.timestamp,
                    block.blockNumber,
                    block.metadata
                )
            );

            if (recalculatedHash !== block.currHash) {
                isValid = false;
                invalidBlockNumbers.push(block.blockNumber);
            }
        }

        return { isValid, totalBlocks: chain.length, invalidBlockNumbers };
    }

    // ==================== 同步至主鏈 ====================

    /**
     * 任務結束後，批次同步至 IntegrityLedgerService
     */
    async syncToMainLedger(missionSessionId: string): Promise<{
        success: boolean;
        syncedCount: number;
        failedCount: number;
        errors: string[];
    }> {
        const chain = this.offlineChains.get(missionSessionId);

        if (!chain || chain.length === 0) {
            return { success: true, syncedCount: 0, failedCount: 0, errors: [] };
        }

        const pendingBlocks = chain.filter(b => !b.isSynced);
        const errors: string[] = [];
        let syncedCount = 0;

        this.logger.log(`Starting sync for mission ${missionSessionId}: ${pendingBlocks.length} pending blocks`);

        // 批次上傳
        for (const block of pendingBlocks) {
            try {
                const dto: CreateBlockDto = {
                    resourceId: block.resourceId,
                    action: block.action as any,
                    actorId: block.actorId,
                    metadata: {
                        ...block.metadata,
                        offlineBlockId: block.id,
                        offlineTimestamp: block.timestamp,
                        offlineHash: block.currHash,
                    },
                };

                await this.ledgerService.createBlock(dto);
                block.isSynced = true;
                syncedCount++;
            } catch (error) {
                const message = `Failed to sync block ${block.id}: ${(error as Error).message}`;
                this.logger.error(message);
                errors.push(message);
            }
        }

        const success = errors.length === 0;
        this.logger.log(`Sync complete: ${syncedCount}/${pendingBlocks.length} success`);

        return {
            success,
            syncedCount,
            failedCount: pendingBlocks.length - syncedCount,
            errors,
        };
    }

    /**
     * 重試失敗的同步
     */
    async retryFailedSync(missionSessionId: string): Promise<{
        success: boolean;
        syncedCount: number;
    }> {
        const chain = this.offlineChains.get(missionSessionId);
        if (!chain) return { success: true, syncedCount: 0 };

        const failedBlocks = chain.filter(b => !b.isSynced);
        const result = await this.syncToMainLedger(missionSessionId);

        return {
            success: result.success,
            syncedCount: result.syncedCount,
        };
    }

    // ==================== 狀態查詢 ====================

    /**
     * 取得離線鏈狀態
     */
    getChainState(missionSessionId: string): OfflineChainState | null {
        const chain = this.offlineChains.get(missionSessionId);
        if (!chain || chain.length === 0) return null;

        return {
            missionSessionId,
            totalBlocks: chain.length,
            lastHash: chain[chain.length - 1].currHash,
            pendingSyncCount: chain.filter(b => !b.isSynced).length,
            createdAt: chain[0].timestamp,
            lastUpdatedAt: chain[chain.length - 1].timestamp,
        };
    }

    /**
     * 取得所有活動中的離線鏈
     */
    getAllActiveChains(): OfflineChainState[] {
        const states: OfflineChainState[] = [];

        for (const [missionSessionId] of this.offlineChains) {
            const state = this.getChainState(missionSessionId);
            if (state) states.push(state);
        }

        return states;
    }

    /**
     * 取得離線區塊 (用於 UI 顯示)
     */
    getOfflineBlocks(missionSessionId: string): OfflineBlock[] {
        return this.offlineChains.get(missionSessionId) || [];
    }

    /**
     * 清除已同步完成的任務鏈
     */
    clearSyncedChain(missionSessionId: string): boolean {
        const chain = this.offlineChains.get(missionSessionId);
        if (!chain) return false;

        const pendingCount = chain.filter(b => !b.isSynced).length;
        if (pendingCount > 0) {
            this.logger.warn(`Cannot clear chain ${missionSessionId}: ${pendingCount} blocks pending sync`);
            return false;
        }

        this.offlineChains.delete(missionSessionId);
        this.logger.log(`Cleared synced chain: ${missionSessionId}`);
        return true;
    }

    // ==================== Private Helpers ====================

    private getOrCreateChain(missionSessionId: string): OfflineBlock[] {
        if (!this.offlineChains.has(missionSessionId)) {
            this.offlineChains.set(missionSessionId, []);
        }
        return this.offlineChains.get(missionSessionId)!;
    }

    private buildDataString(
        resourceId: string,
        action: string,
        actorId: string,
        prevHash: string,
        timestamp: string,
        blockNumber: number,
        metadata?: Record<string, any>
    ): string {
        return JSON.stringify({
            resourceId,
            action,
            actorId,
            prevHash,
            timestamp,
            blockNumber,
            metadata,
        });
    }

    private calculateHash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}
