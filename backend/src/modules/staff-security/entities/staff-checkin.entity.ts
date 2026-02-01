/**
 * Staff Check-In Entity
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('staff_checkins')
export class StaffCheckIn {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    staffId: string;

    @Column()
    type: string;

    @Column('decimal', { nullable: true, precision: 10, scale: 7 })
    latitude: number;

    @Column('decimal', { nullable: true, precision: 10, scale: 7 })
    longitude: number;

    @Column('decimal', { nullable: true, precision: 5, scale: 1 })
    accuracy: number;

    @Column({ nullable: true })
    message: string;

    @Column({ nullable: true })
    missionId: string;

    @CreateDateColumn()
    checkedInAt: Date;
}
