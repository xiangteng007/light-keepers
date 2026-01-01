import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Volunteer } from './volunteers.entity';

export type AssignmentStatus = 'assigned' | 'accepted' | 'declined' | 'in_progress' | 'completed' | 'cancelled';

@Entity('volunteer_assignments')
export class VolunteerAssignment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    // 志工關聯
    @Column({ type: 'uuid' })
    volunteerId: string;

    @ManyToOne(() => Volunteer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'volunteerId' })
    volunteer: Volunteer;

    // 任務資訊
    @Column({ type: 'varchar', length: 200 })
    taskTitle: string;

    @Column({ type: 'text', nullable: true })
    taskDescription?: string;

    // 任務地點
    @Column({ type: 'varchar', length: 300, nullable: true })
    location?: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude?: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude?: number;

    // 預定時間
    @Column({ type: 'timestamp' })
    scheduledStart: Date;

    @Column({ type: 'timestamp', nullable: true })
    scheduledEnd?: Date;

    // 指派狀態
    @Column({ type: 'varchar', length: 20, default: 'assigned' })
    status: AssignmentStatus;

    // 志工回應
    @Column({ type: 'timestamp', nullable: true })
    respondedAt?: Date;

    @Column({ type: 'text', nullable: true })
    declineReason?: string;

    // 簽到簽退
    @Column({ type: 'timestamp', nullable: true })
    checkInAt?: Date;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    checkInLatitude?: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    checkInLongitude?: number;

    @Column({ type: 'timestamp', nullable: true })
    checkOutAt?: Date;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    checkOutLatitude?: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    checkOutLongitude?: number;

    // 實際服務時數 (分鐘)
    @Column({ type: 'int', default: 0 })
    minutesLogged: number;

    // 完成備註
    @Column({ type: 'text', nullable: true })
    completionNotes?: string;

    // 指派者
    @Column({ type: 'varchar', length: 100, nullable: true })
    assignedBy?: string;

    // 時間戳記
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    // ===== 即時位置追蹤（任務期間）=====

    // 最後回報位置
    @Column({ name: 'last_location_lat', type: 'decimal', precision: 10, scale: 7, nullable: true })
    lastLocationLat?: number;

    @Column({ name: 'last_location_lng', type: 'decimal', precision: 10, scale: 7, nullable: true })
    lastLocationLng?: number;

    // 最後回報時間
    @Column({ name: 'last_location_at', type: 'timestamp', nullable: true })
    lastLocationAt?: Date;
}

