import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
} from 'typeorm';

export enum SafetyLevel {
    GREEN = 'GREEN',     // Safe for entry
    YELLOW = 'YELLOW',   // Limited entry / caution
    RED = 'RED',         // Unsafe / no entry
    UNKNOWN = 'UNKNOWN', // Not yet assessed
}

export enum StructureType {
    RESIDENTIAL = 'RESIDENTIAL',
    COMMERCIAL = 'COMMERCIAL',
    INDUSTRIAL = 'INDUSTRIAL',
    PUBLIC = 'PUBLIC',
    MIXED = 'MIXED',
}

@Entity('structural_assessments')
export class StructuralAssessment {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ nullable: true })
    missionSessionId: string;

    @Column()
    address: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude: number;

    @Column({ type: 'enum', enum: StructureType, default: StructureType.RESIDENTIAL })
    structureType: StructureType;

    @Column({ type: 'int', nullable: true })
    floors: number;

    @Column({ type: 'int', nullable: true })
    estimatedOccupants: number;

    @Column({ type: 'enum', enum: SafetyLevel, default: SafetyLevel.UNKNOWN })
    safetyLevel: SafetyLevel;

    @Column({ type: 'boolean', default: false })
    hasCollapse: boolean;

    @Column({ type: 'boolean', default: false })
    hasFireDamage: boolean;

    @Column({ type: 'boolean', default: false })
    hasGasLeak: boolean;

    @Column({ type: 'boolean', default: false })
    hasWaterDamage: boolean;

    @Column({ type: 'boolean', default: false })
    hasElectricalHazard: boolean;

    @Column({ type: 'int', default: 0 })
    estimatedTrapped: number;

    @Column({ type: 'int', default: 0 })
    confirmedTrapped: number;

    @Column({ type: 'int', default: 0 })
    rescued: number;

    @Column({ type: 'text', nullable: true })
    structuralNotes: string;

    @Column({ type: 'text', nullable: true })
    accessPoints: string; // JSON array

    @Column({ type: 'text', nullable: true })
    hazards: string; // JSON array

    @Column({ type: 'text', nullable: true })
    recommendations: string;

    @Column()
    assessedBy: string;

    @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
    assessedAt: Date;

    @Column({ type: 'boolean', default: false })
    requiresReassessment: boolean;

    @Column({ type: 'timestamp', nullable: true })
    nextAssessmentDue: Date;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}
