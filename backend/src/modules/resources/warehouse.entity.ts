import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

/**
 * 倉庫/據點
 * 支援單倉模式和多據點模式
 */
@Entity('warehouses')
export class Warehouse {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 倉庫名稱
    @Column({ type: 'varchar', length: 100 })
    name: string;

    // 倉庫代碼 (簡短識別碼)
    @Column({ type: 'varchar', length: 20, unique: true })
    code: string;

    // 地址
    @Column({ type: 'varchar', length: 300, nullable: true })
    address?: string;

    // 聯絡人
    @Column({ type: 'varchar', length: 50, nullable: true })
    contactPerson?: string;

    // 聯絡電話
    @Column({ type: 'varchar', length: 30, nullable: true })
    contactPhone?: string;

    // 是否為主倉庫 (單倉模式時使用)
    @Column({ type: 'boolean', default: false })
    isPrimary: boolean;

    // 是否啟用
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 經緯度 (可選)
    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude?: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude?: number;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
