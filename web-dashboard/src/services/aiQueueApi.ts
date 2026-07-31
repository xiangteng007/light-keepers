/**
 * AI Queue API Service
 * Handles REST API calls for AI Queue operations
 */
import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';

// Types
export type AiUseCaseId = 'report.summarize.v1' | 'report.cluster.v1' | 'task.draftFromReport.v1';
export type AiJobStatus = 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';

export interface AiJob {
    jobId: string;
    useCaseId: AiUseCaseId;
    status: AiJobStatus;
    outputJson: ReportSummaryOutput | null;
    errorCode: string | null;
    errorMessage: string | null;
    attempt: number;
    maxAttempts: number;
    isFallback: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ReportSummaryOutput {
    summary: string;
    suggestedCategory: string;
    suggestedSeverity: 0 | 1 | 2 | 3 | 4;
    identifiedNeeds: string[];
    questionsToAsk: string[];
    confidence: number;
}

export interface CreateJobResponse {
    jobId: string;
    status: AiJobStatus;
    estimatedWaitMs: number;
}

// API functions
export const aiQueueApi = {
    /**
     * Create an AI job for report summarization
     */
    async createJob(
        missionSessionId: string,
        useCaseId: AiUseCaseId,
        entityType: 'report' | 'reports' | 'task',
        entityId: string,
        token: string,
        priority?: number
    ): Promise<CreateJobResponse> {
        try {
            const { data } = await api.post(
                '/ai/jobs',
                {
                    missionSessionId,
                    useCaseId,
                    entityType,
                    entityId,
                    priority,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to create AI job'));
        }
    },

    /**
     * Get AI job status
     */
    async getJobStatus(jobId: string, token: string): Promise<AiJob> {
        try {
            const { data } = await api.get(`/ai/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to get job status'));
        }
    },

    /**
     * Cancel an AI job
     */
    async cancelJob(jobId: string, token: string): Promise<void> {
        try {
            await api.delete(`/ai/jobs/${jobId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to cancel job'));
        }
    },

    /**
     * Accept AI result and apply to entity
     */
    async acceptResult(
        jobId: string,
        applyChanges: boolean,
        token: string
    ): Promise<{ applied: boolean }> {
        try {
            const { data } = await api.post(
                `/ai/results/${jobId}/accept`,
                { applyChanges },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to accept result'));
        }
    },

    /**
     * Reject AI result
     */
    async rejectResult(
        jobId: string,
        reason: string,
        token: string
    ): Promise<void> {
        try {
            await api.post(
                `/ai/results/${jobId}/reject`,
                { reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to reject result'));
        }
    },
};

export default aiQueueApi;
