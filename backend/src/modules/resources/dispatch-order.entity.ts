import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Warehouse } from './warehouse.entity';

export type DispatchStatus = 'pending' | 'approved' | 'rejected' | 'picking' | 'delivering' | 'completed' | 'cancelled';
export type DispatchPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * 調度單
 */
@Entity('dispatch_orders')
export class DispatchOrder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 單號 (自動產生)
    @Column({ type: 'varchar', length: 30, unique: true })
    orderNo: string;

    // 狀態
    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: DispatchStatus;

    // 優先序
    @Column({ type: 'varchar', length: 20, default: 'normal' })
    priority: DispatchPriority;

    // 來源倉庫
    @ManyToOne(() => Warehouse, { nullable: true })
    @JoinColumn({ name: 'source_warehouse_id' })
    sourceWarehouse?: Warehouse;

    @Column({ type: 'uuid', nullable: true })
    sourceWarehouseId?: string;

    // 目的地
    @Column({ type: 'varchar', length: 300 })
    destination: string;

    // 聯絡人 (敏感)
    @Column({ type: 'varchar', length: 100, nullable: true })
    contactName?: string;

    // 聯絡電話 (敏感)
    @Column({ type: 'varchar', length: 30, nullable: true })
    contactPhone?: string;

    // 需求品項 JSON [{itemId, itemName, quantity, pickedQuantity}]
    @Column({ type: 'text' })
    items: string;

    // 需求人
    @Column({ type: 'varchar', length: 100 })
    requesterName: string;

    @Column({ type: 'uuid', nullable: true })
    requesterId?: string;

    // 審核人
    @Column({ type: 'varchar', length: 100, nullable: true })
    approverName?: string;

    @Column({ type: 'uuid', nullable: true })
    approverId?: string;

    // 配貨人
    @Column({ type: 'varchar', length: 100, nullable: true })
    pickerName?: string;

    @Column({ type: 'uuid', nullable: true })
    pickerId?: string;

    // 審核時間
    @Column({ type: 'timestamp', nullable: true })
    approvedAt?: Date;

    // 配貨完成時間
    @Column({ type: 'timestamp', nullable: true })
    pickedAt?: Date;

    // 送達時間
    @Column({ type: 'timestamp', nullable: true })
    deliveredAt?: Date;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 駁回原因
    @Column({ type: 'text', nullable: true })
    rejectReason?: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
