import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Volunteer, VolunteerStatus } from './volunteers.entity';

export interface CreateVolunteerDto {
    name: string;
    email?: string;
    phone: string;
    region: string;
    address?: string;
    skills: string[];
    emergencyContact?: string;
    emergencyPhone?: string;
    notes?: string;
}

export interface UpdateVolunteerDto {
    name?: string;
    email?: string;
    phone?: string;
    region?: string;
    address?: string;
    skills?: string[];
    emergencyContact?: string;
    emergencyPhone?: string;
    notes?: string;
}

export interface VolunteerFilter {
    status?: VolunteerStatus;
    region?: string;
    skill?: string;
    limit?: number;
    offset?: number;
}

@Injectable()
export class VolunteersService {
    private readonly logger = new Logger(VolunteersService.name);

    constructor(
        @InjectRepository(Volunteer)
        private volunteersRepository: Repository<Volunteer>,
    ) { }

    // 註冊志工
    async create(dto: CreateVolunteerDto): Promise<Volunteer> {
        const volunteer = this.volunteersRepository.create({
            ...dto,
            status: 'available',
            serviceHours: 0,
            taskCount: 0,
        });

        const saved = await this.volunteersRepository.save(volunteer);
        this.logger.log(`New volunteer registered: ${saved.id} - ${saved.name}`);
        return saved;
    }

    // 取得所有志工
    async findAll(filter: VolunteerFilter = {}): Promise<Volunteer[]> {
        const query = this.volunteersRepository.createQueryBuilder('volunteer');

        if (filter.status) {
            query.andWhere('volunteer.status = :status', { status: filter.status });
        }

        if (filter.region) {
            query.andWhere('volunteer.region LIKE :region', { region: `%${filter.region}%` });
        }

        if (filter.skill) {
            query.andWhere('volunteer.skills LIKE :skill', { skill: `%${filter.skill}%` });
        }

        query.orderBy('volunteer.createdAt', 'DESC');

        if (filter.limit) {
            query.take(filter.limit);
        }

        if (filter.offset) {
            query.skip(filter.offset);
        }

        return query.getMany();
    }

    // 取得單一志工
    async findOne(id: string): Promise<Volunteer> {
        const volunteer = await this.volunteersRepository.findOne({ where: { id } });
        if (!volunteer) {
            throw new NotFoundException(`Volunteer ${id} not found`);
        }
        return volunteer;
    }

    // 更新志工資料
    async update(id: string, dto: UpdateVolunteerDto): Promise<Volunteer> {
        const volunteer = await this.findOne(id);
        Object.assign(volunteer, dto);
        const updated = await this.volunteersRepository.save(volunteer);
        this.logger.log(`Volunteer ${id} updated`);
        return updated;
    }

    // 更新可用狀態
    async updateStatus(id: string, status: VolunteerStatus): Promise<Volunteer> {
        const volunteer = await this.findOne(id);
        volunteer.status = status;
        const updated = await this.volunteersRepository.save(volunteer);
        this.logger.log(`Volunteer ${id} status changed to ${status}`);
        return updated;
    }

    // 取得可用志工 (可派遣)
    async findAvailable(region?: string, skill?: string): Promise<Volunteer[]> {
        return this.findAll({
            status: 'available',
            region,
            skill,
        });
    }

    // 增加服務統計
    async addServiceRecord(id: string, hours: number): Promise<Volunteer> {
        const volunteer = await this.findOne(id);
        volunteer.serviceHours += hours;
        volunteer.taskCount += 1;
        return this.volunteersRepository.save(volunteer);
    }

    // 取得統計
    async getStats(): Promise<{
        total: number;
        available: number;
        busy: number;
        offline: number;
        totalServiceHours: number;
    }> {
        const volunteers = await this.volunteersRepository.find();

        let available = 0, busy = 0, offline = 0, totalServiceHours = 0;

        for (const v of volunteers) {
            totalServiceHours += v.serviceHours;
            if (v.status === 'available') available++;
            else if (v.status === 'busy') busy++;
            else if (v.status === 'offline') offline++;
        }

        return {
            total: volunteers.length,
            available,
            busy,
            offline,
            totalServiceHours,
        };
    }

    // 刪除志工
    async delete(id: string): Promise<void> {
        const result = await this.volunteersRepository.delete(id);
        if (result.affected === 0) {
            throw new NotFoundException(`Volunteer ${id} not found`);
        }
        this.logger.log(`Volunteer ${id} deleted`);
    }
}
