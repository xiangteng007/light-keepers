import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from '../volunteers.entity';

// 積分紀錄類型
export type PointsRecordType = 'task' | 'training' | 'special' | 'adjustment';

@Entity('points_records')
export class PointsRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 志工
    @Column({ name: 'volunteer_id', type: 'uuid' })
    volunteerId: string;

    @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'volunteer_id' })
    volunteer: Volunteer;

    // 關聯任務 (可選)
    @Column({ name: 'task_id', type: 'uuid', nullable: true })
    taskId?: string;

    // 紀錄類型
    @Column({ name: 'record_type', type: 'varchar', length: 30 })
    recordType: PointsRecordType;

    // 時數
    @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
    hours: number;

    // 積分
    @Column({ type: 'int', default: 0 })
    points: number;

    // 倍率 (夜間/高風險等)
    @Column({ type: 'decimal', precision: 5, scale: 2, default: 1.0 })
    multiplier: number;

    // 說明
    @Column({ type: 'text', nullable: true })
    description?: string;

    // 紀錄者
    @Column({ name: 'recorded_by', type: 'uuid', nullable: true })
    recordedBy?: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;
}
