/**
 * 責信區塊鏈服務 (Integrity Ledger Service)
 * 模組 D: 物資流向不可篡改履歷
 */

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as crypto from 'crypto';
import { SupplyChainBlock, SupplyChainAction, BlockMetadata } from './entities/supply-chain-block.entity';

export interface CreateBlockDto {
    resourceId: string;
    resourceName?: string;
    action: SupplyChainAction;
    actorId: string;
    actorName?: string;
    metadata?: BlockMetadata;
    signature?: string;
}

export interface ChainValidationResult {
    isValid: boolean;
    totalBlocks: number;
    invalidBlocks: string[];
    lastVerifiedBlock: string;
}

export interface ResourceHistory {
    resourceId: string;
    resourceName: string;
    blocks: SupplyChainBlock[];
    totalInbound: number;
    totalOutbound: number;
    currentLocation: string;
}

@Injectable()
export class IntegrityLedgerService {
    private readonly logger = new Logger(IntegrityLedgerService.name);
    private readonly GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

    constructor(
        @InjectRepository(SupplyChainBlock)
        private blockRepository: Repository<SupplyChainBlock>,
        private dataSource: DataSource,
    ) { }

    // ==================== 區塊建立 ====================

    /**
     * 建立新的區塊記錄
     */
    async createBlock(dto: CreateBlockDto): Promise<SupplyChainBlock> {
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // 取得該資源的最後一個區塊
            const lastBlock = await queryRunner.manager.findOne(SupplyChainBlock, {
                where: { resourceId: dto.resourceId },
                order: { blockNumber: 'DESC' },
            });

            const prevHash = lastBlock?.currHash || this.GENESIS_HASH;
            const blockNumber = (lastBlock?.blockNumber || 0) + 1;
            const timestamp = new Date();

            // 計算 Hash
            const dataString = this.buildDataString(dto, prevHash, timestamp, blockNumber);
            const currHash = this.calculateHash(dataString);

            // 建立區塊
            const block = this.blockRepository.create({
                ...dto,
                prevHash,
                currHash,
                blockNumber,
                timestamp,
                isValid: true,
            });

            const savedBlock = await queryRunner.manager.save(block);
            await queryRunner.commitTransaction();

            this.logger.log(`Block created: ${savedBlock.id} (${dto.action}) for resource ${dto.resourceId}`);
            return savedBlock;

        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    /**
     * 批量記錄物資變動
     */
    async createBatchBlocks(dtos: CreateBlockDto[]): Promise<SupplyChainBlock[]> {
        const blocks: SupplyChainBlock[] = [];
        for (const dto of dtos) {
            const block = await this.createBlock(dto);
            blocks.push(block);
        }
        return blocks;
    }

    // ==================== 鏈結驗證 ====================

    /**
     * 驗證資源的完整區塊鏈
     */
    async validateChain(resourceId: string): Promise<ChainValidationResult> {
        const blocks = await this.blockRepository.find({
            where: { resourceId },
            order: { blockNumber: 'ASC' },
        });

        if (blocks.length === 0) {
            return {
                isValid: true,
                totalBlocks: 0,
                invalidBlocks: [],
                lastVerifiedBlock: '',
            };
        }

        const invalidBlocks: string[] = [];
        let isValid = true;
        let lastVerifiedBlock = '';

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            const expectedPrevHash = i === 0 ? this.GENESIS_HASH : blocks[i - 1].currHash;

            // 驗證前一個 Hash 連結
            if (block.prevHash !== expectedPrevHash) {
                isValid = false;
                invalidBlocks.push(block.id);
                continue;
            }

            // 重新計算並驗證 Hash
            const dataString = this.buildDataString(
                {
                    resourceId: block.resourceId,
                    resourceName: block.resourceName,
                    action: block.action,
                    actorId: block.actorId,
                    actorName: block.actorName,
                    metadata: block.metadata,
                },
                block.prevHash,
                block.timestamp,
                block.blockNumber
            );
            const calculatedHash = this.calculateHash(dataString);

            if (calculatedHash !== block.currHash) {
                isValid = false;
                invalidBlocks.push(block.id);
            } else {
                lastVerifiedBlock = block.id;
            }
        }

        return {
            isValid,
            totalBlocks: blocks.length,
            invalidBlocks,
            lastVerifiedBlock,
        };
    }

    /**
     * 驗證所有資源的區塊鏈
     */
    async validateAllChains(): Promise<Record<string, ChainValidationResult>> {
        const resourceIds = await this.blockRepository
            .createQueryBuilder('block')
            .select('DISTINCT block.resourceId', 'resourceId')
            .getRawMany();

        const results: Record<string, ChainValidationResult> = {};

        for (const { resourceId } of resourceIds) {
            results[resourceId] = await this.validateChain(resourceId);
        }

        return results;
    }

    // ==================== 查詢功能 ====================

    /**
     * 取得資源完整履歷
     */
    async getResourceHistory(resourceId: string): Promise<ResourceHistory | null> {
        const blocks = await this.blockRepository.find({
            where: { resourceId },
            order: { timestamp: 'ASC' },
        });

        if (blocks.length === 0) return null;

        const inboundActions = [SupplyChainAction.DONATION_IN, SupplyChainAction.PURCHASE_IN];
        const outboundActions = [SupplyChainAction.DISTRIBUTION, SupplyChainAction.WAREHOUSE_OUT];

        let totalInbound = 0;
        let totalOutbound = 0;
        let currentLocation = '';

        for (const block of blocks) {
            const qty = block.metadata?.quantity || 0;
            if (inboundActions.includes(block.action)) {
                totalInbound += qty;
            }
            if (outboundActions.includes(block.action)) {
                totalOutbound += qty;
            }
            if (block.metadata?.targetLocation) {
                currentLocation = block.metadata.targetLocation;
            }
        }

        return {
            resourceId,
            resourceName: blocks[0].resourceName || '',
            blocks,
            totalInbound,
            totalOutbound,
            currentLocation,
        };
    }

    /**
     * 透過收據編號查詢 (公開 API)
     */
    async getByReceiptNumber(receiptNumber: string): Promise<SupplyChainBlock[]> {
        return this.blockRepository
            .createQueryBuilder('block')
            .where("block.metadata->>'receiptNumber' = :receiptNumber", { receiptNumber })
            .orderBy('block.timestamp', 'ASC')
            .getMany();
    }

    /**
     * 取得最近的區塊記錄
     */
    async getRecentBlocks(limit: number = 50): Promise<SupplyChainBlock[]> {
        return this.blockRepository.find({
            order: { timestamp: 'DESC' },
            take: limit,
        });
    }

    /**
     * 取得統計數據
     */
    async getStats(): Promise<{
        totalBlocks: number;
        totalResources: number;
        recentActivity: number;
        chainIntegrity: number;
    }> {
        const totalBlocks = await this.blockRepository.count();

        const resourceCount = await this.blockRepository
            .createQueryBuilder('block')
            .select('COUNT(DISTINCT block.resourceId)', 'count')
            .getRawOne();

        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const recentActivity = await this.blockRepository
            .createQueryBuilder('block')
            .where('block.timestamp > :oneDayAgo', { oneDayAgo })
            .getCount();

        const invalidBlocks = await this.blockRepository.count({ where: { isValid: false } });
        const chainIntegrity = totalBlocks > 0
            ? Math.round(((totalBlocks - invalidBlocks) / totalBlocks) * 100)
            : 100;

        return {
            totalBlocks,
            totalResources: parseInt(resourceCount?.count || '0'),
            recentActivity,
            chainIntegrity,
        };
    }

    // ==================== Private Helpers ====================

    private buildDataString(
        dto: CreateBlockDto,
        prevHash: string,
        timestamp: Date,
        blockNumber: number
    ): string {
        return JSON.stringify({
            resourceId: dto.resourceId,
            resourceName: dto.resourceName,
            action: dto.action,
            actorId: dto.actorId,
            metadata: dto.metadata,
            prevHash,
            timestamp: timestamp.toISOString(),
            blockNumber,
        });
    }

    private calculateHash(data: string): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
}
