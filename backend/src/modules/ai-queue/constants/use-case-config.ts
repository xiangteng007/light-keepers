import { AiUseCaseId } from '../dto';
import { RoleLevel } from '../../accounts/entities/role.entity';

/**
 * Configuration for each AI use case
 */
export interface UseCaseConfig {
    requiredLevel: RoleLevel;
    maxConcurrency: number;
    defaultPriority: number;
    maxRetries: number;
    promptVersion: string;
    modelName: string;
    circuitBreakerThreshold: number; // consecutive failures before opening
    circuitBreakerCooldownMs: number; // cooldown duration when open
}

export const USE_CASE_CONFIG: Record<AiUseCaseId, UseCaseConfig> = {
    'report.summarize.v1': {
        requiredLevel: RoleLevel.VOLUNTEER,
        maxConcurrency: 3,
        defaultPriority: 5,
        maxRetries: 3,
        promptVersion: 'v1.0',
        modelName: 'gemini-1.5-flash',
        circuitBreakerThreshold: 5,
        circuitBreakerCooldownMs: 300000, // 5 min
    },
    'report.cluster.v1': {
        requiredLevel: RoleLevel.OFFICER,
        maxConcurrency: 1,
        defaultPriority: 3,
        maxRetries: 2,
        promptVersion: 'v1.0',
        modelName: 'gemini-1.5-flash',
        circuitBreakerThreshold: 3,
        circuitBreakerCooldownMs: 600000, // 10 min
    },
    'task.draftFromReport.v1': {
        requiredLevel: RoleLevel.OFFICER,
        maxConcurrency: 2,
        defaultPriority: 7,
        maxRetries: 3,
        promptVersion: 'v1.0',
        modelName: 'gemini-1.5-flash',
        circuitBreakerThreshold: 5,
        circuitBreakerCooldownMs: 300000, // 5 min
    },
    'resource.recommend.v1': {
        requiredLevel: RoleLevel.OFFICER,
        maxConcurrency: 2,
        defaultPriority: 6,
        maxRetries: 3,
        promptVersion: 'v1.0',
        modelName: 'gemini-1.5-flash',
        circuitBreakerThreshold: 5,
        circuitBreakerCooldownMs: 300000, // 5 min
    },
    'priority.score.v1': {
        requiredLevel: RoleLevel.VOLUNTEER,
        maxConcurrency: 3,
        defaultPriority: 4,
        maxRetries: 3,
        promptVersion: 'v1.0',
        modelName: 'gemini-1.5-flash',
        circuitBreakerThreshold: 5,
        circuitBreakerCooldownMs: 300000, // 5 min
    },
};

/**
 * Global rate limiting configuration
 */
export const RATE_LIMIT_CONFIG = {
    globalMaxConcurrency: 5,
    perMissionMaxConcurrency: 2,
    pollIntervalMs: 1000,
    batchSize: 10,
};

/**
 * Accept action RBAC - all accept actions require Officer+
 */
export const ACCEPT_ACTION_REQUIRED_LEVEL = RoleLevel.OFFICER;
