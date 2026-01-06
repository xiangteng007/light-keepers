/**
 * Task Dispatch API Service
 */

const API_URL = import.meta.env.VITE_API_URL || '';

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
        const res = await fetch(`${API_URL}/tasks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(input),
        });
        if (!res.ok) throw new Error(`Failed to create task: ${res.status}`);
        return res.json();
    },

    /**
     * Get tasks for a mission
     */
    async getTasks(
        missionSessionId: string,
        token: string,
        filters?: { status?: TaskStatus; priority?: TaskPriority }
    ): Promise<DispatchTask[]> {
        const params = new URLSearchParams({ missionSessionId });
        if (filters?.status) params.set('status', filters.status);
        if (filters?.priority !== undefined) params.set('priority', String(filters.priority));

        const res = await fetch(`${API_URL}/tasks?${params}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to get tasks: ${res.status}`);
        return res.json();
    },

    /**
     * Get tasks assigned to current user
     */
    async getMyTasks(token: string): Promise<DispatchTask[]> {
        const res = await fetch(`${API_URL}/tasks/my`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to get my tasks: ${res.status}`);
        return res.json();
    },

    /**
     * Get a single task
     */
    async getTask(taskId: string, token: string): Promise<DispatchTask> {
        const res = await fetch(`${API_URL}/tasks/${taskId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to get task: ${res.status}`);
        return res.json();
    },

    /**
     * Assign task to volunteers
     */
    async assignTask(
        taskId: string,
        volunteerIds: string[],
        token: string
    ): Promise<TaskAssignment[]> {
        const res = await fetch(`${API_URL}/tasks/${taskId}/assign`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ volunteerIds }),
        });
        if (!res.ok) throw new Error(`Failed to assign task: ${res.status}`);
        return res.json();
    },

    /**
     * Accept a task
     */
    async acceptTask(taskId: string, token: string, note?: string): Promise<TaskAssignment> {
        const res = await fetch(`${API_URL}/tasks/${taskId}/accept`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ note }),
        });
        if (!res.ok) throw new Error(`Failed to accept task: ${res.status}`);
        return res.json();
    },

    /**
     * Decline a task
     */
    async declineTask(taskId: string, reason: string, token: string): Promise<TaskAssignment> {
        const res = await fetch(`${API_URL}/tasks/${taskId}/decline`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ reason }),
        });
        if (!res.ok) throw new Error(`Failed to decline task: ${res.status}`);
        return res.json();
    },

    /**
     * Start working on a task
     */
    async startTask(taskId: string, token: string): Promise<DispatchTask> {
        const res = await fetch(`${API_URL}/tasks/${taskId}/start`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to start task: ${res.status}`);
        return res.json();
    },

    /**
     * Complete a task
     */
    async completeTask(taskId: string, token: string, notes?: string): Promise<DispatchTask> {
        const res = await fetch(`${API_URL}/tasks/${taskId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ notes }),
        });
        if (!res.ok) throw new Error(`Failed to complete task: ${res.status}`);
        return res.json();
    },

    /**
     * Cancel a task
     */
    async cancelTask(taskId: string, token: string, reason?: string): Promise<DispatchTask> {
        const params = reason ? `?reason=${encodeURIComponent(reason)}` : '';
        const res = await fetch(`${API_URL}/tasks/${taskId}${params}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to cancel task: ${res.status}`);
        return res.json();
    },

    /**
     * Get task statistics
     */
    async getStats(missionSessionId: string, token: string): Promise<TaskStats> {
        const res = await fetch(`${API_URL}/tasks/stats/${missionSessionId}`, {
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error(`Failed to get stats: ${res.status}`);
        return res.json();
    },
};

export default taskDispatchApi;
