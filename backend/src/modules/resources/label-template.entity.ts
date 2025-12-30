import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 貼紙模板實體
 * 定義貼紙的版面配置、適用類型
 */
@Entity('label_templates')
export class LabelTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 模板名稱
    @Column({ type: 'varchar', length: 200 })
    name: string;

    // 模板說明
    @Column({ type: 'varchar', length: 500, nullable: true })
    description?: string;

    // 適用類型（JSON 陣列，例：["lot"] 或 ["asset"]）
    @Column({ type: 'json' })
    targetTypes: string[];

    // 適用管控等級（JSON 陣列，例：["controlled", "medical"]）
    @Column({ type: 'json' })
    controlLevels: string[];

    // 寬度（mm）
    @Column({ type: 'int' })
    width: number;

    // 高度（mm）
    @Column({ type: 'int' })
    height: number;

    // 版面配置（JSON，含標題/品名/QR 位置/字體大小等）
    @Column({ type: 'json' })
    layoutConfig: Record<string, any>;

    // 是否啟用
    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    // 建立者（幹部 UID）
    @Column({ type: 'uuid' })
    createdBy: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
