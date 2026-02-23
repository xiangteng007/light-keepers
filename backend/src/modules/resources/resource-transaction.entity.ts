import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Resource } from './resources.entity';

/**
 * 異動類型
 */
export type TransactionType =
    | 'in'        // 入庫
    | 'out'       // 出庫
    | 'transfer'  // 調撥
    | 'adjust'    // 盤點調整
    | 'donate'    // 捐贈入庫
    | 'expired';  // 過期報廢

/**
 * 物資異動紀錄
 * 追蹤所有入庫、出庫、調撥等操作
 */
@Entity('resource_transactions')
export class ResourceTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 關聯物資
    @ManyToOne(() => Resource, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'resource_id' })
    resource: Resource;

    @Column({ type: 'uuid' })
    resourceId: string;

    // 異動類型
    @Column({ type: 'varchar', length: 20 })
    type: TransactionType;

    // 數量 (正數為入庫，負數為出庫)
    @Column({ type: 'int' })
    quantity: number;

    // 異動前數量
    @Column({ type: 'int' })
    beforeQuantity: number;

    // 異動後數量
    @Column({ type: 'int' })
    afterQuantity: number;

    // 操作人員
    @Column({ type: 'varchar', length: 100 })
    operatorName: string;

    // 操作人員 ID
    @Column({ type: 'uuid', nullable: true })
    operatorId?: string;

    // 來源/目的地 (調撥用)
    @Column({ type: 'varchar', length: 200, nullable: true })
    fromLocation?: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    toLocation?: string;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 參考單號 (如捐贈單號、調撥單號)
    @Column({ type: 'varchar', length: 50, nullable: true })
    referenceNo?: string;

    // 📋 A4: 任務/事件串接
    @Column({ type: 'uuid', nullable: true })
    taskId?: string;

    @Column({ type: 'uuid', nullable: true })
    eventId?: string;

    // 🔐 Phase 4: 覆核機制（controlled/medical 出庫）
    // 覆核狀態
    @Column({ type: 'varchar', length: 20, nullable: true })
    approvalStatus?: 'pending' | 'approved' | 'rejected';

    // 覆核人 ID
    @Column({ type: 'uuid', nullable: true })
    approvedBy?: string;

    // 覆核人姓名
    @Column({ type: 'varchar', length: 100, nullable: true })
    approvedByName?: string;

    // 覆核/拒絕時間
    @Column({ type: 'timestamp', nullable: true })
    approvedAt?: Date;

    // 拒絕原因
    @Column({ type: 'varchar', length: 500, nullable: true })
    rejectReason?: string;

    // 🔐 領用人資訊（敏感，未來將遷移至獨立表）
    // 領用人姓名（controlled/medical 必填）
    @Column({ type: 'varchar', length: 100, nullable: true })
    recipientName?: string;

    // 領用人電話
    @Column({ type: 'varchar', length: 20, nullable: true })
    recipientPhone?: string;

    // 領用人證件號
    @Column({ type: 'varchar', length: 50, nullable: true })
    recipientIdNo?: string;

    // 領用人單位
    @Column({ type: 'varchar', length: 200, nullable: true })
    recipientOrg?: string;

    // 用途說明（controlled/medical 必填）
    @Column({ type: 'varchar', length: 500, nullable: true })
    purpose?: string;

    // 異動時間
    @CreateDateColumn()
    createdAt: Date;
}
