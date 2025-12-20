import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';

@Entity('events')
export class Event {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ length: 200 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({ length: 50, nullable: true })
    category: string;

    @Column({ type: 'smallint', nullable: true })
    severity: number;

    @Column({ length: 20, default: 'active' })
    status: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ name: 'admin_code', length: 20, nullable: true })
    adminCode: string;

    @Column({ name: 'started_at', type: 'timestamp', nullable: true })
    startedAt: Date;

    @Column({ name: 'resolved_at', type: 'timestamp', nullable: true })
    resolvedAt: Date;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
