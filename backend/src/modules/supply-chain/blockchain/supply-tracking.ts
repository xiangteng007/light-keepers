/**
 * Blockchain Supply Chain Tracking
 * 
 * Interfaces and types for blockchain-based supply tracking.
 * Uses smart contract interactions for immutable audit trail.
 */

/**
 * Supply item on blockchain
 */
export interface BlockchainSupplyItem {
    itemId: string;
    name: string;
    category: 'medical' | 'food' | 'water' | 'shelter' | 'equipment' | 'other';
    quantity: number;
    unit: string;
    origin: {
        organization: string;
        location: string;
        timestamp: Date;
    };
    currentLocation: string;
    status: 'in_transit' | 'delivered' | 'distributed' | 'consumed';
    transactionHistory: BlockchainTransaction[];
    metadata?: Record<string, any>;
}

/**
 * Blockchain transaction record
 */
export interface BlockchainTransaction {
    txHash: string;
    blockNumber: number;
    timestamp: Date;
    action: 'create' | 'transfer' | 'receive' | 'distribute' | 'update';
    fromAddress: string;
    toAddress?: string;
    data: {
        itemId: string;
        quantity: number;
        location: string;
        notes?: string;
    };
    signature: string;
}

/**
 * Smart contract interface
 */
export interface SupplyChainContract {
    address: string;
    network: 'ethereum' | 'polygon' | 'arbitrum' | 'private';
    abi: any[];
}

/**
 * Tracking event types
 */
export enum TrackingEventType {
    RECEIVED_FROM_DONOR = 'RECEIVED_FROM_DONOR',
    STORED_IN_WAREHOUSE = 'STORED_IN_WAREHOUSE',
    LOADED_FOR_TRANSPORT = 'LOADED_FOR_TRANSPORT',
    IN_TRANSIT = 'IN_TRANSIT',
    ARRIVED_AT_DESTINATION = 'ARRIVED_AT_DESTINATION',
    DISTRIBUTED_TO_RECIPIENT = 'DISTRIBUTED_TO_RECIPIENT',
    CONSUMED = 'CONSUMED',
    EXPIRED = 'EXPIRED',
    DAMAGED = 'DAMAGED',
}

/**
 * Tracking event
 */
export interface TrackingEvent {
    id: string;
    itemId: string;
    eventType: TrackingEventType;
    timestamp: Date;
    location: {
        lat: number;
        lng: number;
        address: string;
    };
    actor: {
        id: string;
        name: string;
        role: string;
    };
    notes?: string;
    attachments?: string[];
    verified: boolean;
    txHash?: string;
}

/**
 * Supply chain service interface
 */
export interface IBlockchainSupplyService {
    // Item management
    registerItem(item: Omit<BlockchainSupplyItem, 'itemId' | 'transactionHistory'>): Promise<BlockchainSupplyItem>;
    getItem(itemId: string): Promise<BlockchainSupplyItem | null>;
    
    // Tracking
    recordEvent(event: Omit<TrackingEvent, 'id' | 'txHash'>): Promise<TrackingEvent>;
    getItemHistory(itemId: string): Promise<TrackingEvent[]>;
    
    // Transfer
    transferItem(itemId: string, toAddress: string, quantity: number): Promise<BlockchainTransaction>;
    
    // Verification
    verifyItem(itemId: string): Promise<boolean>;
    verifyTransaction(txHash: string): Promise<boolean>;
}

/**
 * Mock implementation for development
 */
export class MockBlockchainSupplyService implements IBlockchainSupplyService {
    private items: Map<string, BlockchainSupplyItem> = new Map();
    private events: Map<string, TrackingEvent[]> = new Map();

    async registerItem(item: Omit<BlockchainSupplyItem, 'itemId' | 'transactionHistory'>): Promise<BlockchainSupplyItem> {
        const itemId = `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newItem: BlockchainSupplyItem = {
            ...item,
            itemId,
            transactionHistory: [{
                txHash: this.generateTxHash(),
                blockNumber: Math.floor(Math.random() * 1000000),
                timestamp: new Date(),
                action: 'create',
                fromAddress: '0x0000000000000000000000000000000000000000',
                data: {
                    itemId,
                    quantity: item.quantity,
                    location: item.currentLocation,
                },
                signature: this.generateSignature(),
            }],
        };
        this.items.set(itemId, newItem);
        this.events.set(itemId, []);
        return newItem;
    }

    async getItem(itemId: string): Promise<BlockchainSupplyItem | null> {
        return this.items.get(itemId) || null;
    }

    async recordEvent(event: Omit<TrackingEvent, 'id' | 'txHash'>): Promise<TrackingEvent> {
        const fullEvent: TrackingEvent = {
            ...event,
            id: `event-${Date.now()}`,
            txHash: this.generateTxHash(),
            verified: true,
        };
        
        const events = this.events.get(event.itemId) || [];
        events.push(fullEvent);
        this.events.set(event.itemId, events);
        
        return fullEvent;
    }

    async getItemHistory(itemId: string): Promise<TrackingEvent[]> {
        return this.events.get(itemId) || [];
    }

    async transferItem(itemId: string, toAddress: string, quantity: number): Promise<BlockchainTransaction> {
        const item = this.items.get(itemId);
        if (!item) throw new Error('Item not found');
        
        const tx: BlockchainTransaction = {
            txHash: this.generateTxHash(),
            blockNumber: Math.floor(Math.random() * 1000000),
            timestamp: new Date(),
            action: 'transfer',
            fromAddress: '0x1234...5678',
            toAddress,
            data: {
                itemId,
                quantity,
                location: item.currentLocation,
            },
            signature: this.generateSignature(),
        };
        
        item.transactionHistory.push(tx);
        return tx;
    }

    async verifyItem(itemId: string): Promise<boolean> {
        return this.items.has(itemId);
    }

    async verifyTransaction(txHash: string): Promise<boolean> {
        return txHash.startsWith('0x');
    }

    private generateTxHash(): string {
        return '0x' + Array.from({ length: 64 }, () => 
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    }

    private generateSignature(): string {
        return '0x' + Array.from({ length: 130 }, () => 
            Math.floor(Math.random() * 16).toString(16)
        ).join('');
    }
}

// Export singleton mock service for development
export const blockchainSupplyService = new MockBlockchainSupplyService();
