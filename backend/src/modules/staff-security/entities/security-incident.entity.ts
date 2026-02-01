/**
 * Security Incident Entity
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('security_incidents')
export class SecurityIncident {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    type: string;

    @Column()
    severity: string;

    @Column('text')
    description: string;

    @Column('decimal', { nullable: true, precision: 10, scale: 7 })
    latitude: number;

    @Column('decimal', { nullable: true, precision: 10, scale: 7 })
    longitude: number;

    @Column({ nullable: true })
    address: string;

    @Column('simple-array', { nullable: true })
    affectedStaffIds: string[];

    @Column()
    reporterId: string;

    @Column({ default: 'reported' })
    status: string;

    @Column({ nullable: true })
    resolution: string;

    @CreateDateColumn()
    reportedAt: Date;

    @Column({ nullable: true })
    resolvedAt: Date;
}
