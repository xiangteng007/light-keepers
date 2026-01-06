import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('attendance_records')
@Index(['volunteerId', 'date'])
export class AttendanceRecord {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    @Index()
    volunteerId: string;

    @Column({ type: 'date' })
    date: Date;

    @Column({ type: 'time' })
    checkInTime: string;

    @Column({ type: 'time', nullable: true })
    checkOutTime: string;

    @Column({ type: 'decimal', precision: 4, scale: 2, nullable: true })
    hours: number;

    @Column({ type: 'varchar', length: 10 })
    method: 'gps' | 'qr';

    @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
    checkInLat: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
    checkInLng: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
    checkOutLat: number;

    @Column({ type: 'decimal', precision: 10, scale: 6, nullable: true })
    checkOutLng: number;

    @Column({ type: 'varchar', length: 100, nullable: true })
    locationName: string;

    @Column({ type: 'varchar', length: 20, default: 'completed' })
    status: 'checked_in' | 'completed' | 'cancelled';

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
