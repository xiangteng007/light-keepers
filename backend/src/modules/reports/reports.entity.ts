import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, DeleteDateColumn } from 'typeorm';

/**
 * 災害類型。
 *
 * 前 8 個是既有（天災導向）類別，順序與值不得更動；後 4 個是 D16 民防韌性
 * （CD-1）新增。DB 欄位是 varchar(50)，**不是** PostgreSQL enum，因此加值不需
 * 要任何 DDL。中繼資料（標籤／預設 severity／派遣技能／應變提示）集中在
 * `./disaster-types.ts`，設計論證見 docs/architecture/CIVIL_DEFENSE_TAXONOMY.md。
 */
export type ReportType =
    | 'earthquake' | 'flood' | 'fire' | 'typhoon' | 'landslide' | 'traffic' | 'infrastructure' | 'other'
    // D16 民防（CD-1）
    | 'air_raid' | 'explosion' | 'terror_attack' | 'cbrn';
export type ReportStatus = 'pending' | 'confirmed' | 'rejected';
export type ReportSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ReportSource = 'web' | 'line';

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

    /**
     * 大量傷患（MCI）旗標——跨災型標記，與 `type` 正交。
     *
     * 刻意不做成 ReportType 的一個值：MCI 可以發生在任何災型上（地震、空襲、
     * 遊覽車事故…），做成互斥類別會在 MCI 事件發生時丟失災型訊號，並讓既有
     * 以 type 為條件的報表漏算。取捨論證見 CIVIL_DEFENSE_TAXONOMY.md §2.2。
     */
    @Column({ type: 'boolean', default: false })
    isMassCasualty: boolean;

    /** 概估傷患人數（可選，通報者常只能給大概數字） */
    @Column({ type: 'int', nullable: true })
    casualtyEstimate?: number;

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

    // 回報來源
    @Column({ type: 'varchar', length: 20, default: 'web' })
    source: ReportSource;

    // LINE 使用者資訊（若來自 LINE Bot）
    @Column({ type: 'varchar', length: 50, nullable: true })
    reporterLineUserId?: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    reporterLineDisplayName?: string;


    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // Soft-delete support (SEC-SD.1)
    @DeleteDateColumn({ name: 'deleted_at', type: 'timestamptz', nullable: true })
    deletedAt?: Date;
}
