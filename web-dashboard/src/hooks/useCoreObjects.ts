/**
 * useCoreObjects.ts
 * 
 * P8: Frontend API Hooks for Core Objects
 * 
 * Provides consistent data fetching and mutation hooks for:
 * - Alert, Incident, Task, Resource, Person, Comms
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Alert,
    Incident,
    Task,
    Resource,
    Person,
    Comms,
    IncidentStatus,
    TaskStatus,
} from '../types/core-objects.types';

const API_BASE = import.meta.env.VITE_API_URL || '';

// ============================================================
// Generic Fetch Helpers
// ============================================================

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
        credentials: 'include',
        ...options,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.message || `API Error: ${response.status}`);
    }

    return response.json();
}

// ============================================================
// Alert Hooks
// ============================================================

export function useAlerts(params?: { severity?: string; category?: string }) {
    const queryParams = new URLSearchParams(params as Record<string, string>).toString();
    return useQuery({
        queryKey: ['alerts', params],
        queryFn: () => fetchApi<{ data: Alert[]; total: number }>(
            `/api/alerts${queryParams ? `?${queryParams}` : ''}`
        ),
        staleTime: 30000, // 30 seconds
    });
}

export function useAlert(id: string) {
    return useQuery({
        queryKey: ['alert', id],
        queryFn: () => fetchApi<Alert>(`/api/alerts/${id}`),
        enabled: !!id,
    });
}

// ============================================================
// Incident Hooks
// ============================================================

export function useIncidents(params?: {
    status?: IncidentStatus;
    priority?: number;
    sessionId?: string;
}) {
    const queryParams = new URLSearchParams(
        Object.entries(params || {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
    ).toString();

    return useQuery({
        queryKey: ['incidents', params],
        queryFn: () => fetchApi<{ data: Incident[]; total: number }>(
            `/api/incidents${queryParams ? `?${queryParams}` : ''}`
        ),
        staleTime: 10000, // 10 seconds - incidents change frequently
    });
}

export function useIncident(id: string) {
    return useQuery({
        queryKey: ['incident', id],
        queryFn: () => fetchApi<Incident>(`/api/incidents/${id}`),
        enabled: !!id,
    });
}

export function useCreateIncident() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<Incident>) =>
            fetchApi<Incident>('/api/incidents', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
        },
    });
}

export function useUpdateIncidentStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: IncidentStatus }) =>
            fetchApi<Incident>(`/api/incidents/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['incidents'] });
            queryClient.invalidateQueries({ queryKey: ['incident', id] });
        },
    });
}

// ============================================================
// Task Hooks
// ============================================================

export function useTasks(params?: {
    incidentId?: string;
    status?: TaskStatus;
    assignedToMe?: boolean;
}) {
    const queryParams = new URLSearchParams(
        Object.entries(params || {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
    ).toString();

    return useQuery({
        queryKey: ['tasks', params],
        queryFn: () => fetchApi<{ data: Task[]; total: number }>(
            `/api/tasks${queryParams ? `?${queryParams}` : ''}`
        ),
        staleTime: 10000,
    });
}

export function useTask(id: string) {
    return useQuery({
        queryKey: ['task', id],
        queryFn: () => fetchApi<Task>(`/api/tasks/${id}`),
        enabled: !!id,
    });
}

export function useCreateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<Task>) =>
            fetchApi<Task>('/api/tasks', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
        },
    });
}

export function useUpdateTaskStatus() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, status }: { id: string; status: TaskStatus }) =>
            fetchApi<Task>(`/api/tasks/${id}/status`, {
                method: 'PATCH',
                body: JSON.stringify({ status }),
            }),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['task', id] });
        },
    });
}

// ============================================================
// Resource Hooks
// ============================================================

export function useResources(params?: {
    category?: string;
    status?: string;
    warehouseId?: string;
}) {
    const queryParams = new URLSearchParams(
        Object.entries(params || {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
    ).toString();

    return useQuery({
        queryKey: ['resources', params],
        queryFn: () => fetchApi<{ data: Resource[]; total: number }>(
            `/api/resources${queryParams ? `?${queryParams}` : ''}`
        ),
        staleTime: 60000, // 1 minute
    });
}

export function useResource(id: string) {
    return useQuery({
        queryKey: ['resource', id],
        queryFn: () => fetchApi<Resource>(`/api/resources/${id}`),
        enabled: !!id,
    });
}

// ============================================================
// Person Hooks
// ============================================================

export function usePersonnel(params?: {
    role?: string;
    availability?: string;
    teamId?: string;
}) {
    const queryParams = new URLSearchParams(
        Object.entries(params || {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
    ).toString();

    return useQuery({
        queryKey: ['personnel', params],
        queryFn: () => fetchApi<{ data: Person[]; total: number }>(
            `/api/personnel${queryParams ? `?${queryParams}` : ''}`
        ),
        staleTime: 30000,
    });
}

export function usePerson(id: string) {
    return useQuery({
        queryKey: ['person', id],
        queryFn: () => fetchApi<Person>(`/api/personnel/${id}`),
        enabled: !!id,
    });
}

export function useUpdateLocation() {
    return useMutation({
        mutationFn: ({ id, location }: {
            id: string;
            location: { latitude: number; longitude: number }
        }) =>
            fetchApi<Person>(`/api/personnel/${id}/location`, {
                method: 'PATCH',
                body: JSON.stringify(location),
            }),
    });
}

// ============================================================
// Comms Hooks
// ============================================================

export function useComms(params?: {
    channel?: string;
    incidentId?: string;
    recipientId?: string;
}) {
    const queryParams = new URLSearchParams(
        Object.entries(params || {})
            .filter(([, v]) => v !== undefined)
            .map(([k, v]) => [k, String(v)])
    ).toString();

    return useQuery({
        queryKey: ['comms', params],
        queryFn: () => fetchApi<{ data: Comms[]; total: number }>(
            `/api/comms${queryParams ? `?${queryParams}` : ''}`
        ),
        staleTime: 5000, // 5 seconds - comms are time-sensitive
    });
}

export function useSendComms() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: Partial<Comms>) =>
            fetchApi<Comms>('/api/comms', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['comms'] });
        },
    });
}
