import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ResourceCategory = 'food' | 'water' | 'medical' | 'shelter' | 'clothing' | 'equipment' | 'other';
export type ResourceStatus = 'available' | 'low' | 'depleted' | 'reserved';

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

    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
