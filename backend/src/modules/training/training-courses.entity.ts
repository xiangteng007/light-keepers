import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type CourseCategory = 'disaster_basics' | 'first_aid' | 'rescue' | 'logistics' | 'communication' | 'leadership';
export type CourseLevel = 'beginner' | 'intermediate' | 'advanced';

@Entity('training_courses')
export class TrainingCourse {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 課程標題
    @Column({ type: 'varchar', length: 200 })
    title: string;

    // 課程描述
    @Column({ type: 'text' })
    description: string;

    // 分類
    @Column({ type: 'varchar', length: 50 })
    category: CourseCategory;

    // 難度
    @Column({ type: 'varchar', length: 20, default: 'beginner' })
    level: CourseLevel;

    // 預估時長 (分鐘)
    @Column({ type: 'int' })
    durationMinutes: number;

    // 課程內容 (Markdown 或簡易 HTML)
    @Column({ type: 'text' })
    content: string;

    // 封面圖片 URL
    @Column({ type: 'varchar', length: 500, nullable: true })
    coverImage?: string;

    // 是否必修
    @Column({ type: 'boolean', default: false })
    isRequired: boolean;

    // 是否啟用
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    // 排序順序
    @Column({ type: 'int', default: 0 })
    sortOrder: number;

    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
