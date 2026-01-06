import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Micro Task Service
 * Distribute simple tasks to nearby civilians
 */
@Injectable()
export class MicroTaskService {
    private readonly logger = new Logger(MicroTaskService.name);

    private tasks: Map<string, MicroTask> = new Map();
    private assignments: Map<string, TaskAssignment[]> = new Map();

    constructor(private eventEmitter: EventEmitter2) { }

    /**
     * Create micro task for crowd sourcing
     */
    async createTask(config: TaskConfig): Promise<MicroTask> {
        const task: MicroTask = {
            id: `mtask-${Date.now()}`,
            title: config.title,
            description: config.description,
            type: config.type,
            location: config.location,
            radius: config.radius || 1000, // meters
            points: config.points || 10,
            maxParticipants: config.maxParticipants || 5,
            requiredSkills: config.requiredSkills || [],
            status: 'open',
            assignments: [],
            deadline: config.deadline || new Date(Date.now() + 3600000),
            createdAt: new Date(),
        };

        this.tasks.set(task.id, task);
        this.eventEmitter.emit('microtask.created', task);

        return task;
    }

    /**
     * Get available tasks for user by location
     */
    getAvailableTasks(userId: string, location: GeoPoint): MicroTask[] {
        return Array.from(this.tasks.values()).filter((task) => {
            if (task.status !== 'open') return false;
            if (task.assignments.length >= task.maxParticipants) return false;

            const distance = this.calculateDistance(location, task.location);
            return distance <= task.radius;
        });
    }

    /**
     * Accept task
     */
    async acceptTask(taskId: string, userId: string): Promise<TaskAssignment> {
        const task = this.tasks.get(taskId);
        if (!task) throw new Error(`Task not found: ${taskId}`);
        if (task.status !== 'open') throw new Error('Task not available');

        const assignment: TaskAssignment = {
            id: `assign-${Date.now()}`,
            taskId,
            userId,
            status: 'in_progress',
            acceptedAt: new Date(),
            completedAt: null,
            evidence: [],
        };

        task.assignments.push(assignment.id);

        const userAssignments = this.assignments.get(userId) || [];
        userAssignments.push(assignment);
        this.assignments.set(userId, userAssignments);

        if (task.assignments.length >= task.maxParticipants) {
            task.status = 'full';
        }

        this.eventEmitter.emit('microtask.accepted', { task, assignment });

        return assignment;
    }

    /**
     * Submit task completion
     */
    async completeTask(
        assignmentId: string,
        userId: string,
        evidence: TaskEvidence,
    ): Promise<TaskAssignment> {
        const userAssignments = this.assignments.get(userId) || [];
        const assignment = userAssignments.find((a) => a.id === assignmentId);

        if (!assignment) throw new Error('Assignment not found');

        assignment.status = 'pending_review';
        assignment.completedAt = new Date();
        assignment.evidence.push(evidence);

        this.eventEmitter.emit('microtask.submitted', {
            assignment,
            evidence,
        });

        return assignment;
    }

    /**
     * Verify task completion
     */
    async verifyCompletion(
        assignmentId: string,
        verifierId: string,
        approved: boolean,
    ): Promise<TaskAssignment> {
        for (const [userId, assignments] of this.assignments) {
            const assignment = assignments.find((a) => a.id === assignmentId);
            if (assignment) {
                assignment.status = approved ? 'completed' : 'rejected';

                if (approved) {
                    const task = this.tasks.get(assignment.taskId);
                    if (task) {
                        this.eventEmitter.emit('microtask.completed', {
                            userId,
                            task,
                            points: task.points,
                        });
                    }
                }

                return assignment;
            }
        }
        throw new Error('Assignment not found');
    }

    private calculateDistance(a: GeoPoint, b: GeoPoint): number {
        const R = 6371000;
        const dLat = ((b.lat - a.lat) * Math.PI) / 180;
        const dLng = ((b.lng - a.lng) * Math.PI) / 180;
        const lat1 = (a.lat * Math.PI) / 180;
        const lat2 = (b.lat * Math.PI) / 180;
        const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
    }
}

// Types
interface GeoPoint { lat: number; lng: number; }

interface MicroTask {
    id: string;
    title: string;
    description: string;
    type: 'photo' | 'verify' | 'deliver' | 'check' | 'report';
    location: GeoPoint;
    radius: number;
    points: number;
    maxParticipants: number;
    requiredSkills: string[];
    status: 'open' | 'full' | 'completed' | 'cancelled';
    assignments: string[];
    deadline: Date;
    createdAt: Date;
}

interface TaskConfig {
    title: string;
    description: string;
    type: 'photo' | 'verify' | 'deliver' | 'check' | 'report';
    location: GeoPoint;
    radius?: number;
    points?: number;
    maxParticipants?: number;
    requiredSkills?: string[];
    deadline?: Date;
}

interface TaskAssignment {
    id: string;
    taskId: string;
    userId: string;
    status: 'in_progress' | 'pending_review' | 'completed' | 'rejected';
    acceptedAt: Date;
    completedAt: Date | null;
    evidence: TaskEvidence[];
}

interface TaskEvidence {
    type: 'photo' | 'video' | 'text' | 'location';
    url?: string;
    text?: string;
    location?: GeoPoint;
    timestamp: Date;
}
