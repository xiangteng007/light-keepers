import {
    Entity,
    PrimaryColumn,
    Column,
    UpdateDateColumn,
} from 'typeorm';

/**
 * AI Circuit Breaker Entity
 * Tracks consecutive failures per use case for circuit breaking
 */
@Entity('ai_circuit_breaker')
export class AiCircuitBreaker {
    @PrimaryColumn({ name: 'use_case_id', type: 'text' })
    useCaseId: string;

    @Column({ name: 'consecutive_failures', type: 'integer', default: 0 })
    consecutiveFailures: number;

    @Column({ name: 'last_failure_at', type: 'timestamptz', nullable: true })
    lastFailureAt: Date;

    @Column({ name: 'cooldown_until', type: 'timestamptz', nullable: true })
    cooldownUntil: Date;

    @Column({ name: 'total_failures', type: 'integer', default: 0 })
    totalFailures: number;

    @Column({ name: 'total_successes', type: 'integer', default: 0 })
    totalSuccesses: number;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt: Date;

    /**
     * Check if circuit breaker is open (blocking requests)
     */
    isOpen(): boolean {
        if (!this.cooldownUntil) return false;
        return new Date() < this.cooldownUntil;
    }

    /**
     * Get remaining cooldown time in milliseconds
     */
    getRemainingCooldownMs(): number {
        if (!this.cooldownUntil) return 0;
        const remaining = this.cooldownUntil.getTime() - Date.now();
        return Math.max(0, remaining);
    }
}
