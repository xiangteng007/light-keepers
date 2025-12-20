import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from './entities';
import { CreateTaskDto, UpdateTaskDto, TaskQueryDto } from './dto/task.dto';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(Task)
        private readonly taskRepository: Repository<Task>,
    ) { }

    async create(dto: CreateTaskDto, assignedBy?: string): Promise<Task> {
        const task = this.taskRepository.create({
            ...dto,
            assignedBy,
            dueAt: dto.dueAt ? new Date(dto.dueAt) : undefined,
        });
        return this.taskRepository.save(task);
    }

    async findAll(query: TaskQueryDto): Promise<{ data: Task[]; total: number }> {
        const { status, eventId, assignedTo, limit = 20, offset = 0 } = query;

        const qb = this.taskRepository.createQueryBuilder('task')
            .leftJoinAndSelect('task.event', 'event');

        if (status) {
            qb.andWhere('task.status = :status', { status });
        }
        if (eventId) {
            qb.andWhere('task.eventId = :eventId', { eventId });
        }
        if (assignedTo) {
            qb.andWhere('task.assignedTo = :assignedTo', { assignedTo });
        }

        qb.orderBy('task.priority', 'DESC')
            .addOrderBy('task.createdAt', 'DESC')
            .take(limit)
            .skip(offset);

        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }

    async findOne(id: string): Promise<Task> {
        const task = await this.taskRepository.findOne({
            where: { id },
            relations: ['event'],
        });
        if (!task) {
            throw new NotFoundException('任務不存在');
        }
        return task;
    }

    async update(id: string, dto: UpdateTaskDto): Promise<Task> {
        const task = await this.findOne(id);

        if (dto.status === 'completed' && task.status !== 'completed') {
            task.completedAt = new Date();
        }
        if (dto.status === 'in_progress' && task.status === 'pending') {
            // 任務開始進行
        }

        Object.assign(task, {
            ...dto,
            dueAt: dto.dueAt ? new Date(dto.dueAt) : task.dueAt,
        });
        return this.taskRepository.save(task);
    }

    async remove(id: string): Promise<void> {
        const task = await this.findOne(id);
        await this.taskRepository.remove(task);
    }

    async getKanbanBoard(): Promise<{
        pending: Task[];
        inProgress: Task[];
        completed: Task[];
    }> {
        try {
            const pending = await this.taskRepository.find({
                where: { status: 'pending' },
                order: { createdAt: 'DESC' },
                take: 50,
            });

            const inProgress = await this.taskRepository.find({
                where: { status: 'in_progress' },
                order: { createdAt: 'DESC' },
                take: 50,
            });

            const completed = await this.taskRepository.find({
                where: { status: 'completed' },
                order: { createdAt: 'DESC' },
                take: 20,
            });

            return { pending, inProgress, completed };
        } catch (error) {
            console.error('getKanbanBoard error:', error);
            return { pending: [], inProgress: [], completed: [] };
        }
    }

    async getStats(): Promise<{
        pending: number;
        inProgress: number;
        completed: number;
        overdue: number;
    }> {
        const pending = await this.taskRepository.count({ where: { status: 'pending' } });
        const inProgress = await this.taskRepository.count({ where: { status: 'in_progress' } });
        const completed = await this.taskRepository.count({ where: { status: 'completed' } });

        const overdue = await this.taskRepository
            .createQueryBuilder('task')
            .where('task.status IN (:...statuses)', { statuses: ['pending', 'in_progress'] })
            .andWhere('task.dueAt < NOW()')
            .getCount();

        return { pending, inProgress, completed, overdue };
    }
}
