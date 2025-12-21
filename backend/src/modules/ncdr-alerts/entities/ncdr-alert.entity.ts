import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

@Entity('ncdr_alerts')
@Index(['alertId'], { unique: true })
@Index(['alertTypeId'])
@Index(['isActive'])
export class NcdrAlert {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    alertId: string; // NCDR 原始 ID，用於去重

    @Column({ type: 'int' })
    alertTypeId: number; // 示警類別 ID

    @Column({ type: 'varchar', length: 100 })
    alertTypeName: string; // 示警類別名稱

    @Column({ type: 'varchar', length: 500 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'varchar', length: 50, default: 'warning' })
    severity: 'critical' | 'warning' | 'info'; // 嚴重程度

    @Column({ type: 'varchar', length: 100, nullable: true })
    sourceUnit: string; // 來源單位

    @Column({ type: 'timestamp' })
    publishedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    expiresAt: Date;

    @Column({ type: 'varchar', length: 1000, nullable: true })
    sourceLink: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude: number;

    @Column({ type: 'text', nullable: true })
    affectedAreas: string; // JSON 字串存儲影響區域

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
