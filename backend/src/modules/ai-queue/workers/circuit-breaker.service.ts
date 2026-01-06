import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiCircuitBreaker } from '../entities';
import { USE_CASE_CONFIG } from '../constants/use-case-config';
import { AiUseCaseId } from '../dto';

/**
 * Circuit Breaker Service
 * Tracks consecutive failures and manages cooldown periods
 */
@Injectable()
export class CircuitBreakerService {
    constructor(
        @InjectRepository(AiCircuitBreaker)
        private breakerRepo: Repository<AiCircuitBreaker>,
    ) { }

    /**
     * Get circuit breaker state for a use case
     */
    async get(useCaseId: string): Promise<AiCircuitBreaker | null> {
        return this.breakerRepo.findOne({ where: { useCaseId } });
    }

    /**
     * Check if circuit breaker is open (blocking requests)
     */
    async isOpen(useCaseId: string): Promise<boolean> {
        const breaker = await this.get(useCaseId);
        return breaker?.isOpen() ?? false;
    }

    /**
     * Record a successful call (resets consecutive failures)
     */
    async recordSuccess(useCaseId: string): Promise<void> {
        await this.breakerRepo.query(`
            INSERT INTO ai_circuit_breaker (use_case_id, consecutive_failures, total_successes, updated_at)
            VALUES ($1, 0, 1, NOW())
            ON CONFLICT (use_case_id) DO UPDATE SET
                consecutive_failures = 0,
                total_successes = ai_circuit_breaker.total_successes + 1,
                updated_at = NOW()
        `, [useCaseId]);
    }

    /**
     * Record a failure (increment counter, possibly open circuit)
     */
    async recordFailure(useCaseId: string): Promise<void> {
        const config = USE_CASE_CONFIG[useCaseId as AiUseCaseId];
        if (!config) return;

        const breaker = await this.get(useCaseId) || this.breakerRepo.create({ useCaseId });

        breaker.consecutiveFailures++;
        breaker.totalFailures++;
        breaker.lastFailureAt = new Date();

        // Check if we should open the circuit
        if (breaker.consecutiveFailures >= config.circuitBreakerThreshold) {
            breaker.cooldownUntil = new Date(Date.now() + config.circuitBreakerCooldownMs);
            console.log(`[CircuitBreaker] Opening circuit for ${useCaseId} until ${breaker.cooldownUntil.toISOString()}`);
        }

        await this.breakerRepo.save(breaker);
    }

    /**
     * Manually reset circuit breaker
     */
    async reset(useCaseId: string): Promise<void> {
        await this.breakerRepo.query(`
            UPDATE ai_circuit_breaker
            SET consecutive_failures = 0,
                cooldown_until = NULL,
                updated_at = NOW()
            WHERE use_case_id = $1
        `, [useCaseId]);
    }

    /**
     * Get all circuit breaker states
     */
    async getAll(): Promise<AiCircuitBreaker[]> {
        return this.breakerRepo.find();
    }
}
