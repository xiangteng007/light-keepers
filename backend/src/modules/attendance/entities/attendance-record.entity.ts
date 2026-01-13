/**
 * Attendance Record Entity
 * 出勤記錄資料庫實體
 */

import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    ManyToOne,
    JoinColumn,
} from 'typeorm';

export type CheckInMethod = 'gps' | 'qr';

export interface GpsLocation {
    lat: number;
    lng: number;
    accuracy?: number;
}

export interface QrLocation {
    locationId: string;
    locationName: string;
}

@Entity('attendance_records')
@Index(['volunteerId', 'checkInTime'])
@Index(['taskId'])
@Index(['missionSessionId'])
export class AttendanceRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'volunteer_id', type: 'uuid' })
    volunteerId: string;

    @Column({ name: 'volunteer_name', type: 'varchar', nullable: true })
    volunteerName: string;

    /**
     * 關聯任務 (可選)
     */
    @Column({ name: 'task_id', type: 'uuid', nullable: true })
    taskId: string;

    /**
     * 關聯任務場次 (可選)
     */
    @Column({ name: 'mission_session_id', type: 'uuid', nullable: true })
    missionSessionId: string;

    /**
     * 打卡方式
     */
    @Column({
        type: 'varchar',
        length: 10,
    })
    method: CheckInMethod;

    /**
     * 簽到時間
     */
    @Column({ name: 'check_in_time', type: 'timestamptz' })
    checkInTime: Date;

    /**
     * 簽退時間
     */
    @Column({ name: 'check_out_time', type: 'timestamptz', nullable: true })
    checkOutTime: Date;

    /**
     * 簽到位置
     */
    @Column({ name: 'check_in_location', type: 'jsonb', nullable: true })
    checkInLocation: GpsLocation | QrLocation;

    /**
     * 簽退位置
     */
    @Column({ name: 'check_out_location', type: 'jsonb', nullable: true })
    checkOutLocation: GpsLocation;

    /**
     * 工作時數 (小時)
     */
    @Column({ name: 'hours_worked', type: 'decimal', precision: 5, scale: 2, nullable: true })
    hoursWorked: number;

    /**
     * 備註
     */
    @Column({ type: 'text', nullable: true })
    notes: string;

    /**
     * 額外資料
     */
    @Column({ type: 'jsonb', nullable: true })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
