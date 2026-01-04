import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { MissionSession } from './mission-session.entity';

export enum TransactionType {
    DEPLOY = 'deploy',
    RETURN = 'return',
    CONSUME = 'consume',
    RESTOCK = 'restock',
}

@Entity('inventory_transactions')
export class InventoryTransaction {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'session_id', type: 'uuid' })
    sessionId: string;

    @Column({ type: 'varchar', length: 255 })
    item: string;

    @Column({ type: 'int' })
    quantity: number;

    @Column({
        type: 'enum',
        enum: TransactionType,
        default: TransactionType.DEPLOY,
    })
    type: TransactionType;

    @Column({ name: 'operator_id', type: 'varchar', nullable: true })
    operatorId: string;

    @Column({ name: 'operator_name', type: 'varchar', nullable: true })
    operatorName: string;

    @Column({ type: 'text', nullable: true })
    notes: string;

    @Column({ type: 'jsonb', nullable: true, comment: 'Transaction metadata' })
    metadata: Record<string, any>;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    // Relations
    @ManyToOne(() => MissionSession, (session) => session.inventoryTransactions, {
        onDelete: 'CASCADE',
    })
    @JoinColumn({ name: 'session_id' })
    session: MissionSession;
}
