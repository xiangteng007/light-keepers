import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    OneToMany,
} from 'typeorm';
import { Event } from './event.entity';
import { Task } from './task.entity';
import { InventoryTransaction } from './inventory-transaction.entity';

export enum MissionStatus {
    PREPARING = 'preparing',
    ACTIVE = 'active',
    PAUSED = 'paused',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
}

@Entity('mission_sessions')
export class MissionSession {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    description: string;

    @Column({
        type: 'enum',
        enum: MissionStatus,
        default: MissionStatus.PREPARING,
    })
    status: MissionStatus;

    @Column({ name: 'commander_id', type: 'varchar', nullable: true })
    commanderId: string;

    @Column({ name: 'commander_name', type: 'varchar', nullable: true })
    commanderName: string;

    @Column({ type: 'jsonb', nullable: true, comment: 'Mission metadata and settings' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ name: 'started_at', type: 'timestamp', nullable: true })
    startedAt: Date;

    @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
    endedAt: Date;

    // Relations
    @OneToMany(() => Event, (event) => event.session, { cascade: true })
    events: Event[];

    @OneToMany(() => Task, (task) => task.session, { cascade: true })
    tasks: Task[];

    @OneToMany(() => InventoryTransaction, (txn) => txn.session, { cascade: true })
    inventoryTransactions: InventoryTransaction[];
}
