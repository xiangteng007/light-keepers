/**
 * 物資責信區塊實體 (Supply Chain Block Entity)
 * 模組 D: 責信區塊鏈
 */

import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, Index } from 'typeorm';

export enum SupplyChainAction {
    DONATION_IN = 'DONATION_IN',       // 捐贈入庫
    PURCHASE_IN = 'PURCHASE_IN',       // 採購入庫
    WAREHOUSE_OUT = 'WAREHOUSE_OUT',   // 倉庫出庫
    DISTRIBUTION = 'DISTRIBUTION',     // 發放給災民
    TRANSFER = 'TRANSFER',             // 據點間調撥
    EXPIRED = 'EXPIRED',               // 過期報廢
    DAMAGED = 'DAMAGED',               // 損壞報廢
}

export interface BlockMetadata {
    quantity?: number;
    unit?: string;
    sourceLocation?: string;
    targetLocation?: string;
    recipientCount?: number;
    photoUrls?: string[];
    notes?: string;
    receiptNumber?: string;
    gpsCoordinates?: { lat: number; lng: number };
    // 允許離線同步時的擴充欄位
    [key: string]: any;
}

@Entity('supply_chain_blocks')
export class SupplyChainBlock {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    resourceId: string;

    @Column({ nullable: true })
    resourceName: string;

    @Column({
        type: 'enum',
        enum: SupplyChainAction,
    })
    action: SupplyChainAction;

    @Column()
    actorId: string;

    @Column({ nullable: true })
    actorName: string;

    @Column({ type: 'json', nullable: true })
    metadata: BlockMetadata;

    @CreateDateColumn()
    timestamp: Date;

    // 區塊鏈核心欄位
    @Column()
    prevHash: string;

    @Column({ unique: true })
    @Index()
    currHash: string;

    @Column({ nullable: true })
    signature: string; // 數位簽章

    @Column({ type: 'int' })
    @Index()
    blockNumber: number;

    // 驗證狀態
    @Column({ default: true })
    isValid: boolean;
}

// 公開查詢記錄
@Entity('public_audit_logs')
export class PublicAuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    receiptNumber: string;

    @Column({ nullable: true })
    queryIp: string;

    @Column({ nullable: true })
    userAgent: string;

    @CreateDateColumn()
    queriedAt: Date;
}
