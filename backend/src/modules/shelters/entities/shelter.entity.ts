import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
    ManyToOne,
    JoinColumn,
} from 'typeorm';

export enum ShelterStatus {
    INACTIVE = 'INACTIVE',
    STANDBY = 'STANDBY',
    OPEN = 'OPEN',
    FULL = 'FULL',
    CLOSED = 'CLOSED',
}

export enum ShelterType {
    SCHOOL = 'SCHOOL',
    COMMUNITY_CENTER = 'COMMUNITY_CENTER',
    GYMNASIUM = 'GYMNASIUM',
    CHURCH = 'CHURCH',
    OTHER = 'OTHER',
}

@Entity('shelters')
export class Shelter {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    name: string;

    @Column({ type: 'enum', enum: ShelterType, default: ShelterType.OTHER })
    type: ShelterType;

    @Column()
    address: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude: number;

    @Column({ type: 'int', default: 100 })
    capacity: number;

    @Column({ type: 'int', default: 0 })
    currentOccupancy: number;

    @Column({ type: 'enum', enum: ShelterStatus, default: ShelterStatus.INACTIVE })
    status: ShelterStatus;

    @Column({ nullable: true })
    contactName: string;

    @Column({ nullable: true })
    contactPhone: string;

    @Column({ type: 'text', nullable: true })
    facilities: string; // JSON array: ['wheelchair_accessible', 'medical_station', 'kitchen']

    @Column({ nullable: true })
    activatedBy: string;

    @Column({ type: 'timestamp', nullable: true })
    activatedAt: Date;

    @Column({ nullable: true })
    missionSessionId: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => ShelterEvacuee, (evacuee) => evacuee.shelter)
    evacuees: ShelterEvacuee[];
}

export enum EvacueeStatus {
    CHECKED_IN = 'CHECKED_IN',
    CHECKED_OUT = 'CHECKED_OUT',
    TRANSFERRED = 'TRANSFERRED',
}

export enum SpecialNeeds {
    ELDERLY = 'ELDERLY',
    INFANT = 'INFANT',
    PREGNANT = 'PREGNANT',
    DISABLED = 'DISABLED',
    CHRONIC_ILLNESS = 'CHRONIC_ILLNESS',
    NONE = 'NONE',
}

@Entity('shelter_evacuees')
export class ShelterEvacuee {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    shelterId: string;

    @ManyToOne(() => Shelter, (shelter) => shelter.evacuees)
    @JoinColumn({ name: 'shelterId' })
    shelter: Shelter;

    @Column()
    name: string;

    @Column({ nullable: true })
    idNumber: string; // 身分證字號 (masked)

    @Column({ type: 'int', nullable: true })
    age: number;

    @Column({ nullable: true })
    gender: string;

    @Column({ nullable: true })
    phone: string;

    @Column({ nullable: true })
    emergencyContact: string;

    @Column({ nullable: true })
    emergencyPhone: string;

    @Column({ type: 'simple-array', nullable: true })
    specialNeeds: SpecialNeeds[];

    @Column({ nullable: true })
    bedAssignment: string;

    @Column({ type: 'enum', enum: EvacueeStatus, default: EvacueeStatus.CHECKED_IN })
    status: EvacueeStatus;

    @Column()
    queryCode: string; // 家屬查詢碼

    @Column({ nullable: true })
    checkedInBy: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    checkedInAt: Date;

    @Column({ nullable: true })
    checkedOutBy: string;

    @Column({ type: 'timestamp', nullable: true })
    checkedOutAt: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('shelter_health_screenings')
export class ShelterHealthScreening {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    evacueeId: string;

    @Column()
    shelterId: string;

    @Column({ type: 'decimal', precision: 3, scale: 1, nullable: true })
    temperature: number;

    @Column({ nullable: true })
    bloodPressure: string;

    @Column({ type: 'text', nullable: true })
    symptoms: string;

    @Column({ type: 'text', nullable: true })
    medications: string;

    @Column({ type: 'text', nullable: true })
    allergies: string;

    @Column({ type: 'boolean', default: false })
    requiresImmediateAttention: boolean;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column()
    screenedBy: string;

    @CreateDateColumn()
    screenedAt: Date;
}

@Entity('shelter_daily_reports')
export class ShelterDailyReport {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    shelterId: string;

    @Column({ type: 'date' })
    reportDate: Date;

    @Column({ type: 'int' })
    totalEvacuees: number;

    @Column({ type: 'int', default: 0 })
    newArrivals: number;

    @Column({ type: 'int', default: 0 })
    departures: number;

    @Column({ type: 'int', default: 0 })
    medicalCases: number;

    @Column({ type: 'text', nullable: true })
    supplyStatus: string; // JSON

    @Column({ type: 'text', nullable: true })
    issues: string;

    @Column({ type: 'text', nullable: true })
    needs: string;

    @Column()
    reportedBy: string;

    @CreateDateColumn()
    createdAt: Date;
}
