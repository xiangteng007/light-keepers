import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from './entities';
import { CreateEventDto, UpdateEventDto, EventQueryDto } from './dto/event.dto';

@Injectable()
export class EventsService {
    constructor(
        @InjectRepository(Event)
        private readonly eventRepository: Repository<Event>,
    ) { }

    async create(dto: CreateEventDto): Promise<Event> {
        const event = this.eventRepository.create({
            ...dto,
            startedAt: new Date(),
        });
        return this.eventRepository.save(event);
    }

    async findAll(query: EventQueryDto): Promise<{ data: Event[]; total: number }> {
        const { status, category, severity, limit = 20, offset = 0 } = query;

        const qb = this.eventRepository.createQueryBuilder('event');

        if (status) {
            qb.andWhere('event.status = :status', { status });
        }
        if (category) {
            qb.andWhere('event.category = :category', { category });
        }
        if (severity) {
            qb.andWhere('event.severity = :severity', { severity });
        }

        qb.orderBy('event.createdAt', 'DESC')
            .take(limit)
            .skip(offset);

        const [data, total] = await qb.getManyAndCount();
        return { data, total };
    }

    async findOne(id: string): Promise<Event> {
        const event = await this.eventRepository.findOne({ where: { id } });
        if (!event) {
            throw new NotFoundException('事件不存在');
        }
        return event;
    }

    async update(id: string, dto: UpdateEventDto): Promise<Event> {
        const event = await this.findOne(id);

        if (dto.status === 'resolved' && event.status !== 'resolved') {
            event.resolvedAt = new Date();
        }

        Object.assign(event, dto);
        return this.eventRepository.save(event);
    }

    async remove(id: string): Promise<void> {
        const event = await this.findOne(id);
        await this.eventRepository.remove(event);
    }

    async getStats(): Promise<{
        active: number;
        resolved: number;
        bySeverity: { severity: number; count: number }[];
        byCategory: { category: string; count: number }[];
    }> {
        const active = await this.eventRepository.count({ where: { status: 'active' } });
        const resolved = await this.eventRepository.count({ where: { status: 'resolved' } });

        const bySeverity = await this.eventRepository
            .createQueryBuilder('event')
            .select('event.severity', 'severity')
            .addSelect('COUNT(*)', 'count')
            .groupBy('event.severity')
            .getRawMany();

        const byCategory = await this.eventRepository
            .createQueryBuilder('event')
            .select('event.category', 'category')
            .addSelect('COUNT(*)', 'count')
            .groupBy('event.category')
            .getRawMany();

        return { active, resolved, bySeverity, byCategory };
    }
}
