import api from '../client';

// Events
export interface Event {
    id: string;
    title: string;
    description?: string;
    category?: string;
    severity?: number;
    status: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    createdAt: string;
}

export const getEvents = (params?: { status?: string; category?: string; limit?: number }) =>
    api.get<{ success: boolean; data: Event[]; total: number }>('/events', { params });

export const getEventStats = () =>
    api.get<{ success: boolean; data: { active: number; resolved: number; bySeverity: Array<{ severity: number; count: number }> } }>('/events/stats');

export const createEvent = (data: Partial<Event>) =>
    api.post<Event>('/events', data);

export const updateEvent = (id: string, data: Partial<Event>) =>
    api.put<Event>(`/events/${id}`, data);

// Tasks
export interface Task {
    id: string;
    title: string;
    description?: string;
    eventId?: string;
    priority: number;
    status: string;
    assignedTo?: string;
    createdAt: string;
    dueAt?: string;
    completedAt?: string;
}

export const getTasks = (params?: { status?: string; limit?: number }) =>
    api.get<{ data: Task[]; total: number }>('/tasks', { params });

export const getTaskKanban = () =>
    api.get<{ success: boolean; data: { pending: Task[]; inProgress: Task[]; completed: Task[] } }>('/tasks/kanban');

export const getTaskStats = () =>
    api.get<{ success: boolean; data: { pending: number; inProgress: number; completed: number; overdue: number } }>('/tasks/stats');

export const createTask = (data: Partial<Task>) =>
    api.post<Task>('/tasks', data);

export const updateTask = (id: string, data: Partial<Task>) =>
    api.put<Task>(`/tasks/${id}`, data);

// 刪除任務
export const deleteTask = (id: string) =>
    api.delete<{ success: boolean; message: string }>(`/tasks/${id}`);
