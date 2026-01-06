import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('shifts')
@Index(['volunteerId', 'date'])
export class Shift {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'date' })
    @Index()
    date: Date;

    @Column({ type: 'varchar', length: 50 })
    templateId: string;

    @Column()
    @Index()
    volunteerId: string;

    @Column({ type: 'varchar', length: 100 })
    volunteerName: string;

    @Column({ type: 'time' })
    startTime: string;

    @Column({ type: 'time' })
    endTime: string;

    @Column({ type: 'varchar', length: 20, default: 'scheduled' })
    status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    locationId: string;

    @Column({ type: 'varchar', length: 200, nullable: true })
    locationName: string;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;
}

@Entity('shift_templates')
export class ShiftTemplate {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50 })
    name: string;

    @Column({ type: 'time' })
    startTime: string;

    @Column({ type: 'time' })
    endTime: string;

    @Column({ type: 'varchar', length: 7 })
    color: string;

    @Column({ type: 'boolean', default: true })
    isActive: boolean;

    @CreateDateColumn()
    createdAt: Date;
}
