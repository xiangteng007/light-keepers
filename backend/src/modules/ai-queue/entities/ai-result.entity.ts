import {
    Entity,
    PrimaryColumn,
    Column,
    CreateDateColumn,
    OneToOne,
    JoinColumn,
} from 'typeorm';
import { AiJob } from './ai-job.entity';

/**
 * AI Result Entity
 * Tracks human decisions (accept/reject) on AI job outputs
 */
@Entity('ai_results')
export class AiResult {
    @PrimaryColumn({ name: 'job_id', type: 'uuid' })
    jobId: string;

    @OneToOne(() => AiJob, job => job.result, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'job_id' })
    job: AiJob;

    // Accept tracking
    @Column({ name: 'accepted_by', type: 'text', nullable: true })
    acceptedBy: string;

    @Column({ name: 'accepted_at', type: 'timestamptz', nullable: true })
    acceptedAt: Date;

    // Reject tracking
    @Column({ name: 'rejected_by', type: 'text', nullable: true })
    rejectedBy: string;

    @Column({ name: 'rejected_at', type: 'timestamptz', nullable: true })
    rejectedAt: Date;

    @Column({ name: 'rejection_reason', type: 'text', nullable: true })
    rejectionReason: string | null;

    // Action taken
    @Column({ name: 'applied_action', type: 'text', nullable: true })
    appliedAction: string;

    // Snapshots for audit
    @Column({ name: 'before_snapshot', type: 'jsonb', nullable: true })
    beforeSnapshot: object;

    @Column({ name: 'after_snapshot', type: 'jsonb', nullable: true })
    afterSnapshot: object;

    // Affected entities
    @Column({ name: 'affected_entities', type: 'jsonb', nullable: true })
    affectedEntities: Array<{ type: string; id: string }>;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    // Helper methods
    get isAccepted(): boolean {
        return this.acceptedAt != null;
    }

    get isRejected(): boolean {
        return this.rejectedAt != null;
    }

    get isProcessed(): boolean {
        return this.isAccepted || this.isRejected;
    }
}
