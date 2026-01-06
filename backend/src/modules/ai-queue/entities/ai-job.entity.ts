import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
    OneToOne,
} from 'typeorm';
import { AiResult } from './ai-result.entity';

export enum AiJobStatus {
    QUEUED = 'queued',
    RUNNING = 'running',
    SUCCEEDED = 'succeeded',
    FAILED = 'failed',
    SKIPPED = 'skipped',
    CANCELLED = 'cancelled',
}

/**
 * AI Job Entity
 * Tracks AI processing jobs with lifecycle, retry, and idempotency support
 */
@Entity('ai_jobs')
@Index(['status', 'notBefore', 'priority'])
@Index(['missionSessionId', 'status', 'priority'])
@Index(['useCaseId', 'status'])
@Index(['entityType', 'entityId'])
export class AiJob {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ name: 'mission_session_id', type: 'uuid' })
    missionSessionId: string;

    @Column({ name: 'use_case_id', type: 'text' })
    useCaseId: string;

    @Column({ type: 'integer', default: 5 })
    priority: number;

    @Column({
        type: 'varchar',
        length: 20,
        default: AiJobStatus.QUEUED,
    })
    status: AiJobStatus;

    // Entity reference
    @Column({ name: 'entity_type', type: 'text' })
    entityType: string;

    @Column({ name: 'entity_id', type: 'uuid' })
    entityId: string;

    // Idempotency
    @Column({ name: 'input_fingerprint', type: 'text', nullable: true })
    inputFingerprint: string;

    @Column({ name: 'idempotency_key', type: 'text', unique: true, nullable: true })
    idempotencyKey: string;

    // AI execution
    @Column({ name: 'model_name', type: 'text', nullable: true })
    modelName: string;

    @Column({ name: 'prompt_version', type: 'text', nullable: true })
    promptVersion: string;

    @Column({ name: 'output_json', type: 'jsonb', nullable: true })
    outputJson: object;

    // Retry management
    @Column({ type: 'integer', default: 0 })
    attempt: number;

    @Column({ name: 'max_attempts', type: 'integer', default: 3 })
    maxAttempts: number;

    @Column({ name: 'not_before', type: 'timestamptz', nullable: true })
    notBefore: Date;

    // Error tracking
    @Column({ name: 'error_code', type: 'text', nullable: true })
    errorCode: string;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    // Metadata
    @Column({ name: 'is_fallback', type: 'boolean', default: false })
    isFallback: boolean;

    @Column({ name: 'processing_time_ms', type: 'integer', nullable: true })
    processingTimeMs: number;

    // Audit
    @Column({ name: 'created_by', type: 'text' })
    createdBy: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    // Relation
    @OneToOne(() => AiResult, result => result.job, { nullable: true })
    result?: AiResult;
}
