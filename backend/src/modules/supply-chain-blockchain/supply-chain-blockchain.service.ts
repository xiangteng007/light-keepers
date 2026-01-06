import { Injectable, Logger } from '@nestjs/common';
import * as crypto from 'crypto';

export interface Block {
    index: number;
    timestamp: Date;
    data: TransactionData;
    previousHash: string;
    hash: string;
    nonce: number;
}

export interface TransactionData {
    type: 'donation' | 'transfer' | 'distribution' | 'receipt';
    itemId: string;
    itemName: string;
    quantity: number;
    fromEntity: string;
    toEntity: string;
    location?: string;
    metadata?: Record<string, any>;
    signature?: string;
}

export interface DonationRecord {
    id: string;
    donorName: string;
    donorType: 'individual' | 'organization';
    items: { name: string; quantity: number; unit: string }[];
    receivedAt: Date;
    receiptNumber: string;
    blockHash: string;
}

export interface AuditTrail {
    itemId: string;
    itemName: string;
    events: {
        timestamp: Date;
        action: string;
        actor: string;
        location: string;
        blockHash: string;
    }[];
}

@Injectable()
export class SupplyChainBlockchainService {
    private readonly logger = new Logger(SupplyChainBlockchainService.name);
    private chain: Block[] = [];
    private donations: Map<string, DonationRecord> = new Map();
    private itemTrails: Map<string, AuditTrail> = new Map();
    private difficulty = 2;

    constructor() {
        this.createGenesisBlock();
    }

    private createGenesisBlock(): void {
        const genesisBlock: Block = {
            index: 0,
            timestamp: new Date('2026-01-01'),
            data: {
                type: 'donation',
                itemId: 'genesis',
                itemName: 'Genesis Block',
                quantity: 0,
                fromEntity: 'System',
                toEntity: 'System',
            },
            previousHash: '0',
            hash: '',
            nonce: 0,
        };
        genesisBlock.hash = this.calculateHash(genesisBlock);
        this.chain.push(genesisBlock);
    }

    private calculateHash(block: Block): string {
        const data = JSON.stringify({
            index: block.index,
            timestamp: block.timestamp,
            data: block.data,
            previousHash: block.previousHash,
            nonce: block.nonce,
        });
        return crypto.createHash('sha256').update(data).digest('hex');
    }

    private mineBlock(block: Block): Block {
        const target = '0'.repeat(this.difficulty);
        while (!block.hash.startsWith(target)) {
            block.nonce++;
            block.hash = this.calculateHash(block);
        }
        return block;
    }

    // ===== 區塊鏈操作 =====

    addTransaction(data: TransactionData): Block {
        const previousBlock = this.chain[this.chain.length - 1];
        const newBlock: Block = {
            index: previousBlock.index + 1,
            timestamp: new Date(),
            data,
            previousHash: previousBlock.hash,
            hash: '',
            nonce: 0,
        };

        this.mineBlock(newBlock);
        this.chain.push(newBlock);

        // 更新物資追蹤
        this.updateItemTrail(data, newBlock.hash);

        this.logger.log(`Block mined: ${newBlock.hash.substring(0, 16)}...`);
        return newBlock;
    }

    getChain(): Block[] {
        return this.chain;
    }

    getBlock(hash: string): Block | undefined {
        return this.chain.find(b => b.hash === hash);
    }

    verifyChain(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        for (let i = 1; i < this.chain.length; i++) {
            const current = this.chain[i];
            const previous = this.chain[i - 1];

            if (current.hash !== this.calculateHash(current)) {
                errors.push(`Block ${i}: Hash mismatch`);
            }

            if (current.previousHash !== previous.hash) {
                errors.push(`Block ${i}: Previous hash mismatch`);
            }
        }

        return { valid: errors.length === 0, errors };
    }

    // ===== 捐贈記錄 =====

    recordDonation(data: Omit<DonationRecord, 'id' | 'blockHash' | 'receiptNumber'>): DonationRecord {
        const donation: DonationRecord = {
            ...data,
            id: `don-${Date.now()}`,
            receiptNumber: `RC-${Date.now()}`,
            blockHash: '',
        };

        // 為每個物品建立區塊
        for (const item of data.items) {
            const block = this.addTransaction({
                type: 'donation',
                itemId: `${donation.id}-${item.name}`,
                itemName: item.name,
                quantity: item.quantity,
                fromEntity: data.donorName,
                toEntity: '光守護者協會',
                metadata: { unit: item.unit, donorType: data.donorType },
            });
            donation.blockHash = block.hash; // 最後一個區塊
        }

        this.donations.set(donation.id, donation);
        return donation;
    }

    getDonation(id: string): DonationRecord | undefined {
        return this.donations.get(id);
    }

    getAllDonations(): DonationRecord[] {
        return Array.from(this.donations.values());
    }

    getDonationsByDonor(donorName: string): DonationRecord[] {
        return Array.from(this.donations.values())
            .filter(d => d.donorName === donorName);
    }

    // ===== 物資追蹤 =====

    private updateItemTrail(data: TransactionData, blockHash: string): void {
        let trail = this.itemTrails.get(data.itemId);
        if (!trail) {
            trail = { itemId: data.itemId, itemName: data.itemName, events: [] };
            this.itemTrails.set(data.itemId, trail);
        }

        trail.events.push({
            timestamp: new Date(),
            action: data.type,
            actor: data.fromEntity,
            location: data.location || 'Unknown',
            blockHash,
        });
    }

    getItemTrail(itemId: string): AuditTrail | undefined {
        return this.itemTrails.get(itemId);
    }

    transferItem(
        itemId: string,
        fromEntity: string,
        toEntity: string,
        quantity: number,
        location?: string
    ): Block {
        const trail = this.itemTrails.get(itemId);
        if (!trail) throw new Error('Item not found in blockchain');

        return this.addTransaction({
            type: 'transfer',
            itemId,
            itemName: trail.itemName,
            quantity,
            fromEntity,
            toEntity,
            location,
        });
    }

    distributeItem(
        itemId: string,
        toEntity: string,
        quantity: number,
        location: string
    ): Block {
        const trail = this.itemTrails.get(itemId);
        if (!trail) throw new Error('Item not found in blockchain');

        return this.addTransaction({
            type: 'distribution',
            itemId,
            itemName: trail.itemName,
            quantity,
            fromEntity: '光守護者協會',
            toEntity,
            location,
        });
    }

    // ===== 公開稽核 =====

    getPublicLedger(): {
        totalBlocks: number;
        totalDonations: number;
        totalItems: number;
        recentTransactions: Block[];
    } {
        return {
            totalBlocks: this.chain.length,
            totalDonations: this.donations.size,
            totalItems: this.itemTrails.size,
            recentTransactions: this.chain.slice(-10),
        };
    }

    generateAuditReport(startDate: Date, endDate: Date): {
        period: { start: Date; end: Date };
        donations: number;
        distributions: number;
        transfers: number;
        integrity: { valid: boolean; errors: string[] };
    } {
        const filtered = this.chain.filter(
            b => b.timestamp >= startDate && b.timestamp <= endDate
        );

        return {
            period: { start: startDate, end: endDate },
            donations: filtered.filter(b => b.data.type === 'donation').length,
            distributions: filtered.filter(b => b.data.type === 'distribution').length,
            transfers: filtered.filter(b => b.data.type === 'transfer').length,
            integrity: this.verifyChain(),
        };
    }
}
