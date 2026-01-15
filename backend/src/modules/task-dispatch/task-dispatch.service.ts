import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DispatchTask, TaskStatus, TaskPriority } from './entities/dispatch-task.entity';
import { TaskAssignment, AssignmentStatus } from './entities/task-assignment.entity';
import { CreateTaskDto, UpdateTaskDto, AssignTaskDto } from './dto';

/**
 * Task Dispatch Events
 */
export const TASK_EVENTS = {
    CREATED: 'task.created',
    ASSIGNED: 'task.assigned',
    ACCEPTED: 'task.accepted',
    STARTED: 'task.started',
    COMPLETED: 'task.completed',
    CANCELLED: 'task.cancelled',
} as const;

export interface TaskEventPayload {
    taskId: string;
    missionSessionId: string;
    title: string;
    priority: TaskPriority;
    volunteerIds?: string[];
    volunteerNames?: string[];
    triggeredBy?: string;
    timestamp: Date;
}

@Injectable()
export class TaskDispatchService {
    private readonly logger = new Logger(TaskDispatchService.name);

    constructor(
        @InjectRepository(DispatchTask)
        private readonly taskRepo: Repository<DispatchTask>,
        @InjectRepository(TaskAssignment)
        private readonly assignmentRepo: Repository<TaskAssignment>,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Create a new dispatch task
     */
    async createTask(dto: CreateTaskDto, createdBy: string): Promise<DispatchTask> {
        const task = this.taskRepo.create({
            ...dto,
            createdBy,
            status: TaskStatus.DRAFT,
            location: dto.location
                ? { type: 'Point', coordinates: [dto.location.longitude, dto.location.latitude] }
                : null,
            dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
        });

        const saved = await this.taskRepo.save(task);
        this.logger.log(`Task created: ${saved.id} by ${createdBy}`);
        return saved;
    }

    /**
     * Get all tasks for a mission session
     */
    async getTasksByMission(
        missionSessionId: string,
        filters?: { status?: TaskStatus; priority?: TaskPriority },
    ): Promise<DispatchTask[]> {
        const qb = this.taskRepo
            .createQueryBuilder('task')
            .where('task.mission_session_id = :missionSessionId', { missionSessionId })
            .leftJoinAndSelect('task.assignments', 'assignments')
            .orderBy('task.priority', 'DESC')
            .addOrderBy('task.created_at', 'DESC');

        if (filters?.status) {
            qb.andWhere('task.status = :status', { status: filters.status });
        }
        if (filters?.priority !== undefined) {
            qb.andWhere('task.priority = :priority', { priority: filters.priority });
        }

        return qb.getMany();
    }

    /**
     * Get a single task by ID
     */
    async getTaskById(taskId: string): Promise<DispatchTask> {
        const task = await this.taskRepo.findOne({
            where: { id: taskId },
            relations: ['assignments'],
        });
        if (!task) {
            throw new NotFoundException(`Task ${taskId} not found`);
        }
        return task;
    }

    /**
     * Update a task
     */
    async updateTask(taskId: string, dto: UpdateTaskDto): Promise<DispatchTask> {
        const task = await this.getTaskById(taskId);

        if (dto.location) {
            (task as any).location = {
                type: 'Point',
                coordinates: [dto.location.longitude, dto.location.latitude],
            };
            delete dto.location;
        }

        Object.assign(task, dto);
        return this.taskRepo.save(task);
    }

    /**
     * Assign task to volunteers
     */
    async assignTask(
        taskId: string,
        dto: AssignTaskDto,
        assignedBy: string,
        volunteerNames: Map<string, string>,
    ): Promise<TaskAssignment[]> {
        const task = await this.getTaskById(taskId);

        if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
            throw new BadRequestException('Cannot assign completed or cancelled tasks');
        }

        const assignments: TaskAssignment[] = [];
        const now = new Date();

        for (const volunteerId of dto.volunteerIds) {
            // Check if already assigned
            const existing = await this.assignmentRepo.findOne({
                where: { taskId, volunteerId },
            });
            if (existing) {
                continue; // Skip already assigned
            }

            const assignment = this.assignmentRepo.create({
                taskId,
                volunteerId,
                volunteerName: volunteerNames.get(volunteerId) || 'Unknown',
                assignedBy,
                assignedAt: now,
                status: AssignmentStatus.PENDING,
            });
            assignments.push(await this.assignmentRepo.save(assignment));
        }

        // Update task status
        if (assignments.length > 0 && task.status === TaskStatus.DRAFT) {
            task.status = TaskStatus.PENDING;
            await this.taskRepo.save(task);
        }

        // Emit task.assigned event for notification system
        if (assignments.length > 0) {
            const payload: TaskEventPayload = {
                taskId,
                missionSessionId: task.missionSessionId,
                title: task.title,
                priority: task.priority,
                volunteerIds: dto.volunteerIds,
                volunteerNames: Array.from(volunteerNames.values()),
                triggeredBy: assignedBy,
                timestamp: new Date(),
            };
            this.eventEmitter.emit(TASK_EVENTS.ASSIGNED, payload);
            this.logger.log(`Emitted ${TASK_EVENTS.ASSIGNED} for task ${taskId}`);
        }

        this.logger.log(`Task ${taskId} assigned to ${assignments.length} volunteers`);
        return assignments;
    }

    /**
     * Accept a task assignment
     */
    async acceptAssignment(taskId: string, volunteerId: string, note?: string): Promise<TaskAssignment> {
        const assignment = await this.assignmentRepo.findOne({
            where: { taskId, volunteerId },
        });
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (assignment.status !== AssignmentStatus.PENDING) {
            throw new BadRequestException('Assignment is not pending');
        }

        assignment.status = AssignmentStatus.ACCEPTED;
        assignment.respondedAt = new Date();
        if (note) {
            assignment.metadata = { ...assignment.metadata, acceptNote: note };
        }

        const saved = await this.assignmentRepo.save(assignment);

        // Update task status
        const task = await this.getTaskById(taskId);
        if (task.status === TaskStatus.PENDING || task.status === TaskStatus.ASSIGNED) {
            task.status = TaskStatus.ACCEPTED;
            await this.taskRepo.save(task);
        }

        return saved;
    }

    /**
     * Decline a task assignment
     */
    async declineAssignment(taskId: string, volunteerId: string, reason: string): Promise<TaskAssignment> {
        const assignment = await this.assignmentRepo.findOne({
            where: { taskId, volunteerId },
        });
        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        assignment.status = AssignmentStatus.DECLINED;
        assignment.respondedAt = new Date();
        assignment.declineReason = reason;

        return this.assignmentRepo.save(assignment);
    }

    /**
     * Start working on a task
     */
    async startTask(taskId: string, volunteerId: string): Promise<DispatchTask> {
        const task = await this.getTaskById(taskId);

        if (task.status !== TaskStatus.ACCEPTED) {
            throw new BadRequestException('Task must be accepted before starting');
        }

        task.status = TaskStatus.IN_PROGRESS;
        task.startedAt = new Date();

        const saved = await this.taskRepo.save(task);

        // Emit task.started event
        const payload: TaskEventPayload = {
            taskId,
            missionSessionId: task.missionSessionId,
            title: task.title,
            priority: task.priority,
            triggeredBy: volunteerId,
            timestamp: new Date(),
        };
        this.eventEmitter.emit(TASK_EVENTS.STARTED, payload);
        this.logger.log(`Emitted ${TASK_EVENTS.STARTED} for task ${taskId}`);

        return saved;
    }

    /**
     * Complete a task
     */
    async completeTask(taskId: string, volunteerId: string, notes?: string): Promise<DispatchTask> {
        const task = await this.getTaskById(taskId);

        if (task.status !== TaskStatus.IN_PROGRESS) {
            throw new BadRequestException('Task must be in progress to complete');
        }

        task.status = TaskStatus.COMPLETED;
        task.completedAt = new Date();
        if (notes) {
            task.metadata = { ...task.metadata, completionNotes: notes };
        }

        // Update assignment
        const assignment = await this.assignmentRepo.findOne({
            where: { taskId, volunteerId, status: AssignmentStatus.ACCEPTED },
        });
        if (assignment) {
            assignment.status = AssignmentStatus.COMPLETED;
            assignment.completedAt = new Date();
            assignment.completionNotes = notes || null;
            await this.assignmentRepo.save(assignment);
        }

        const saved = await this.taskRepo.save(task);

        // Emit task.completed event
        const payload: TaskEventPayload = {
            taskId,
            missionSessionId: task.missionSessionId,
            title: task.title,
            priority: task.priority,
            triggeredBy: volunteerId,
            timestamp: new Date(),
        };
        this.eventEmitter.emit(TASK_EVENTS.COMPLETED, payload);
        this.logger.log(`Emitted ${TASK_EVENTS.COMPLETED} for task ${taskId}`);

        return saved;
    }

    /**
     * Cancel a task
     */
    async cancelTask(taskId: string, reason?: string): Promise<DispatchTask> {
        const task = await this.getTaskById(taskId);

        if (task.status === TaskStatus.COMPLETED) {
            throw new BadRequestException('Cannot cancel completed tasks');
        }

        task.status = TaskStatus.CANCELLED;
        task.metadata = { ...task.metadata, cancelReason: reason };

        // Cancel all pending assignments
        await this.assignmentRepo.update(
            { taskId, status: In([AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED]) },
            { status: AssignmentStatus.CANCELLED },
        );

        return this.taskRepo.save(task);
    }

    /**
     * Get tasks assigned to a volunteer
     */
    async getVolunteerTasks(volunteerId: string): Promise<DispatchTask[]> {
        const assignments = await this.assignmentRepo.find({
            where: { volunteerId, status: In([AssignmentStatus.PENDING, AssignmentStatus.ACCEPTED]) },
            relations: ['task'],
        });

        return assignments.map((a) => a.task);
    }

    /**
     * Get task statistics for a mission
     */
    async getMissionStats(missionSessionId: string): Promise<{
        total: number;
        byStatus: Record<TaskStatus, number>;
        byPriority: Record<TaskPriority, number>;
    }> {
        const tasks = await this.taskRepo.find({ where: { missionSessionId } });

        const byStatus = {} as Record<TaskStatus, number>;
        const byPriority = {} as Record<TaskPriority, number>;

        for (const status of Object.values(TaskStatus)) {
            byStatus[status] = 0;
        }
        for (const priority of Object.values(TaskPriority)) {
            byPriority[priority as TaskPriority] = 0;
        }

        for (const task of tasks) {
            byStatus[task.status]++;
            byPriority[task.priority]++;
        }

        return {
            total: tasks.length,
            byStatus,
            byPriority,
        };
    }

    /**
     * 🆕 Check-in to a task with GPS validation
     */
    async checkIn(
        taskId: string,
        volunteerId: string,
        location: { latitude: number; longitude: number; note?: string },
    ): Promise<{ success: boolean; assignment: TaskAssignment; message: string }> {
        const task = await this.getTaskById(taskId);
        const assignment = await this.assignmentRepo.findOne({
            where: { taskId, volunteerId },
        });

        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (assignment.status !== AssignmentStatus.ACCEPTED) {
            throw new BadRequestException('Assignment must be accepted before check-in');
        }

        // Calculate distance to task location (if available)
        let distanceMeters: number | null = null;
        let isWithinRange = true;
        const MAX_CHECKIN_DISTANCE_METERS = 500; // 500m radius

        if (task.location) {
            const taskCoords = (task.location as any).coordinates;
            if (taskCoords && Array.isArray(taskCoords) && taskCoords.length === 2) {
                distanceMeters = this.calculateDistance(
                    location.latitude,
                    location.longitude,
                    taskCoords[1], // lat
                    taskCoords[0], // lng
                );
                isWithinRange = distanceMeters <= MAX_CHECKIN_DISTANCE_METERS;
            }
        }

        // Update assignment with check-in data
        assignment.metadata = {
            ...assignment.metadata,
            checkedInAt: new Date().toISOString(),
            checkinLocation: { lat: location.latitude, lng: location.longitude },
            checkinDistanceMeters: distanceMeters,
            checkinNote: location.note || null,
            isWithinRange,
        };

        const saved = await this.assignmentRepo.save(assignment);

        // Emit check-in event
        this.eventEmitter.emit('task.checkedIn', {
            taskId,
            volunteerId,
            missionSessionId: task.missionSessionId,
            location,
            distanceMeters,
            isWithinRange,
            timestamp: new Date(),
        });

        this.logger.log(`Volunteer ${volunteerId} checked in to task ${taskId}, distance: ${distanceMeters}m`);

        return {
            success: true,
            assignment: saved,
            message: isWithinRange
                ? '簽到成功'
                : `簽到成功 (距離 ${Math.round(distanceMeters || 0)} 公尺，超出範圍)`,
        };
    }

    /**
     * 🆕 Check-out from a task
     */
    async checkOut(
        taskId: string,
        volunteerId: string,
        data: { latitude?: number; longitude?: number; notes?: string },
    ): Promise<{ success: boolean; assignment: TaskAssignment; durationMinutes: number }> {
        const task = await this.getTaskById(taskId);
        const assignment = await this.assignmentRepo.findOne({
            where: { taskId, volunteerId },
        });

        if (!assignment) {
            throw new NotFoundException('Assignment not found');
        }

        if (!assignment.metadata?.checkedInAt) {
            throw new BadRequestException('Must check-in before check-out');
        }

        const checkedInAt = new Date(assignment.metadata.checkedInAt);
        const checkedOutAt = new Date();
        const durationMinutes = Math.round((checkedOutAt.getTime() - checkedInAt.getTime()) / 1000 / 60);

        // Update assignment with check-out data
        assignment.metadata = {
            ...assignment.metadata,
            checkedOutAt: checkedOutAt.toISOString(),
            checkoutLocation: data.latitude && data.longitude
                ? { lat: data.latitude, lng: data.longitude }
                : null,
            durationMinutes,
            checkoutNotes: data.notes || null,
        };

        // Mark as completed
        assignment.status = AssignmentStatus.COMPLETED;
        assignment.completedAt = checkedOutAt;
        assignment.completionNotes = data.notes || null;

        const saved = await this.assignmentRepo.save(assignment);

        // Emit check-out event
        this.eventEmitter.emit('task.checkedOut', {
            taskId,
            volunteerId,
            missionSessionId: task.missionSessionId,
            durationMinutes,
            timestamp: checkedOutAt,
        });

        this.logger.log(`Volunteer ${volunteerId} checked out from task ${taskId}, duration: ${durationMinutes}min`);

        return {
            success: true,
            assignment: saved,
            durationMinutes,
        };
    }

    /**
     * Calculate distance between two coordinates (Haversine formula)
     */
    private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
        const R = 6371000; // Earth's radius in meters
        const φ1 = (lat1 * Math.PI) / 180;
        const φ2 = (lat2 * Math.PI) / 180;
        const Δφ = ((lat2 - lat1) * Math.PI) / 180;
        const Δλ = ((lng2 - lng1) * Math.PI) / 180;

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round(R * c); // Distance in meters
    }
}
