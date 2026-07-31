/**
 * Task Dispatch API Service
 */

import api from '../api/client';
import { getApiErrorMessage } from '../api/errors';

// Constants (using const objects for erasableSyntaxOnly compatibility)
export const TaskPriority = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
    CRITICAL: 3,
    EMERGENCY: 4,
} as const;
export type TaskPriority = typeof TaskPriority[keyof typeof TaskPriority];

export const TaskStatus = {
    DRAFT: 'draft',
    PENDING: 'pending',
    ASSIGNED: 'assigned',
    ACCEPTED: 'accepted',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;
export type TaskStatus = typeof TaskStatus[keyof typeof TaskStatus];

export const TaskCategory = {
    RESCUE: 'rescue',
    MEDICAL: 'medical',
    LOGISTICS: 'logistics',
    COMMUNICATION: 'communication',
    EVACUATION: 'evacuation',
    ASSESSMENT: 'assessment',
    OTHER: 'other',
} as const;
export type TaskCategory = typeof TaskCategory[keyof typeof TaskCategory];

export const AssignmentStatus = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    DECLINED: 'declined',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
} as const;
export type AssignmentStatus = typeof AssignmentStatus[keyof typeof AssignmentStatus];

// Types
export interface DispatchTask {
    id: string;
    missionSessionId: string;
    title: string;
    description?: string;
    category: TaskCategory;
    priority: TaskPriority;
    status: TaskStatus;
    sourceReportId?: string;
    sourceAiJobId?: string;
    location?: GeoJSON.Point;
    locationDescription?: string;
    requiredSkills: string[];
    requiredResources: string[];
    estimatedDurationMin?: number;
    dueAt?: string;
    startedAt?: string;
    completedAt?: string;
    createdBy: string;
    assignments: TaskAssignment[];
    createdAt: string;
    updatedAt: string;
}

export interface TaskAssignment {
    id: string;
    taskId: string;
    volunteerId: string;
    volunteerName: string;
    status: AssignmentStatus;
    assignedBy: string;
    assignedAt: string;
    respondedAt?: string;
    completedAt?: string;
    declineReason?: string;
    completionNotes?: string;
}

export interface CreateTaskInput {
    missionSessionId: string;
    title: string;
    description?: string;
    category?: TaskCategory;
    priority?: TaskPriority;
    sourceReportId?: string;
    sourceAiJobId?: string;
    location?: { latitude: number; longitude: number };
    locationDescription?: string;
    requiredSkills?: string[];
    requiredResources?: string[];
    estimatedDurationMin?: number;
    dueAt?: string;
}

export interface TaskStats {
    total: number;
    byStatus: Record<TaskStatus, number>;
    byPriority: Record<TaskPriority, number>;
}

// API Functions
export const taskDispatchApi = {
    /**
     * Create a new task
     */
    async createTask(input: CreateTaskInput, token: string): Promise<DispatchTask> {
        try {
            const { data } = await api.post<DispatchTask>('/tasks', input, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to create task'));
        }
    },

    /**
     * Get tasks for a mission
     */
    async getTasks(
        missionSessionId: string,
        token: string,
        filters?: { status?: TaskStatus; priority?: TaskPriority }
    ): Promise<DispatchTask[]> {
        try {
            const { data } = await api.get<DispatchTask[]>('/tasks', {
                params: {
                    missionSessionId,
                    status: filters?.status,
                    priority: filters?.priority,
                },
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to get tasks'));
        }
    },

    /**
     * Get tasks assigned to current user
     */
    async getMyTasks(token: string): Promise<DispatchTask[]> {
        try {
            const { data } = await api.get<DispatchTask[]>('/tasks/my', {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to get my tasks'));
        }
    },

    /**
     * Get a single task
     */
    async getTask(taskId: string, token: string): Promise<DispatchTask> {
        try {
            const { data } = await api.get<DispatchTask>(`/tasks/${taskId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to get task'));
        }
    },

    /**
     * Assign task to volunteers
     */
    async assignTask(
        taskId: string,
        volunteerIds: string[],
        token: string
    ): Promise<TaskAssignment[]> {
        try {
            const { data } = await api.post<TaskAssignment[]>(
                `/tasks/${taskId}/assign`,
                { volunteerIds },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to assign task'));
        }
    },

    /**
     * Accept a task
     */
    async acceptTask(taskId: string, token: string, note?: string): Promise<TaskAssignment> {
        try {
            const { data } = await api.post<TaskAssignment>(
                `/tasks/${taskId}/accept`,
                { note },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to accept task'));
        }
    },

    /**
     * Decline a task
     */
    async declineTask(taskId: string, reason: string, token: string): Promise<TaskAssignment> {
        try {
            const { data } = await api.post<TaskAssignment>(
                `/tasks/${taskId}/decline`,
                { reason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to decline task'));
        }
    },

    /**
     * Start working on a task
     */
    async startTask(taskId: string, token: string): Promise<DispatchTask> {
        try {
            const { data } = await api.post<DispatchTask>(
                `/tasks/${taskId}/start`,
                undefined,
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to start task'));
        }
    },

    /**
     * Complete a task
     */
    async completeTask(taskId: string, token: string, notes?: string): Promise<DispatchTask> {
        try {
            const { data } = await api.post<DispatchTask>(
                `/tasks/${taskId}/complete`,
                { notes },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to complete task'));
        }
    },

    /**
     * Cancel a task
     */
    async cancelTask(taskId: string, token: string, reason?: string): Promise<DispatchTask> {
        try {
            const { data } = await api.delete<DispatchTask>(`/tasks/${taskId}`, {
                params: reason ? { reason } : undefined,
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to cancel task'));
        }
    },

    /**
     * Get task statistics
     */
    async getStats(missionSessionId: string, token: string): Promise<TaskStats> {
        try {
            const { data } = await api.get<TaskStats>(`/tasks/stats/${missionSessionId}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            return data;
        } catch (err) {
            throw new Error(getApiErrorMessage(err, 'Failed to get stats'));
        }
    },
};

export default taskDispatchApi;
