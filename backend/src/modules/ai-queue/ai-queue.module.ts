import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';

// Entities
import { AiJob, AiResult, AiCircuitBreaker } from './entities';
import { FieldReport, AuditLog } from '../field-reports/entities';

// Controllers
import { AiJobsController } from './ai-jobs.controller';
import { AiResultsController } from './ai-results.controller';

// Services
import { AiJobsService } from './ai-jobs.service';
import { AiResultsService } from './ai-results.service';
import { AuditService } from '../field-reports/audit.service';

// Gateway
import { AiQueueGateway } from './ai-queue.gateway';

// Workers
import { AiWorkerService } from './workers/ai-worker.service';
import { RateLimiterService } from './workers/rate-limiter.service';
import { CircuitBreakerService } from './workers/circuit-breaker.service';

// Providers
import { GeminiProvider } from './providers/gemini.provider';

// Use Cases
import {
    ReportSummarizeUseCase,
    ReportClusterUseCase,
    TaskDraftUseCase,
    ResourceRecommendUseCase,
    PriorityScoreUseCase,
    UseCaseFactory,
} from './use-cases';

import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            AiJob,
            AiResult,
            AiCircuitBreaker,
            FieldReport,
            AuditLog,
        ]),
        ConfigModule,
        forwardRef(() => AuthModule), // For JwtAuthGuard
    ],
    controllers: [
        AiJobsController,
        AiResultsController,
    ],
    providers: [
        // Core Services
        AiJobsService,
        AiResultsService,
        AiQueueGateway,
        AuditService, // Provide our own instance

        // Workers
        AiWorkerService,
        RateLimiterService,
        CircuitBreakerService,

        // Providers
        GeminiProvider,

        // Use Cases
        ReportSummarizeUseCase,
        ReportClusterUseCase,
        TaskDraftUseCase,
        ResourceRecommendUseCase,
        PriorityScoreUseCase,
        UseCaseFactory,
    ],
    exports: [
        AiJobsService,
        AiResultsService,
        AiQueueGateway,
        UseCaseFactory,
    ],
})
export class AiQueueModule { }
