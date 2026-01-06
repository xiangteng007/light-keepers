/**
 * Scheduler Service
 * Manages scheduled/cron tasks dynamically
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { CacheService } from '../cache/cache.service';

export interface ScheduledTask {
    id: string;
    name: string;
    description?: string;
    cronExpression: string;
    enabled: boolean;
    lastRun?: Date;
    nextRun?: Date;
    runCount: number;
    lastError?: string;
    handler: string; // Reference to handler function
    metadata?: Record<string, any>;
    createdAt: Date;
}

export interface TaskResult {
    success: boolean;
    duration: number;
    error?: string;
    output?: any;
}

type TaskHandler = () => Promise<TaskResult>;

@Injectable()
export class SchedulerService implements OnModuleInit {
    private readonly logger = new Logger(SchedulerService.name);
    private readonly TASKS_KEY = 'scheduler:tasks';
    private readonly handlers = new Map<string, TaskHandler>();
    private tasksCache: ScheduledTask[] = [];

    constructor(
        private schedulerRegistry: SchedulerRegistry,
        private cache: CacheService,
    ) { }

    async onModuleInit(): Promise<void> {
        await this.loadTasks();
        this.registerBuiltInHandlers();
        await this.startAllEnabledTasks();
    }

    // ==================== Handler Registration ====================

    /**
     * Register a task handler
     */
    registerHandler(name: string, handler: TaskHandler): void {
        this.handlers.set(name, handler);
        this.logger.log(`Registered task handler: ${name}`);
    }

    /**
     * Get available handlers
     */
    getAvailableHandlers(): string[] {
        return Array.from(this.handlers.keys());
    }

    // ==================== Task Management ====================

    /**
     * Create a new scheduled task
     */
    async createTask(task: Omit<ScheduledTask, 'id' | 'createdAt' | 'runCount' | 'lastRun' | 'nextRun'>): Promise<ScheduledTask> {
        const newTask: ScheduledTask = {
            ...task,
            id: `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date(),
            runCount: 0,
        };

        this.tasksCache.push(newTask);
        await this.saveTasks();

        if (newTask.enabled) {
            this.scheduleTask(newTask);
        }

        this.logger.log(`Created scheduled task: ${newTask.name}`);
        return newTask;
    }

    /**
     * Get all tasks
     */
    async getAllTasks(): Promise<ScheduledTask[]> {
        return this.tasksCache;
    }

    /**
     * Get task by ID
     */
    async getTask(id: string): Promise<ScheduledTask | null> {
        return this.tasksCache.find(t => t.id === id) || null;
    }

    /**
     * Update a task
     */
    async updateTask(id: string, updates: Partial<ScheduledTask>): Promise<ScheduledTask | null> {
        const index = this.tasksCache.findIndex(t => t.id === id);
        if (index === -1) return null;

        const oldTask = this.tasksCache[index];
        const newTask = { ...oldTask, ...updates };
        this.tasksCache[index] = newTask;
        await this.saveTasks();

        // Reschedule if enabled status or cron changed
        this.stopTask(id);
        if (newTask.enabled) {
            this.scheduleTask(newTask);
        }

        return newTask;
    }

    /**
     * Delete a task
     */
    async deleteTask(id: string): Promise<boolean> {
        const index = this.tasksCache.findIndex(t => t.id === id);
        if (index === -1) return false;

        this.stopTask(id);
        this.tasksCache.splice(index, 1);
        await this.saveTasks();

        return true;
    }

    /**
     * Enable/disable a task
     */
    async setTaskEnabled(id: string, enabled: boolean): Promise<ScheduledTask | null> {
        return this.updateTask(id, { enabled });
    }

    /**
     * Run a task immediately
     */
    async runTaskNow(id: string): Promise<TaskResult> {
        const task = await this.getTask(id);
        if (!task) {
            return { success: false, duration: 0, error: 'Task not found' };
        }

        return this.executeTask(task);
    }

    // ==================== Task Execution ====================

    private scheduleTask(task: ScheduledTask): void {
        try {
            const job = new CronJob(task.cronExpression, async () => {
                await this.executeTask(task);
            });

            this.schedulerRegistry.addCronJob(task.id, job);
            job.start();

            // Update next run time
            const nextDate = job.nextDate();
            task.nextRun = nextDate ? nextDate.toJSDate() : undefined;

            this.logger.log(`Scheduled task: ${task.name} (${task.cronExpression})`);
        } catch (error) {
            this.logger.error(`Failed to schedule task ${task.name}:`, error);
        }
    }

    private stopTask(id: string): void {
        try {
            if (this.schedulerRegistry.doesExist('cron', id)) {
                this.schedulerRegistry.deleteCronJob(id);
            }
        } catch {
            // Ignore if not exists
        }
    }

    private async executeTask(task: ScheduledTask): Promise<TaskResult> {
        const startTime = Date.now();
        const handler = this.handlers.get(task.handler);

        if (!handler) {
            const error = `Handler not found: ${task.handler}`;
            this.updateTaskStatus(task.id, { lastError: error });
            return { success: false, duration: 0, error };
        }

        try {
            this.logger.log(`Executing task: ${task.name}`);
            const result = await handler();
            const duration = Date.now() - startTime;

            this.updateTaskStatus(task.id, {
                lastRun: new Date(),
                runCount: task.runCount + 1,
                lastError: result.success ? undefined : result.error,
            });

            this.logger.log(`Task ${task.name} completed in ${duration}ms`);
            return { ...result, duration };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = (error as Error).message;

            this.updateTaskStatus(task.id, {
                lastRun: new Date(),
                runCount: task.runCount + 1,
                lastError: errorMessage,
            });

            this.logger.error(`Task ${task.name} failed:`, error);
            return { success: false, duration, error: errorMessage };
        }
    }

    private async updateTaskStatus(id: string, updates: Partial<ScheduledTask>): Promise<void> {
        const index = this.tasksCache.findIndex(t => t.id === id);
        if (index !== -1) {
            this.tasksCache[index] = { ...this.tasksCache[index], ...updates };
            await this.saveTasks();
        }
    }

    // ==================== Built-in Handlers ====================

    private registerBuiltInHandlers(): void {
        // Health check handler
        this.registerHandler('health-check', async () => {
            return { success: true, duration: 0, output: { status: 'healthy' } };
        });

        // Cleanup old data handler
        this.registerHandler('cleanup-old-data', async () => {
            // Placeholder - implement actual cleanup logic
            return { success: true, duration: 0, output: { cleaned: 0 } };
        });

        // Sync external data handler
        this.registerHandler('sync-external-data', async () => {
            // Placeholder - implement actual sync logic
            return { success: true, duration: 0, output: { synced: 0 } };
        });

        // Generate daily report handler
        this.registerHandler('generate-daily-report', async () => {
            // Placeholder - implement report generation
            return { success: true, duration: 0, output: { reportId: null } };
        });
    }

    // ==================== Persistence ====================

    private async loadTasks(): Promise<void> {
        try {
            const tasks = await this.cache.get<ScheduledTask[]>(this.TASKS_KEY);
            this.tasksCache = tasks || [];
        } catch (error) {
            this.logger.error('Failed to load tasks', error);
            this.tasksCache = [];
        }
    }

    private async saveTasks(): Promise<void> {
        await this.cache.set(this.TASKS_KEY, this.tasksCache, { ttl: 0 });
    }

    private async startAllEnabledTasks(): Promise<void> {
        const enabledTasks = this.tasksCache.filter(t => t.enabled);
        for (const task of enabledTasks) {
            this.scheduleTask(task);
        }
        this.logger.log(`Started ${enabledTasks.length} scheduled tasks`);
    }
}
