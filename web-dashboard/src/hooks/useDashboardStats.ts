/**
 * useDashboardStats Hook
 * Fetches real-time dashboard statistics for Emergency Response
 */

import { useState, useEffect, useCallback } from 'react';
import api from '../api/client';

export interface DashboardStats {
    timestamp: string;
    fieldReports: {
        total: number;
        last24h: number;
        byStatus: Record<string, number>;
        byType: Record<string, number>;
        bySeverity: Record<number, number>;
        trendHourly: { hour: string; count: number }[];
    };
    sosSignals: {
        total: number;
        active: number;
        acknowledged: number;
        resolved: number;
        avgResponseMinutes: number | null;
        trendHourly: { hour: string; count: number }[];
    };
    tasks: {
        total: number;
        pending: number;
        inProgress: number;
        completed: number;
        overdue: number;
        completionRate: number;
    };
    recentActivity: {
        id: string;
        type: 'report' | 'sos' | 'task';
        action: string;
        description: string;
        timestamp: string;
        severity?: number;
    }[];
}

export interface TimeSeriesData {
    label: string;
    data: { timestamp: string; value: number }[];
}

export interface UseDashboardStatsReturn {
    stats: DashboardStats | null;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    getTimeSeries: (
        metric: 'reports' | 'sos' | 'tasks',
        start: Date,
        end: Date,
        interval?: 'hour' | 'day'
    ) => Promise<TimeSeriesData | null>;
    getSeverityTrend: (days?: number) => Promise<Record<number, TimeSeriesData> | null>;
    getTopReporters: (limit?: number) => Promise<{ name: string; count: number }[] | null>;
}

export function useDashboardStats(missionSessionId?: string): UseDashboardStatsReturn {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);

            const params = missionSessionId ? { missionSessionId } : {};
            const response = await api.get('/analytics/dashboard/stats', { params });

            if (response.data.success) {
                setStats(response.data.data);
            } else {
                throw new Error('Failed to fetch dashboard stats');
            }
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    }, [missionSessionId]);

    useEffect(() => {
        fetchStats();

        // Auto-refresh every 30 seconds
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    const getTimeSeries = useCallback(async (
        metric: 'reports' | 'sos' | 'tasks',
        start: Date,
        end: Date,
        interval: 'hour' | 'day' = 'hour'
    ): Promise<TimeSeriesData | null> => {
        if (!missionSessionId) return null;

        try {
            const response = await api.get('/analytics/dashboard/time-series', {
                params: {
                    missionSessionId,
                    metric,
                    start: start.toISOString(),
                    end: end.toISOString(),
                    interval,
                },
            });
            return response.data.success ? response.data.data : null;
        } catch {
            return null;
        }
    }, [missionSessionId]);

    const getSeverityTrend = useCallback(async (days: number = 7): Promise<Record<number, TimeSeriesData> | null> => {
        if (!missionSessionId) return null;

        try {
            const response = await api.get('/analytics/dashboard/severity-trend', {
                params: { missionSessionId, days },
            });
            return response.data.success ? response.data.data : null;
        } catch {
            return null;
        }
    }, [missionSessionId]);

    const getTopReporters = useCallback(async (limit: number = 10): Promise<{ name: string; count: number }[] | null> => {
        if (!missionSessionId) return null;

        try {
            const response = await api.get('/analytics/dashboard/top-reporters', {
                params: { missionSessionId, limit },
            });
            return response.data.success ? response.data.data : null;
        } catch {
            return null;
        }
    }, [missionSessionId]);

    return {
        stats,
        loading,
        error,
        refresh: fetchStats,
        getTimeSeries,
        getSeverityTrend,
        getTopReporters,
    };
}

export default useDashboardStats;
