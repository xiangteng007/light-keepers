import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * AI Queue Platform - Database Schema
 * 
 * Creates tables for:
 * - ai_jobs: Job lifecycle management with retry and idempotency
 * - ai_results: Human decision tracking (accept/reject)
 * - ai_circuit_breaker: 429 error tracking for circuit breaking
 */
export class AddAiQueuePlatform1736092800000 implements MigrationInterface {
    name = 'AddAiQueuePlatform1736092800000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ai_jobs: Core job table for queue management
        await queryRunner.query(`
            CREATE TABLE ai_jobs (
                id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                mission_session_id UUID NOT NULL,
                use_case_id TEXT NOT NULL,
                priority INTEGER NOT NULL DEFAULT 5,
                status VARCHAR(20) NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued','running','succeeded','failed','skipped','cancelled')),
                
                -- Entity reference (what this job operates on)
                entity_type TEXT NOT NULL,
                entity_id UUID NOT NULL,
                
                -- Idempotency & deduplication
                input_fingerprint TEXT,
                idempotency_key TEXT UNIQUE,
                
                -- AI execution details
                model_name TEXT,
                prompt_version TEXT,
                output_json JSONB,
                
                -- Retry management
                attempt INTEGER NOT NULL DEFAULT 0,
                max_attempts INTEGER NOT NULL DEFAULT 3,
                not_before TIMESTAMPTZ,
                
                -- Error tracking
                error_code TEXT,
                error_message TEXT,
                
                -- Metadata
                is_fallback BOOLEAN NOT NULL DEFAULT FALSE,
                processing_time_ms INTEGER,
                
                -- Audit
                created_by TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        // Indexes for efficient job polling
        await queryRunner.query(`
            CREATE INDEX idx_ai_jobs_poll 
            ON ai_jobs(status, not_before, priority DESC) 
            WHERE status = 'queued'
        `);

        await queryRunner.query(`
            CREATE INDEX idx_ai_jobs_session_status 
            ON ai_jobs(mission_session_id, status, priority DESC)
        `);

        await queryRunner.query(`
            CREATE INDEX idx_ai_jobs_usecase_status 
            ON ai_jobs(use_case_id, status)
        `);

        await queryRunner.query(`
            CREATE INDEX idx_ai_jobs_entity 
            ON ai_jobs(entity_type, entity_id)
        `);

        await queryRunner.query(`
            CREATE INDEX idx_ai_jobs_created_at
            ON ai_jobs(created_at DESC)
        `);

        // ai_results: Track human decisions on AI outputs
        await queryRunner.query(`
            CREATE TABLE ai_results (
                job_id UUID PRIMARY KEY REFERENCES ai_jobs(id) ON DELETE CASCADE,
                
                -- Accept tracking
                accepted_by TEXT,
                accepted_at TIMESTAMPTZ,
                
                -- Reject tracking
                rejected_by TEXT,
                rejected_at TIMESTAMPTZ,
                rejection_reason TEXT,
                
                -- What action was taken
                applied_action TEXT,
                
                -- Before/After snapshots for audit
                before_snapshot JSONB,
                after_snapshot JSONB,
                
                -- Affected entities
                affected_entities JSONB,
                
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        await queryRunner.query(`
            CREATE INDEX idx_ai_results_accepted 
            ON ai_results(accepted_at DESC) 
            WHERE accepted_at IS NOT NULL
        `);

        await queryRunner.query(`
            CREATE INDEX idx_ai_results_job 
            ON ai_results(job_id)
        `);

        // ai_circuit_breaker: Track consecutive failures for circuit breaking
        await queryRunner.query(`
            CREATE TABLE ai_circuit_breaker (
                use_case_id TEXT PRIMARY KEY,
                consecutive_failures INTEGER NOT NULL DEFAULT 0,
                last_failure_at TIMESTAMPTZ,
                cooldown_until TIMESTAMPTZ,
                total_failures INTEGER NOT NULL DEFAULT 0,
                total_successes INTEGER NOT NULL DEFAULT 0,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        `);

        // Insert initial circuit breaker records for known use cases
        await queryRunner.query(`
            INSERT INTO ai_circuit_breaker (use_case_id) VALUES
            ('report.summarize.v1'),
            ('report.cluster.v1'),
            ('task.draftFromReport.v1')
            ON CONFLICT (use_case_id) DO NOTHING
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE IF EXISTS ai_circuit_breaker`);
        await queryRunner.query(`DROP TABLE IF EXISTS ai_results`);
        await queryRunner.query(`DROP TABLE IF EXISTS ai_jobs`);
    }
}
