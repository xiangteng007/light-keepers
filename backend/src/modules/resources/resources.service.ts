import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Resource, ResourceCategory, ResourceStatus } from './resources.entity';

export interface CreateResourceDto {
    name: string;
    category: ResourceCategory;
    description?: string;
    quantity: number;
    unit?: string;
    minQuantity?: number;
    location?: string;
    expiresAt?: Date;
}

@Injectable()
export class ResourcesService {
    private readonly logger = new Logger(ResourcesService.name);

    constructor(
        @InjectRepository(Resource)
        private resourcesRepository: Repository<Resource>,
    ) { }

    async create(dto: CreateResourceDto): Promise<Resource> {
        const resource = this.resourcesRepository.create({
            ...dto,
            status: this.calculateStatus(dto.quantity, dto.minQuantity || 10),
        });
        return this.resourcesRepository.save(resource);
    }

    async findAll(category?: ResourceCategory): Promise<Resource[]> {
        const where = category ? { category } : {};
        return this.resourcesRepository.find({
            where,
            order: { category: 'ASC', name: 'ASC' },
        });
    }

    async findOne(id: string): Promise<Resource> {
        const resource = await this.resourcesRepository.findOne({ where: { id } });
        if (!resource) throw new NotFoundException(`Resource ${id} not found`);
        return resource;
    }

    async updateQuantity(id: string, quantity: number): Promise<Resource> {
        const resource = await this.findOne(id);
        resource.quantity = quantity;
        resource.status = this.calculateStatus(quantity, resource.minQuantity);
        return this.resourcesRepository.save(resource);
    }

    async addStock(id: string, amount: number): Promise<Resource> {
        const resource = await this.findOne(id);
        resource.quantity += amount;
        resource.status = this.calculateStatus(resource.quantity, resource.minQuantity);
        this.logger.log(`Added ${amount} to ${resource.name}, new quantity: ${resource.quantity}`);
        return this.resourcesRepository.save(resource);
    }

    async deductStock(id: string, amount: number): Promise<Resource> {
        const resource = await this.findOne(id);
        resource.quantity = Math.max(0, resource.quantity - amount);
        resource.status = this.calculateStatus(resource.quantity, resource.minQuantity);
        this.logger.log(`Deducted ${amount} from ${resource.name}, new quantity: ${resource.quantity}`);
        return this.resourcesRepository.save(resource);
    }

    async getLowStock(): Promise<Resource[]> {
        return this.resourcesRepository.find({
            where: [
                { status: 'low' },
                { status: 'depleted' },
            ],
        });
    }

    async getExpiringSoon(days = 30): Promise<Resource[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + days);
        return this.resourcesRepository.find({
            where: {
                expiresAt: LessThanOrEqual(futureDate),
            },
        });
    }

    async getStats(): Promise<{
        total: number;
        byCategory: Record<string, number>;
        lowStock: number;
        expiringSoon: number;
    }> {
        const all = await this.resourcesRepository.find();
        const byCategory: Record<string, number> = {};
        let lowStock = 0;

        for (const r of all) {
            byCategory[r.category] = (byCategory[r.category] || 0) + 1;
            if (r.status === 'low' || r.status === 'depleted') lowStock++;
        }

        const expiring = await this.getExpiringSoon(30);

        return {
            total: all.length,
            byCategory,
            lowStock,
            expiringSoon: expiring.length,
        };
    }

    private calculateStatus(quantity: number, minQuantity: number): ResourceStatus {
        if (quantity === 0) return 'depleted';
        if (quantity <= minQuantity) return 'low';
        return 'available';
    }
}
