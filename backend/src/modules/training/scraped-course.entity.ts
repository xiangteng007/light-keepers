import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ScrapingSource } from './scraping-source.entity';

/**
 * 課程分類
 */
export type ScrapedCourseCategory =
    | 'emt'           // EMT 緊急醫療救護
    | 'tecc'          // TECC 戰術緊急傷患照護
    | 'tccc'          // TCCC 戰術戰傷救護
    | 'drone'         // 無人機證照
    | 'rescue'        // 搜救技能
    | 'first_aid'     // 急救訓練
    | 'disaster'      // 防災教育
    | 'other';        // 其他

/**
 * 已爬取的課程資料
 * 從外部網站爬取的課程資訊 (保留 24 小時)
 */
@Entity('scraped_courses')
export class ScrapedCourse {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 關聯到爬蟲來源
    @ManyToOne(() => ScrapingSource, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'source_id' })
    source: ScrapingSource;

    @Column({ type: 'uuid' })
    sourceId: string;

    // 課程標題
    @Column({ type: 'varchar', length: 300 })
    title: string;

    // 開課日期
    @Column({ type: 'varchar', length: 100, nullable: true })
    courseDate?: string;

    // 上課地點
    @Column({ type: 'varchar', length: 200, nullable: true })
    location?: string;

    // 課程描述
    @Column({ type: 'text', nullable: true })
    description?: string;

    // 原始連結
    @Column({ type: 'varchar', length: 500 })
    originalUrl: string;

    // 封面圖片
    @Column({ type: 'varchar', length: 500, nullable: true })
    imageUrl?: string;

    // 主辦單位
    @Column({ type: 'varchar', length: 100, nullable: true })
    organizer?: string;

    // 課程分類
    @Column({ type: 'varchar', length: 20, default: 'other' })
    category: ScrapedCourseCategory;

    // 課程費用
    @Column({ type: 'varchar', length: 50, nullable: true })
    fee?: string;

    // 報名狀態
    @Column({ type: 'varchar', length: 50, nullable: true })
    registrationStatus?: string;

    // 唯一識別碼 (避免重複爬取)
    @Column({ type: 'varchar', length: 100, unique: true })
    externalId: string;

    // 爬取時間
    @CreateDateColumn()
    scrapedAt: Date;

    // 是否已轉為內部課程
    @Column({ type: 'boolean', default: false })
    isImported: boolean;
}
