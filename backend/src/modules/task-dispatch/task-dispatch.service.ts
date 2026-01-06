import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { DispatchTask, TaskStatus, TaskPriority } from './entities/dispatch-task.entity';
import { TaskAssignment, AssignmentStatus } from './entities/task-assignment.entity';
import { CreateTaskDto, UpdateTaskDto, AssignTaskDto } from './dto';

@Injectable()
export class TaskDispatchService {
    private readonly logger = new Logger(TaskDispatchService.name);

    constructor(
        @InjectRepository(DispatchTask)
        private readonly taskRepo: Repository<DispatchTask>,
        @InjectRepository(TaskAssignment)
        private readonly assignmentRepo: Repository<TaskAssignment>,
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

        return this.taskRepo.save(task);
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

        return this.taskRepo.save(task);
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
}
