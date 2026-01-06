/**
 * AI Queue API Service
 * Handles REST API calls for AI Queue operations
 */

const API_URL = import.meta.env.VITE_API_URL || '';

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
        const res = await fetch(`${API_URL}/ai/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                missionSessionId,
                useCaseId,
                entityType,
                entityId,
                priority,
            }),
        });
        if (!res.ok) {
            const error = await res.json().catch(() => ({}));
            throw new Error(error.message || `Failed to create AI job: ${res.status}`);
        }
        return res.json();
    },

    /**
     * Get AI job status
     */
    async getJobStatus(jobId: string, token: string): Promise<AiJob> {
        const res = await fetch(`${API_URL}/ai/jobs/${jobId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to get job status: ${res.status}`);
        return res.json();
    },

    /**
     * Cancel an AI job
     */
    async cancelJob(jobId: string, token: string): Promise<void> {
        const res = await fetch(`${API_URL}/ai/jobs/${jobId}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to cancel job: ${res.status}`);
    },

    /**
     * Accept AI result and apply to entity
     */
    async acceptResult(
        jobId: string,
        applyChanges: boolean,
        token: string
    ): Promise<{ applied: boolean }> {
        const res = await fetch(`${API_URL}/ai/results/${jobId}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ applyChanges }),
        });
        if (!res.ok) throw new Error(`Failed to accept result: ${res.status}`);
        return res.json();
    },

    /**
     * Reject AI result
     */
    async rejectResult(
        jobId: string,
        reason: string,
        token: string
    ): Promise<void> {
        const res = await fetch(`${API_URL}/ai/results/${jobId}/reject`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ reason }),
        });
        if (!res.ok) throw new Error(`Failed to reject result: ${res.status}`);
    },
};

export default aiQueueApi;
