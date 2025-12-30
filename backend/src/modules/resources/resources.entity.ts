import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ResourceCategory = 'food' | 'water' | 'medical' | 'shelter' | 'clothing' | 'equipment' | 'other';
export type ResourceStatus = 'available' | 'low' | 'depleted' | 'reserved';

// 管控等級：決定是否可產生 QR Code/貼紙
export type ControlLevel = 'civil' | 'controlled' | 'medical';
// civil: 民生物品（禁止產生系統 QR/貼紙）
// controlled: 管控物資（需產碼、需覆核）
// medical: 藥品（需產碼、需覆核、需批次管理）

@Entity('resources')
export class Resource {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 物資名稱
    @Column({ type: 'varchar', length: 200 })
    name: string;

    // 分類
    @Column({ type: 'varchar', length: 30 })
    category: ResourceCategory;

    // 🔐 管控等級（決定 QR/貼紙產生權限）
    @Column({ type: 'varchar', length: 20, default: 'civil' })
    controlLevel: ControlLevel;

    // 描述
    @Column({ type: 'text', nullable: true })
    description?: string;

    // 數量
    @Column({ type: 'int', default: 0 })
    quantity: number;

    // 單位
    @Column({ type: 'varchar', length: 20, default: '個' })
    unit: string;

    // 最低庫存警戒
    @Column({ type: 'int', default: 10 })
    minQuantity: number;

    // 狀態
    @Column({ type: 'varchar', length: 20, default: 'available' })
    status: ResourceStatus;

    // 存放位置
    @Column({ type: 'varchar', length: 200, nullable: true })
    location?: string;

    // 📷 物資照片
    @Column({ type: 'varchar', length: 500, nullable: true })
    photoUrl?: string;

    // 📱 條碼/QR Code
    @Column({ type: 'varchar', length: 100, nullable: true })
    barcode?: string;

    // 過期日期
    @Column({ type: 'date', nullable: true })
    expiresAt?: Date;

    // 是否資產化 (高單價需單件追蹤)
    @Column({ type: 'boolean', default: false })
    isAssetized: boolean;

    // 關聯儲位 (可選)
    @Column({ type: 'uuid', nullable: true })
    storageLocationId?: string;

    // 🔐 敏感資料（未來將遷移至獨立表/路徑）
    // 單價（敏感）
    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    unitPrice?: number;

    // 捐贈者資訊（敏感）
    @Column({ type: 'varchar', length: 500, nullable: true })
    donorInfo?: string;

    // 內部備註（敏感）
    @Column({ type: 'text', nullable: true })
    internalNotes?: string;

    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
