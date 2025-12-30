import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

// 專長分類
export type SkillCategory = 'water' | 'mountain' | 'medical' | 'mechanical' | 'communication' | 'drone' | 'other';

@Entity('skills')
export class Skill {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 專長代碼 (唯一)
    @Column({ type: 'varchar', length: 50, unique: true })
    code: string;

    // 專長名稱
    @Column({ type: 'varchar', length: 100 })
    name: string;

    // 分類
    @Column({ type: 'varchar', length: 50 })
    category: SkillCategory;

    // 說明
    @Column({ type: 'text', nullable: true })
    description?: string;

    // 排序
    @Column({ name: 'sort_order', type: 'int', default: 0 })
    sortOrder: number;

    // 是否啟用
    @Column({ name: 'is_active', type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
