import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 頁面權限配置
 * 用於設定每個頁面所需的最低角色等級
 */
@Entity('page_permissions')
export class PagePermission {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'page_key', unique: true, length: 100 })
    pageKey: string;

    @Column({ name: 'page_name', length: 100 })
    pageName: string;

    @Column({ name: 'page_path', length: 255 })
    pagePath: string;

    @Column({ name: 'required_level', type: 'int', default: 1 })
    requiredLevel: number;

    @Column({ name: 'icon', length: 50, nullable: true })
    icon: string;

    @Column({ name: 'sort_order', type: 'int', default: 0 })
    sortOrder: number;

    @Column({ name: 'is_visible', type: 'boolean', default: true })
    isVisible: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
