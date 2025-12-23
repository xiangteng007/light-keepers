import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { EncryptedColumnTransformer } from '../../common/crypto.util';

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

    // 🔐 加密儲存
    @Column({
        type: 'varchar',
        length: 500,  // 加密後長度增加
        transformer: EncryptedColumnTransformer
    })
    phone: string;

    // 所在區域
    @Column({ type: 'varchar', length: 100 })
    region: string;

    // 🔐 詳細地址 - 加密儲存
    @Column({
        type: 'varchar',
        length: 1000, // 加密後長度增加
        nullable: true,
        transformer: EncryptedColumnTransformer
    })
    address?: string;

    // 技能標籤 (JSON array)
    @Column({ type: 'simple-array' })
    skills: string[];

    // 可用狀態
    @Column({ type: 'varchar', length: 20, default: 'available' })
    status: VolunteerStatus;

    // 🔐 緊急聯絡人 - 加密儲存
    @Column({
        type: 'varchar',
        length: 500,
        nullable: true,
        transformer: EncryptedColumnTransformer
    })
    emergencyContact?: string;

    // 🔐 緊急聯絡電話 - 加密儲存
    @Column({
        type: 'varchar',
        length: 500,
        nullable: true,
        transformer: EncryptedColumnTransformer
    })
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

    // LINE User ID (綁定後儲存)
    @Column({ type: 'varchar', length: 100, nullable: true })
    lineUserId?: string;

    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
