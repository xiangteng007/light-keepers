import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

export type VolunteerStatus = 'available' | 'busy' | 'offline';

@Entity('volunteers')
export class Volunteer {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 基本資料
    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    email?: string;

    @Column({ type: 'varchar', length: 50 })
    phone: string;

    // 所在區域
    @Column({ type: 'varchar', length: 100 })
    region: string;

    // 詳細地址 (可選)
    @Column({ type: 'varchar', length: 300, nullable: true })
    address?: string;

    // 技能標籤 (JSON array)
    @Column({ type: 'simple-array' })
    skills: string[];

    // 可用狀態
    @Column({ type: 'varchar', length: 20, default: 'available' })
    status: VolunteerStatus;

    // 緊急聯絡人
    @Column({ type: 'varchar', length: 100, nullable: true })
    emergencyContact?: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    emergencyPhone?: string;

    // 備註
    @Column({ type: 'text', nullable: true })
    notes?: string;

    // 累計服務時數
    @Column({ type: 'int', default: 0 })
    serviceHours: number;

    // 累計任務數
    @Column({ type: 'int', default: 0 })
    taskCount: number;

    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
