import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VolunteerVehicle, VehicleType, VehiclePurpose } from './volunteer-vehicle.entity';

export interface CreateVehicleDto {
    volunteerId: string;
    licensePlate: string;
    vehicleType: VehicleType;
    brand?: string;
    model?: string;
    engineCc?: number;
    color?: string;
    purposes?: VehiclePurpose[];
    modifications?: string;
    insuranceCompany?: string;
    insurancePolicyNo?: string;
    insuranceExpiresAt?: Date;
    photoUrl?: string;
    notes?: string;
}

export interface UpdateVehicleDto {
    licensePlate?: string;
    vehicleType?: VehicleType;
    brand?: string;
    model?: string;
    engineCc?: number;
    color?: string;
    purposes?: VehiclePurpose[];
    modifications?: string;
    insuranceCompany?: string;
    insurancePolicyNo?: string;
    insuranceExpiresAt?: Date;
    photoUrl?: string;
    notes?: string;
    isActive?: boolean;
}

@Injectable()
export class VehicleService {
    private readonly logger = new Logger(VehicleService.name);

    constructor(
        @InjectRepository(VolunteerVehicle)
        private vehicleRepository: Repository<VolunteerVehicle>,
    ) { }

    // 取得志工的所有車輛
    async findByVolunteer(volunteerId: string): Promise<VolunteerVehicle[]> {
        return this.vehicleRepository.find({
            where: { volunteerId, isActive: true },
            order: { createdAt: 'DESC' },
        });
    }

    // 取得單一車輛
    async findOne(id: string): Promise<VolunteerVehicle> {
        const vehicle = await this.vehicleRepository.findOne({ where: { id } });
        if (!vehicle) {
            throw new NotFoundException(`Vehicle ${id} not found`);
        }
        return vehicle;
    }

    // 建立車輛
    async create(dto: CreateVehicleDto): Promise<VolunteerVehicle> {
        const vehicle = this.vehicleRepository.create({
            ...dto,
            isActive: true,
        });
        const saved = await this.vehicleRepository.save(vehicle);
        this.logger.log(`Created vehicle for volunteer ${dto.volunteerId}`);
        return saved;
    }

    // 更新車輛
    async update(id: string, dto: UpdateVehicleDto): Promise<VolunteerVehicle> {
        const vehicle = await this.findOne(id);
        Object.assign(vehicle, dto);
        const updated = await this.vehicleRepository.save(vehicle);
        this.logger.log(`Updated vehicle ${id}`);
        return updated;
    }

    // 刪除車輛（軟刪除）
    async deactivate(id: string): Promise<VolunteerVehicle> {
        return this.update(id, { isActive: false });
    }

    // 取得保險即將到期的車輛
    async getExpiringInsurance(daysAhead: number = 30): Promise<VolunteerVehicle[]> {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + daysAhead);

        return this.vehicleRepository
            .createQueryBuilder('vehicle')
            .where('vehicle.isActive = true')
            .andWhere('vehicle.insuranceExpiresAt IS NOT NULL')
            .andWhere('vehicle.insuranceExpiresAt <= :futureDate', { futureDate })
            .andWhere('vehicle.insuranceExpiresAt >= :now', { now: new Date() })
            .getMany();
    }

    // 取得車輛類型選項
    getVehicleTypes(): { code: VehicleType; name: string }[] {
        return [
            { code: 'car', name: '汽車' },
            { code: 'motorcycle', name: '機車' },
            { code: 'boat', name: '船艇' },
            { code: 'atv', name: '沙灘車/ATV' },
            { code: 'truck', name: '貨車/卡車' },
            { code: 'other', name: '其他' },
        ];
    }

    // 取得車輛用途選項
    getVehiclePurposes(): { code: VehiclePurpose; name: string }[] {
        return [
            { code: 'rescue', name: '救援' },
            { code: 'transport', name: '運補' },
            { code: 'towing', name: '拖吊' },
            { code: 'patrol', name: '巡邏' },
            { code: 'other', name: '其他' },
        ];
    }
}
