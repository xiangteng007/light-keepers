import { Injectable } from '@nestjs/common';
import { AiJob } from '../entities';
import { USE_CASE_CONFIG, RATE_LIMIT_CONFIG } from '../constants/use-case-config';
import { AiUseCaseId } from '../dto';

/**
 * Rate Limiter Service
 * Controls concurrency at global, per-use-case, and per-mission levels
 */
@Injectable()
export class RateLimiterService {
    private globalRunning = 0;
    private perUseCaseRunning = new Map<string, number>();
    private perMissionRunning = new Map<string, number>();

    /**
     * Check if can acquire global slot
     */
    canAcquireGlobal(): boolean {
        return this.globalRunning < RATE_LIMIT_CONFIG.globalMaxConcurrency;
    }

    /**
     * Attempt to acquire all necessary rate limit slots
     */
    async acquire(job: AiJob): Promise<boolean> {
        const config = USE_CASE_CONFIG[job.useCaseId as AiUseCaseId];
        if (!config) return false;

        // Check global limit
        if (this.globalRunning >= RATE_LIMIT_CONFIG.globalMaxConcurrency) {
            return false;
        }

        // Check per-use-case limit
        const useCaseRunning = this.perUseCaseRunning.get(job.useCaseId) ?? 0;
        if (useCaseRunning >= config.maxConcurrency) {
            return false;
        }

        // Check per-mission limit
        const missionRunning = this.perMissionRunning.get(job.missionSessionId) ?? 0;
        if (missionRunning >= RATE_LIMIT_CONFIG.perMissionMaxConcurrency) {
            return false;
        }

        // Acquire all slots
        this.globalRunning++;
        this.perUseCaseRunning.set(job.useCaseId, useCaseRunning + 1);
        this.perMissionRunning.set(job.missionSessionId, missionRunning + 1);

        return true;
    }

    /**
     * Release all rate limit slots for a job
     */
    release(job: AiJob): void {
        this.globalRunning = Math.max(0, this.globalRunning - 1);

        const useCaseRunning = this.perUseCaseRunning.get(job.useCaseId) ?? 0;
        this.perUseCaseRunning.set(job.useCaseId, Math.max(0, useCaseRunning - 1));

        const missionRunning = this.perMissionRunning.get(job.missionSessionId) ?? 0;
        this.perMissionRunning.set(job.missionSessionId, Math.max(0, missionRunning - 1));
    }

    /**
     * Get current stats
     */
    getStats(): {
        globalRunning: number;
        perUseCase: Record<string, number>;
        perMission: Record<string, number>;
    } {
        return {
            globalRunning: this.globalRunning,
            perUseCase: Object.fromEntries(this.perUseCaseRunning),
            perMission: Object.fromEntries(this.perMissionRunning),
        };
    }

    /**
     * Reset all counters (for testing)
     */
    reset(): void {
        this.globalRunning = 0;
        this.perUseCaseRunning.clear();
        this.perMissionRunning.clear();
    }
}
