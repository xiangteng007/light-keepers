import api from './client';

// Health
export const getHealth = () => api.get('/health');

// Auth
export const login = (email: string, password: string) =>
    api.post('/auth/login', { email, password });

export const register = (data: { email: string; password: string; displayName?: string }) =>
    api.post('/auth/register', data);

export const getProfile = () => api.get('/auth/me');

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
    api.get<{ data: Event[]; total: number }>('/events', { params });

export const getEventStats = () =>
    api.get<{ active: number; resolved: number; bySeverity: Array<{ severity: number; count: number }> }>('/events/stats');

export const createEvent = (data: Partial<Event>) =>
    api.post<Event>('/events', data);

export const updateEvent = (id: string, data: Partial<Event>) =>
    api.put<Event>(`/events/${id}`, data);

// Tasks
export interface Task {
    id: string;
    title: string;
    description?: string;
    priority: number;
    status: string;
    createdAt: string;
    dueAt?: string;
    completedAt?: string;
}

export const getTasks = (params?: { status?: string; limit?: number }) =>
    api.get<{ data: Task[]; total: number }>('/tasks', { params });

export const getTaskKanban = () =>
    api.get<{ pending: Task[]; inProgress: Task[]; completed: Task[] }>('/tasks/kanban');

export const getTaskStats = () =>
    api.get<{ pending: number; inProgress: number; completed: number; overdue: number }>('/tasks/stats');

export const createTask = (data: Partial<Task>) =>
    api.post<Task>('/tasks', data);

export const updateTask = (id: string, data: Partial<Task>) =>
    api.put<Task>(`/tasks/${id}`, data);

// Accounts
export const getRoles = () => api.get('/accounts/roles');
