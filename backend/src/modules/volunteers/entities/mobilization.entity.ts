import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';

export enum MobilizationStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED',
}

export enum MobilizationPriority {
    LOW = 'LOW',
    NORMAL = 'NORMAL',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

@Entity('volunteer_mobilizations')
export class VolunteerMobilization {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    missionSessionId: string;

    @Column()
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ type: 'enum', enum: MobilizationPriority, default: MobilizationPriority.NORMAL })
    priority: MobilizationPriority;

    @Column({ type: 'enum', enum: MobilizationStatus, default: MobilizationStatus.DRAFT })
    status: MobilizationStatus;

    @Column({ nullable: true })
    location: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude: number;

    @Column({ type: 'simple-array', nullable: true })
    requiredSkills: string[];

    @Column({ type: 'int', default: 1 })
    requiredCount: number;

    @Column({ type: 'int', default: 0 })
    confirmedCount: number;

    @Column({ type: 'int', default: 0 })
    checkedInCount: number;

    @Column({ type: 'timestamp', nullable: true })
    startTime: Date;

    @Column({ type: 'timestamp', nullable: true })
    endTime: Date;

    @Column()
    createdBy: string;

    @Column({ nullable: true })
    notificationSent: boolean;

    @Column({ type: 'timestamp', nullable: true })
    notificationSentAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => MobilizationResponse, (response) => response.mobilization)
    responses: MobilizationResponse[];
}

export enum ResponseStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    DECLINED = 'DECLINED',
    CHECKED_IN = 'CHECKED_IN',
    NO_SHOW = 'NO_SHOW',
}

@Entity('mobilization_responses')
export class MobilizationResponse {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    mobilizationId: string;

    @Column()
    volunteerId: string;

    @Column({ type: 'enum', enum: ResponseStatus, default: ResponseStatus.PENDING })
    status: ResponseStatus;

    @Column({ type: 'timestamp', nullable: true })
    respondedAt: Date;

    @Column({ type: 'timestamp', nullable: true })
    checkedInAt: Date;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    checkinLatitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    checkinLongitude: number;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    mobilization: VolunteerMobilization;
}
