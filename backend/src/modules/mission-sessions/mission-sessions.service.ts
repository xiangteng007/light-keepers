import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MissionSession, MissionStatus } from './entities/mission-session.entity';
import { MissionEvent } from './entities/event.entity';
import { Task } from './entities/task.entity';
import { InventoryTransaction } from './entities/inventory-transaction.entity';
import { CreateMissionSessionDto, UpdateMissionSessionDto } from './dto/mission-session.dto';
import { CreateEventDto } from './dto/event.dto';
import { CreateTaskDto, UpdateTaskDto } from './dto/task.dto';

@Injectable()
export class MissionSessionsService {
    constructor(
        @InjectRepository(MissionSession)
        private missionSessionRepo: Repository<MissionSession>,
        @InjectRepository(MissionEvent)
        private eventRepo: Repository<MissionEvent>,
        @InjectRepository(Task)
        private taskRepo: Repository<Task>,
        @InjectRepository(InventoryTransaction)
        private inventoryTxnRepo: Repository<InventoryTransaction>,
    ) { }

    // Mission Session CRUD
    async createSession(dto: CreateMissionSessionDto): Promise<MissionSession> {
        const session = this.missionSessionRepo.create(dto);
        return this.missionSessionRepo.save(session);
    }

    async findAllSessions(): Promise<MissionSession[]> {
        return this.missionSessionRepo.find({
            order: { createdAt: 'DESC' },
            relations: ['events', 'tasks'],
        });
    }

    async findSessionById(id: string): Promise<MissionSession> {
        const session = await this.missionSessionRepo.findOne({
            where: { id },
            relations: ['events', 'tasks', 'inventoryTransactions'],
        });
        if (!session) {
            throw new NotFoundException(`Mission session ${id} not found`);
        }
        return session;
    }

    async updateSession(id: string, dto: UpdateMissionSessionDto): Promise<MissionSession> {
        await this.missionSessionRepo.update(id, dto);
        return this.findSessionById(id);
    }

    async startSession(id: string): Promise<MissionSession> {
        await this.missionSessionRepo.update(id, {
            status: MissionStatus.ACTIVE,
            startedAt: new Date(),
        });
        return this.findSessionById(id);
    }

    async endSession(id: string): Promise<MissionSession> {
        await this.missionSessionRepo.update(id, {
            status: MissionStatus.COMPLETED,
            endedAt: new Date(),
        });
        return this.findSessionById(id);
    }

    async deleteSession(id: string): Promise<void> {
        const result = await this.missionSessionRepo.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Mission session ${id} not found`);
        }
    }

    // Event CRUD
    async createEvent(dto: CreateEventDto): Promise<MissionEvent> {
        const event = this.eventRepo.create(dto);
        return this.eventRepo.save(event);
    }

    async findEventsBySession(sessionId: string): Promise<MissionEvent[]> {
        return this.eventRepo.find({
            where: { sessionId },
            order: { createdAt: 'DESC' },
        });
    }

    // Task CRUD
    async createTask(dto: CreateTaskDto): Promise<Task> {
        const task = this.taskRepo.create(dto);
        return this.taskRepo.save(task);
    }

    async findTasksBySession(sessionId: string): Promise<Task[]> {
        return this.taskRepo.find({
            where: { sessionId },
            order: { createdAt: 'DESC' },
        });
    }

    async updateTask(id: string, dto: UpdateTaskDto): Promise<Task> {
        await this.taskRepo.update(id, dto);
        const task = await this.taskRepo.findOne({ where: { id } });
        if (!task) {
            throw new NotFoundException(`Task ${id} not found`);
        }
        return task;
    }

    async deleteTask(id: string): Promise<void> {
        const result = await this.taskRepo.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Task ${id} not found`);
        }
    }

    // Statistics
    async getSessionStats(sessionId: string) {
        const session = await this.findSessionById(sessionId);
        const events = await this.eventRepo.count({ where: { sessionId } });
        const tasks = await this.taskRepo.count({ where: { sessionId } });
        const completedTasks = await this.taskRepo.count({
            where: { sessionId, status: 'completed' as any },
        });

        return {
            sessionId,
            status: session.status,
            eventsCount: events,
            tasksCount: tasks,
            completedTasksCount: completedTasks,
            startedAt: session.startedAt,
            duration: session.startedAt
                ? Math.floor((new Date().getTime() - session.startedAt.getTime()) / 1000)
                : 0,
        };
    }
}
