import { Injectable } from '@nestjs/common';
import { AiUseCase } from './base.usecase';
import { ReportSummarizeUseCase } from './report-summarize.usecase';
import { ReportClusterUseCase } from './report-cluster.usecase';
import { TaskDraftUseCase } from './task-draft.usecase';
import { ResourceRecommendUseCase } from './resource-recommend.usecase';
import { PriorityScoreUseCase } from './priority-score.usecase';

/**
 * Factory for getting use case instances
 */
@Injectable()
export class UseCaseFactory {
    private readonly useCases: Map<string, AiUseCase>;

    constructor(
        private summarize: ReportSummarizeUseCase,
        private cluster: ReportClusterUseCase,
        private taskDraft: TaskDraftUseCase,
        private resourceRecommend: ResourceRecommendUseCase,
        private priorityScore: PriorityScoreUseCase,
    ) {
        this.useCases = new Map<string, AiUseCase>();
        this.useCases.set('report.summarize.v1', this.summarize);
        this.useCases.set('report.cluster.v1', this.cluster);
        this.useCases.set('task.draftFromReport.v1', this.taskDraft);
        this.useCases.set('resource.recommend.v1', this.resourceRecommend);
        this.useCases.set('priority.score.v1', this.priorityScore);
    }

    /**
     * Get use case by ID
     */
    get(useCaseId: string): AiUseCase {
        const useCase = this.useCases.get(useCaseId);
        if (!useCase) {
            throw new Error(`Unknown use case: ${useCaseId}`);
        }
        return useCase;
    }

    /**
     * Check if use case exists
     */
    has(useCaseId: string): boolean {
        return this.useCases.has(useCaseId);
    }

    /**
     * Get all registered use case IDs
     */
    getAll(): string[] {
        return Array.from(this.useCases.keys());
    }
}
