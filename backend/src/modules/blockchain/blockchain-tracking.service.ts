import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Blockchain Tracking Service
 * Immutable supply chain tracking for disaster relief resources
 */
@Injectable()
export class BlockchainTrackingService {
    private readonly logger = new Logger(BlockchainTrackingService.name);

    // Simulated blockchain state (would connect to actual chain in production)
    private blocks: Block[] = [];
    private pendingTransactions: ResourceTransaction[] = [];

    // Smart contract state
    private resourceRegistry: Map<string, ResourceRecord> = new Map();
    private organizationBalances: Map<string, number> = new Map();

    constructor(
        private configService: ConfigService,
        private eventEmitter: EventEmitter2,
    ) {
        // Initialize genesis block
        this.createGenesisBlock();
    }

    /**
     * Register a new resource batch on the blockchain
     */
    async registerResource(resource: ResourceRegistration): Promise<TransactionResult> {
        const transaction: ResourceTransaction = {
            id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'register',
            resourceId: resource.resourceId,
            resourceType: resource.type,
            quantity: resource.quantity,
            origin: resource.origin,
            destination: null,
            donor: resource.donor,
            timestamp: new Date(),
            signature: await this.signTransaction(resource),
            metadata: resource.metadata,
        };

        this.pendingTransactions.push(transaction);

        // Update registry
        this.resourceRegistry.set(resource.resourceId, {
            ...resource,
            currentLocation: resource.origin,
            status: 'registered',
            history: [transaction],
        });

        // Auto-mine if threshold reached
        if (this.pendingTransactions.length >= 5) {
            await this.mineBlock();
        }

        this.eventEmitter.emit('blockchain.resource.registered', transaction);

        return {
            success: true,
            transactionId: transaction.id,
            blockNumber: this.blocks.length,
            timestamp: transaction.timestamp,
        };
    }

    /**
     * Record resource transfer between locations
     */
    async transferResource(transfer: ResourceTransfer): Promise<TransactionResult> {
        const resource = this.resourceRegistry.get(transfer.resourceId);
        if (!resource) {
            throw new Error(`Resource not found: ${transfer.resourceId}`);
        }

        if (resource.quantity < transfer.quantity) {
            throw new Error('Insufficient resource quantity');
        }

        const transaction: ResourceTransaction = {
            id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'transfer',
            resourceId: transfer.resourceId,
            resourceType: resource.type,
            quantity: transfer.quantity,
            origin: resource.currentLocation,
            destination: transfer.destination,
            donor: null,
            timestamp: new Date(),
            signature: await this.signTransaction(transfer),
            metadata: {
                carrier: transfer.carrier,
                expectedArrival: transfer.expectedArrival,
                notes: transfer.notes,
            },
        };

        this.pendingTransactions.push(transaction);

        // Update registry
        resource.currentLocation = transfer.destination;
        resource.quantity -= transfer.quantity;
        resource.history.push(transaction);
        resource.status = 'in-transit';

        this.eventEmitter.emit('blockchain.resource.transferred', transaction);

        return {
            success: true,
            transactionId: transaction.id,
            blockNumber: this.blocks.length + 1,
            timestamp: transaction.timestamp,
        };
    }

    /**
     * Record resource distribution to beneficiaries
     */
    async distributeResource(distribution: ResourceDistribution): Promise<TransactionResult> {
        const resource = this.resourceRegistry.get(distribution.resourceId);
        if (!resource) {
            throw new Error(`Resource not found: ${distribution.resourceId}`);
        }

        const transaction: ResourceTransaction = {
            id: `tx-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'distribute',
            resourceId: distribution.resourceId,
            resourceType: resource.type,
            quantity: distribution.quantity,
            origin: resource.currentLocation,
            destination: 'beneficiary',
            donor: null,
            timestamp: new Date(),
            signature: await this.signTransaction(distribution),
            metadata: {
                beneficiaryCount: distribution.beneficiaryCount,
                location: distribution.location,
                verifiedBy: distribution.verifiedBy,
            },
        };

        this.pendingTransactions.push(transaction);

        // Update registry
        resource.quantity -= distribution.quantity;
        resource.history.push(transaction);
        if (resource.quantity <= 0) {
            resource.status = 'depleted';
        }

        await this.mineBlock(); // Immediate mining for distribution events

        this.eventEmitter.emit('blockchain.resource.distributed', transaction);

        return {
            success: true,
            transactionId: transaction.id,
            blockNumber: this.blocks.length,
            timestamp: transaction.timestamp,
        };
    }

    /**
     * Get full history of a resource
     */
    getResourceHistory(resourceId: string): ResourceTransaction[] {
        const resource = this.resourceRegistry.get(resourceId);
        return resource?.history || [];
    }

    /**
     * Verify resource authenticity and chain integrity
     */
    async verifyResource(resourceId: string): Promise<VerificationResult> {
        const resource = this.resourceRegistry.get(resourceId);
        if (!resource) {
            return { verified: false, error: 'Resource not found' };
        }

        // Verify all transactions in history are in valid blocks
        for (const tx of resource.history) {
            const block = this.blocks.find((b) =>
                b.transactions.some((t) => t.id === tx.id),
            );
            if (!block) {
                return { verified: false, error: `Transaction ${tx.id} not found in blockchain` };
            }
        }

        // Verify blockchain integrity
        const chainValid = await this.verifyChainIntegrity();
        if (!chainValid) {
            return { verified: false, error: 'Blockchain integrity compromised' };
        }

        return {
            verified: true,
            resource: {
                id: resourceId,
                type: resource.type,
                origin: resource.origin,
                currentLocation: resource.currentLocation,
                status: resource.status,
                transactionCount: resource.history.length,
            },
        };
    }

    /**
     * Get blockchain statistics
     */
    getStatistics(): BlockchainStats {
        const totalResources = this.resourceRegistry.size;
        const totalTransactions = this.blocks.reduce(
            (sum, block) => sum + block.transactions.length,
            0,
        );

        let totalDistributed = 0;
        this.resourceRegistry.forEach((resource) => {
            const distributedTx = resource.history.filter((tx) => tx.type === 'distribute');
            distributedTx.forEach((tx) => {
                totalDistributed += tx.quantity;
            });
        });

        return {
            blockCount: this.blocks.length,
            transactionCount: totalTransactions,
            pendingTransactions: this.pendingTransactions.length,
            registeredResources: totalResources,
            totalDistributed,
            lastBlockTime: this.blocks[this.blocks.length - 1]?.timestamp,
        };
    }

    // Private methods
    private createGenesisBlock(): void {
        const genesis: Block = {
            index: 0,
            timestamp: new Date(),
            transactions: [],
            previousHash: '0',
            hash: this.calculateHash(0, '0', [], new Date()),
            nonce: 0,
        };
        this.blocks.push(genesis);
    }

    private async mineBlock(): Promise<Block> {
        const previousBlock = this.blocks[this.blocks.length - 1];
        const newIndex = previousBlock.index + 1;
        const transactions = [...this.pendingTransactions];
        const timestamp = new Date();

        // Simple proof of work (find hash with leading zeros)
        let nonce = 0;
        let hash = '';
        const difficulty = 2;

        do {
            nonce++;
            hash = this.calculateHash(newIndex, previousBlock.hash, transactions, timestamp, nonce);
        } while (!hash.startsWith('0'.repeat(difficulty)));

        const block: Block = {
            index: newIndex,
            timestamp,
            transactions,
            previousHash: previousBlock.hash,
            hash,
            nonce,
        };

        this.blocks.push(block);
        this.pendingTransactions = [];

        this.logger.log(`Block ${newIndex} mined with ${transactions.length} transactions`);
        this.eventEmitter.emit('blockchain.block.mined', block);

        return block;
    }

    private calculateHash(
        index: number,
        previousHash: string,
        transactions: ResourceTransaction[],
        timestamp: Date,
        nonce: number = 0,
    ): string {
        const data = `${index}${previousHash}${JSON.stringify(transactions)}${timestamp.toISOString()}${nonce}`;
        // Simple hash simulation (use crypto in production)
        let hash = 0;
        for (let i = 0; i < data.length; i++) {
            const char = data.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(8, '0');
    }

    private async signTransaction(data: any): Promise<string> {
        // Simulated digital signature
        return `sig-${Date.now().toString(36)}`;
    }

    private async verifyChainIntegrity(): Promise<boolean> {
        for (let i = 1; i < this.blocks.length; i++) {
            const current = this.blocks[i];
            const previous = this.blocks[i - 1];

            if (current.previousHash !== previous.hash) {
                return false;
            }
        }
        return true;
    }
}

// Type definitions
interface Block {
    index: number;
    timestamp: Date;
    transactions: ResourceTransaction[];
    previousHash: string;
    hash: string;
    nonce: number;
}

interface ResourceTransaction {
    id: string;
    type: 'register' | 'transfer' | 'distribute';
    resourceId: string;
    resourceType: string;
    quantity: number;
    origin: string;
    destination: string | null;
    donor: string | null;
    timestamp: Date;
    signature: string;
    metadata?: Record<string, any>;
}

interface ResourceRegistration {
    resourceId: string;
    type: string;
    quantity: number;
    origin: string;
    donor: string;
    metadata?: Record<string, any>;
}

interface ResourceTransfer {
    resourceId: string;
    destination: string;
    quantity: number;
    carrier?: string;
    expectedArrival?: Date;
    notes?: string;
}

interface ResourceDistribution {
    resourceId: string;
    quantity: number;
    beneficiaryCount: number;
    location: string;
    verifiedBy: string;
}

interface ResourceRecord {
    resourceId: string;
    type: string;
    quantity: number;
    origin: string;
    currentLocation: string;
    status: 'registered' | 'in-transit' | 'delivered' | 'depleted';
    history: ResourceTransaction[];
}

interface TransactionResult {
    success: boolean;
    transactionId: string;
    blockNumber: number;
    timestamp: Date;
}

interface VerificationResult {
    verified: boolean;
    error?: string;
    resource?: {
        id: string;
        type: string;
        origin: string;
        currentLocation: string;
        status: string;
        transactionCount: number;
    };
}

interface BlockchainStats {
    blockCount: number;
    transactionCount: number;
    pendingTransactions: number;
    registeredResources: number;
    totalDistributed: number;
    lastBlockTime?: Date;
}
