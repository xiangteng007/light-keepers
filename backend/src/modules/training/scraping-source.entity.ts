import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 課程爬蟲來源
 * 儲存要爬取的網站設定
 */
@Entity('scraping_sources')
export class ScrapingSource {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 來源名稱
    @Column({ type: 'varchar', length: 100 })
    name: string;

    // 網站 URL
    @Column({ type: 'varchar', length: 500 })
    url: string;

    // 網站描述
    @Column({ type: 'text', nullable: true })
    description?: string;

    // 爬蟲選擇器設定 (JSON)
    @Column({ type: 'jsonb', nullable: true })
    selectors?: {
        courseList?: string;      // 課程列表選擇器
        courseTitle?: string;     // 課程標題選擇器
        courseDate?: string;      // 開課日期選擇器
        courseLocation?: string;  // 上課地點選擇器
        courseLink?: string;      // 課程連結選擇器
        courseImage?: string;     // 課程圖片選擇器
    };

    // 是否啟用
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    // 爬蟲頻率 (cron expression)
    @Column({ type: 'varchar', length: 50, default: '0 6 * * *' })
    cronSchedule: string; // 預設每天早上 6 點

    // 上次爬取時間
    @Column({ type: 'timestamp', nullable: true })
    lastScrapedAt?: Date;

    // 上次爬取結果
    @Column({ type: 'varchar', length: 20, nullable: true })
    lastScrapedStatus?: 'success' | 'failed' | 'partial';

    // 上次爬取課程數
    @Column({ type: 'int', default: 0 })
    lastScrapedCount: number;

    // 錯誤訊息
    @Column({ type: 'text', nullable: true })
    lastError?: string;

    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
