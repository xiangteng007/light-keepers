import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Resource } from './resources.entity';

export type LotStatus = 'active' | 'depleted' | 'expired';

/**
 * 批次管理實體（僅適用 controlled/medical 物資）
 * 用於追蹤批號、效期、QR Code
 */
@Entity('lots')
export class Lot {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 關聯品項
    @Column({ type: 'uuid' })
    itemId: string;

    @ManyToOne(() => Resource)
    @JoinColumn({ name: 'itemId' })
    item: Resource;

    // 批號（廠商批號或系統產生）
    @Column({ type: 'varchar', length: 100 })
    lotNumber: string;

    // 🔐 QR Code 內容（ORG|LOT|{lotId}|{checksum}）
    @Column({ type: 'varchar', length: 200 })
    qrValue: string;

    // 效期
    @Column({ type: 'date', nullable: true })
    expiryDate?: Date;

    // 此批次數量
    @Column({ type: 'int', default: 0 })
    quantity: number;

    // 倉庫 ID
    @Column({ type: 'uuid' })
    warehouseId: string;

    // 儲位 ID
    @Column({ type: 'uuid', nullable: true })
    locationId?: string;

    // 狀態
    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: LotStatus;

    // 🏷️ 已列印貼紙數
    @Column({ type: 'int', default: 0 })
    labelsPrinted: number;

    // 🏷️ 最後列印批次 ID
    @Column({ type: 'uuid', nullable: true })
    lastPrintBatchId?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
