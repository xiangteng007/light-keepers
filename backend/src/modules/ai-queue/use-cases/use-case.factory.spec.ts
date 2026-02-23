import { Test, TestingModule } from '@nestjs/testing';
import { UseCaseFactory } from './use-case.factory';
import { ReportSummarizeUseCase } from './report-summarize.usecase';
import { ReportClusterUseCase } from './report-cluster.usecase';
import { TaskDraftUseCase } from './task-draft.usecase';
import { ResourceRecommendUseCase } from './resource-recommend.usecase';
import { PriorityScoreUseCase } from './priority-score.usecase';

describe('UseCaseFactory', () => {
    let factory: UseCaseFactory;
    const mockSummarize = { execute: jest.fn(), fallback: jest.fn() };
    const mockCluster = { execute: jest.fn(), fallback: jest.fn() };
    const mockTaskDraft = { execute: jest.fn(), fallback: jest.fn() };
    const mockResourceRec = { execute: jest.fn(), fallback: jest.fn() };
    const mockPriority = { execute: jest.fn(), fallback: jest.fn() };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UseCaseFactory,
                { provide: ReportSummarizeUseCase, useValue: mockSummarize },
                { provide: ReportClusterUseCase, useValue: mockCluster },
                { provide: TaskDraftUseCase, useValue: mockTaskDraft },
                { provide: ResourceRecommendUseCase, useValue: mockResourceRec },
                { provide: PriorityScoreUseCase, useValue: mockPriority },
            ],
        }).compile();

        factory = module.get<UseCaseFactory>(UseCaseFactory);
    });

    it('should be defined', () => {
        expect(factory).toBeDefined();
    });

    describe('get', () => {
        it('should return report.summarize.v1 use case', () => {
            expect(factory.get('report.summarize.v1')).toBe(mockSummarize);
        });

        it('should return report.cluster.v1 use case', () => {
            expect(factory.get('report.cluster.v1')).toBe(mockCluster);
        });

        it('should return task.draftFromReport.v1 use case', () => {
            expect(factory.get('task.draftFromReport.v1')).toBe(mockTaskDraft);
        });

        it('should return resource.recommend.v1 use case', () => {
            expect(factory.get('resource.recommend.v1')).toBe(mockResourceRec);
        });

        it('should return priority.score.v1 use case', () => {
            expect(factory.get('priority.score.v1')).toBe(mockPriority);
        });

        it('should throw for unknown use case', () => {
            expect(() => factory.get('unknown.v99')).toThrow('Unknown use case: unknown.v99');
        });
    });

    describe('has', () => {
        it('should return true for registered use cases', () => {
            expect(factory.has('report.summarize.v1')).toBe(true);
            expect(factory.has('priority.score.v1')).toBe(true);
        });

        it('should return false for unknown use cases', () => {
            expect(factory.has('nonexistent.v1')).toBe(false);
        });
    });

    describe('getAll', () => {
        it('should return all 5 registered use case IDs', () => {
            const all = factory.getAll();
            expect(all).toHaveLength(5);
            expect(all).toContain('report.summarize.v1');
            expect(all).toContain('report.cluster.v1');
            expect(all).toContain('task.draftFromReport.v1');
            expect(all).toContain('resource.recommend.v1');
            expect(all).toContain('priority.score.v1');
        });
    });
});
