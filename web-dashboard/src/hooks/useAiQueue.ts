import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { aiQueueApi, type ReportSummaryOutput, type AiJobStatus } from '../services/aiQueueApi';

const WS_URL = import.meta.env.VITE_WS_URL || '';

interface UseAiQueueOptions {
    missionSessionId: string;
    token: string;
    enabled?: boolean;
}

interface AiJobState {
    jobId: string;
    entityId: string;
    status: AiJobStatus;
    createdAt: string;
}

interface AiResultState {
    jobId: string;
    entityId: string;
    output: ReportSummaryOutput;
    isFallback: boolean;
    canAccept: boolean;
}

interface UseAiQueueReturn {
    // State - keyed by entityId (e.g. reportId)
    pendingJobs: Map<string, AiJobState>;
    results: Map<string, AiResultState>;
    isConnected: boolean;
    error: string | null;

    // Actions
    summarizeReport: (reportId: string) => Promise<string>; // returns jobId
    acceptResult: (entityId: string, applyChanges?: boolean) => Promise<void>;
    rejectResult: (entityId: string, reason?: string) => Promise<void>;
    clearResult: (entityId: string) => void;
}

/**
 * Hook for managing AI Queue operations with real-time updates
 */
export function useAiQueue({
    missionSessionId,
    token,
    enabled = true,
}: UseAiQueueOptions): UseAiQueueReturn {
    const [pendingJobs, setPendingJobs] = useState<Map<string, AiJobState>>(new Map());
    const [results, setResults] = useState<Map<string, AiResultState>>(new Map());
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);

    // Socket.IO connection for real-time AI result updates
    useEffect(() => {
        if (!enabled || !missionSessionId || !token) return;

        const socket = io(`${WS_URL}/ai-queue`, {
            auth: { token },
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            setIsConnected(true);
            // Join mission room to receive AI results
            socket.emit('ai:join-mission', { missionSessionId });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // AI result ready event
        socket.on('ai:result-ready', (data: {
            jobId: string;
            useCaseId: string;
            entityId: string;
            outputJson: ReportSummaryOutput;
            canAccept: boolean;
            isFallback: boolean;
        }) => {
            // Move from pending to results
            setPendingJobs(prev => {
                const next = new Map(prev);
                next.delete(data.entityId);
                return next;
            });

            setResults(prev => {
                const next = new Map(prev);
                next.set(data.entityId, {
                    jobId: data.jobId,
                    entityId: data.entityId,
                    output: data.outputJson,
                    isFallback: data.isFallback,
                    canAccept: data.canAccept,
                });
                return next;
            });
        });

        // AI job failed event
        socket.on('ai:job-failed', (data: {
            jobId: string;
            entityId: string;
            errorCode: string;
            errorMessage?: string;
        }) => {
            // Remove from pending
            setPendingJobs(prev => {
                const next = new Map(prev);
                next.delete(data.entityId);
                return next;
            });

            // Set error
            setError(`AI 分析失敗: ${data.errorMessage || data.errorCode}`);
        });

        socketRef.current = socket;

        return () => {
            socket.emit('ai:leave-mission', { missionSessionId });
            socket.disconnect();
            socketRef.current = null;
        };
    }, [missionSessionId, token, enabled]);

    // Summarize a report using AI
    const summarizeReport = useCallback(async (reportId: string): Promise<string> => {
        if (!token) throw new Error('Not authenticated');
        if (!missionSessionId) throw new Error('No mission session');

        setError(null);

        try {
            const response = await aiQueueApi.createJob(
                missionSessionId,
                'report.summarize.v1',
                'report',
                reportId,
                token
            );

            // Add to pending jobs
            setPendingJobs(prev => {
                const next = new Map(prev);
                next.set(reportId, {
                    jobId: response.jobId,
                    entityId: reportId,
                    status: response.status,
                    createdAt: new Date().toISOString(),
                });
                return next;
            });

            return response.jobId;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to create AI job';
            setError(message);
            throw err;
        }
    }, [missionSessionId, token]);

    // Accept AI result
    const acceptResult = useCallback(async (entityId: string, applyChanges = true): Promise<void> => {
        const result = results.get(entityId);
        if (!result) throw new Error('Result not found');
        if (!token) throw new Error('Not authenticated');

        await aiQueueApi.acceptResult(result.jobId, applyChanges, token);

        // Remove from results
        setResults(prev => {
            const next = new Map(prev);
            next.delete(entityId);
            return next;
        });
    }, [results, token]);

    // Reject AI result
    const rejectResult = useCallback(async (entityId: string, reason = 'User rejected'): Promise<void> => {
        const result = results.get(entityId);
        if (!result) throw new Error('Result not found');
        if (!token) throw new Error('Not authenticated');

        await aiQueueApi.rejectResult(result.jobId, reason, token);

        // Remove from results
        setResults(prev => {
            const next = new Map(prev);
            next.delete(entityId);
            return next;
        });
    }, [results, token]);

    // Clear result without API call (for dismissing)
    const clearResult = useCallback((entityId: string): void => {
        setResults(prev => {
            const next = new Map(prev);
            next.delete(entityId);
            return next;
        });
    }, []);

    return {
        pendingJobs,
        results,
        isConnected,
        error,
        summarizeReport,
        acceptResult,
        rejectResult,
        clearResult,
    };
}

export default useAiQueue;
