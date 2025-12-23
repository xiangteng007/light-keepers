import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type ReportType = 'earthquake' | 'flood' | 'fire' | 'typhoon' | 'landslide' | 'traffic' | 'infrastructure' | 'other';
export type ReportStatus = 'pending' | 'confirmed' | 'rejected';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';

@Entity('reports')
export class Report {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 災害類型
    @Column({ type: 'varchar', length: 50 })
    type: ReportType;

    // 嚴重程度
    @Column({ type: 'varchar', length: 20, default: 'medium' })
    severity: ReportSeverity;

    // 標題
    @Column({ type: 'varchar', length: 200 })
    title: string;

    // 詳細描述
    @Column({ type: 'text' })
    description: string;

    // GPS 座標
    @Column({ type: 'decimal', precision: 10, scale: 7 })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7 })
    longitude: number;

    // 地址 (可選)
    @Column({ type: 'varchar', length: 500, nullable: true })
    address: string;

    // 照片 URLs (JSON array)
    @Column({ type: 'simple-array', nullable: true })
    photos: string[];

    // 回報者聯絡資訊 (可選)
    @Column({ type: 'varchar', length: 200, nullable: true })
    contactName: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    contactPhone: string;

    // 審核狀態
    @Column({ type: 'varchar', length: 20, default: 'pending' })
    status: ReportStatus;

    // 審核資訊
    @Column({ type: 'varchar', length: 100, nullable: true })
    reviewedBy: string;

    @Column({ type: 'timestamp', nullable: true })
    reviewedAt: Date;

    @Column({ type: 'text', nullable: true })
    reviewNote?: string;

    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
