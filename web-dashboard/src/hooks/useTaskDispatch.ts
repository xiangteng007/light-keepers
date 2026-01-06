import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { taskDispatchApi } from '../services/taskDispatchApi';
import type {
    DispatchTask,
    TaskAssignment,
    CreateTaskInput,
} from '../services/taskDispatchApi';

const WS_URL = import.meta.env.VITE_WS_URL || '';

interface UseTaskDispatchOptions {
    missionSessionId: string;
    token: string;
    userId: string;
    enabled?: boolean;
}

interface UseTaskDispatchReturn {
    // State
    tasks: DispatchTask[];
    myTasks: DispatchTask[];
    isLoading: boolean;
    isConnected: boolean;
    error: string | null;

    // Actions
    createTask: (input: Omit<CreateTaskInput, 'missionSessionId'>) => Promise<DispatchTask>;
    assignTask: (taskId: string, volunteerIds: string[]) => Promise<TaskAssignment[]>;
    acceptTask: (taskId: string, note?: string) => Promise<TaskAssignment>;
    declineTask: (taskId: string, reason: string) => Promise<TaskAssignment>;
    startTask: (taskId: string) => Promise<DispatchTask>;
    completeTask: (taskId: string, notes?: string) => Promise<DispatchTask>;
    cancelTask: (taskId: string, reason?: string) => Promise<DispatchTask>;
    refresh: () => Promise<void>;
}

/**
 * Hook for managing Task Dispatch with real-time updates
 */
export function useTaskDispatch({
    missionSessionId,
    token,
    userId,
    enabled = true,
}: UseTaskDispatchOptions): UseTaskDispatchReturn {
    const [tasks, setTasks] = useState<DispatchTask[]>([]);
    const [myTasks, setMyTasks] = useState<DispatchTask[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const socketRef = useRef<Socket | null>(null);

    // Fetch tasks
    const fetchTasks = useCallback(async () => {
        if (!token || !missionSessionId) return;

        setIsLoading(true);
        try {
            const [allTasks, userTasks] = await Promise.all([
                taskDispatchApi.getTasks(missionSessionId, token),
                taskDispatchApi.getMyTasks(token),
            ]);
            setTasks(allTasks);
            setMyTasks(userTasks);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch tasks');
        } finally {
            setIsLoading(false);
        }
    }, [missionSessionId, token]);

    // Initial fetch
    useEffect(() => {
        if (enabled && token && missionSessionId) {
            fetchTasks();
        }
    }, [enabled, token, missionSessionId, fetchTasks]);

    // Socket.IO connection
    useEffect(() => {
        if (!enabled || !missionSessionId || !token || !userId) return;

        const socket = io(`${WS_URL}/task-dispatch`, {
            auth: { token },
            transports: ['websocket'],
        });

        socket.on('connect', () => {
            setIsConnected(true);
            socket.emit('task:register', { userId, missionSessionId });
        });

        socket.on('disconnect', () => {
            setIsConnected(false);
        });

        // Task events
        socket.on('task:created', ({ task }: { task: DispatchTask }) => {
            setTasks((prev) => [task, ...prev]);
        });

        socket.on('task:updated', ({ task }: { task: DispatchTask }) => {
            setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
            setMyTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
        });

        socket.on('task:assigned', ({ task }: { task: DispatchTask }) => {
            setMyTasks((prev) => {
                const exists = prev.some((t) => t.id === task.id);
                return exists ? prev : [task, ...prev];
            });
        });

        socket.on('task:completed', ({ task }: { task: DispatchTask }) => {
            setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
            setMyTasks((prev) => prev.filter((t) => t.id !== task.id));
        });

        socket.on('task:cancelled', ({ taskId }: { taskId: string }) => {
            setTasks((prev) => prev.filter((t) => t.id !== taskId));
            setMyTasks((prev) => prev.filter((t) => t.id !== taskId));
        });

        socketRef.current = socket;

        return () => {
            socket.disconnect();
            socketRef.current = null;
        };
    }, [missionSessionId, token, userId, enabled]);

    // Actions
    const createTask = useCallback(
        async (input: Omit<CreateTaskInput, 'missionSessionId'>): Promise<DispatchTask> => {
            const task = await taskDispatchApi.createTask(
                { ...input, missionSessionId },
                token
            );
            setTasks((prev) => [task, ...prev]);
            return task;
        },
        [missionSessionId, token]
    );

    const assignTask = useCallback(
        async (taskId: string, volunteerIds: string[]): Promise<TaskAssignment[]> => {
            return taskDispatchApi.assignTask(taskId, volunteerIds, token);
        },
        [token]
    );

    const acceptTask = useCallback(
        async (taskId: string, note?: string): Promise<TaskAssignment> => {
            const assignment = await taskDispatchApi.acceptTask(taskId, token, note);
            // Refresh to get updated task
            await fetchTasks();
            return assignment;
        },
        [token, fetchTasks]
    );

    const declineTask = useCallback(
        async (taskId: string, reason: string): Promise<TaskAssignment> => {
            const assignment = await taskDispatchApi.declineTask(taskId, reason, token);
            setMyTasks((prev) => prev.filter((t) => t.id !== taskId));
            return assignment;
        },
        [token]
    );

    const startTask = useCallback(
        async (taskId: string): Promise<DispatchTask> => {
            const task = await taskDispatchApi.startTask(taskId, token);
            setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
            setMyTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
            return task;
        },
        [token]
    );

    const completeTask = useCallback(
        async (taskId: string, notes?: string): Promise<DispatchTask> => {
            const task = await taskDispatchApi.completeTask(taskId, token, notes);
            setTasks((prev) => prev.map((t) => (t.id === task.id ? task : t)));
            setMyTasks((prev) => prev.filter((t) => t.id !== task.id));
            return task;
        },
        [token]
    );

    const cancelTask = useCallback(
        async (taskId: string, reason?: string): Promise<DispatchTask> => {
            const task = await taskDispatchApi.cancelTask(taskId, token, reason);
            setTasks((prev) => prev.filter((t) => t.id !== task.id));
            setMyTasks((prev) => prev.filter((t) => t.id !== task.id));
            return task;
        },
        [token]
    );

    return {
        tasks,
        myTasks,
        isLoading,
        isConnected,
        error,
        createTask,
        assignTask,
        acceptTask,
        declineTask,
        startTask,
        completeTask,
        cancelTask,
        refresh: fetchTasks,
    };
}

export default useTaskDispatch;
