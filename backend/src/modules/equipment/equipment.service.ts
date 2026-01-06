/**
 * Equipment Service
 * Phase 5.5: 設備生命週期管理
 */

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Equipment, EquipmentStatus, EquipmentCategory } from './entities/equipment.entity';
import { EquipmentLog, EquipmentLogType } from './entities/equipment-log.entity';

@Injectable()
export class EquipmentService {
    private readonly logger = new Logger(EquipmentService.name);

    constructor(
        @InjectRepository(Equipment)
        private readonly equipmentRepository: Repository<Equipment>,
        @InjectRepository(EquipmentLog)
        private readonly logRepository: Repository<EquipmentLog>,
    ) { }

    // ==================== CRUD ====================

    async create(data: Partial<Equipment>): Promise<Equipment> {
        const equipment = this.equipmentRepository.create(data);
        return this.equipmentRepository.save(equipment);
    }

    async findById(id: string): Promise<Equipment> {
        const equipment = await this.equipmentRepository.findOne({
            where: { id },
            relations: ['logs'],
        });
        if (!equipment) throw new NotFoundException('設備不存在');
        return equipment;
    }

    async findByQrCode(qrCode: string): Promise<Equipment> {
        const equipment = await this.equipmentRepository.findOne({
            where: { qrCode },
            relations: ['logs'],
        });
        if (!equipment) throw new NotFoundException('QR Code 未綁定設備');
        return equipment;
    }

    async findAll(filters?: {
        category?: EquipmentCategory;
        status?: EquipmentStatus;
    }): Promise<Equipment[]> {
        const where: any = {};
        if (filters?.category) where.category = filters.category;
        if (filters?.status) where.status = filters.status;

        return this.equipmentRepository.find({
            where,
            order: { name: 'ASC' },
        });
    }

    // ==================== 借用/歸還 ====================

    async checkout(
        equipmentId: string,
        holderId: string,
        holderName: string,
        expectedReturnAt?: Date
    ): Promise<Equipment> {
        const equipment = await this.findById(equipmentId);

        if (equipment.status !== EquipmentStatus.AVAILABLE) {
            throw new BadRequestException('設備目前不可借用');
        }

        equipment.status = EquipmentStatus.IN_USE;
        equipment.currentHolderId = holderId;
        equipment.currentHolderName = holderName;
        equipment.checkedOutAt = new Date();
        equipment.expectedReturnAt = expectedReturnAt;

        await this.addLog(equipmentId, {
            type: EquipmentLogType.CHECKOUT,
            description: `借出給 ${holderName}`,
            performerId: holderId,
            performerName: holderName,
        });

        return this.equipmentRepository.save(equipment);
    }

    async returnEquipment(
        equipmentId: string,
        returnerId: string,
        returnerName: string,
        batteryLevel?: number
    ): Promise<Equipment> {
        const equipment = await this.findById(equipmentId);

        if (equipment.status !== EquipmentStatus.IN_USE) {
            throw new BadRequestException('設備未在借用中');
        }

        const previousHolder = equipment.currentHolderName;

        equipment.status = EquipmentStatus.AVAILABLE;
        equipment.currentHolderId = undefined;
        equipment.currentHolderName = undefined;
        equipment.checkedOutAt = undefined;
        equipment.expectedReturnAt = undefined;

        if (batteryLevel !== undefined) {
            equipment.batteryLevel = batteryLevel;
        }

        await this.addLog(equipmentId, {
            type: EquipmentLogType.RETURN,
            description: `${previousHolder} 歸還`,
            performerId: returnerId,
            performerName: returnerName,
            metadata: { batteryLevel },
        });

        return this.equipmentRepository.save(equipment);
    }

    // ==================== 維護管理 ====================

    async startMaintenance(equipmentId: string, reason: string): Promise<Equipment> {
        const equipment = await this.findById(equipmentId);

        equipment.status = EquipmentStatus.MAINTENANCE;

        await this.addLog(equipmentId, {
            type: EquipmentLogType.MAINTENANCE_START,
            description: reason,
        });

        return this.equipmentRepository.save(equipment);
    }

    async endMaintenance(equipmentId: string, notes?: string): Promise<Equipment> {
        const equipment = await this.findById(equipmentId);

        equipment.status = EquipmentStatus.AVAILABLE;
        equipment.lastMaintenanceDate = new Date();

        if (equipment.maintenanceIntervalDays) {
            const next = new Date();
            next.setDate(next.getDate() + equipment.maintenanceIntervalDays);
            equipment.nextMaintenanceDate = next;
        }

        await this.addLog(equipmentId, {
            type: EquipmentLogType.MAINTENANCE_END,
            description: notes || '維護完成',
        });

        return this.equipmentRepository.save(equipment);
    }

    async getMaintenanceDue(): Promise<Equipment[]> {
        const today = new Date();
        return this.equipmentRepository.find({
            where: {
                nextMaintenanceDate: LessThan(today),
                status: EquipmentStatus.AVAILABLE,
            },
        });
    }

    // ==================== 電池追蹤 ====================

    async updateBattery(
        equipmentId: string,
        batteryLevel: number,
        isCharging?: boolean
    ): Promise<Equipment> {
        const equipment = await this.findById(equipmentId);

        equipment.batteryLevel = batteryLevel;

        if (isCharging) {
            equipment.status = EquipmentStatus.CHARGING;
            equipment.lastCharged = new Date();
        } else if (equipment.status === EquipmentStatus.CHARGING && batteryLevel >= 95) {
            equipment.status = EquipmentStatus.AVAILABLE;
        }

        await this.addLog(equipmentId, {
            type: EquipmentLogType.BATTERY_UPDATE,
            description: `電量: ${batteryLevel}%`,
            metadata: { batteryLevel, isCharging },
        });

        return this.equipmentRepository.save(equipment);
    }

    async getLowBattery(threshold: number = 20): Promise<Equipment[]> {
        return this.equipmentRepository
            .createQueryBuilder('equipment')
            .where('equipment.batteryLevel IS NOT NULL')
            .andWhere('equipment.batteryLevel < :threshold', { threshold })
            .andWhere('equipment.status != :charging', { charging: EquipmentStatus.CHARGING })
            .getMany();
    }

    // ==================== Logs ====================

    async addLog(equipmentId: string, data: Partial<EquipmentLog>): Promise<EquipmentLog> {
        const log = this.logRepository.create({
            equipmentId,
            ...data,
        });
        return this.logRepository.save(log);
    }

    async getLogs(equipmentId: string): Promise<EquipmentLog[]> {
        return this.logRepository.find({
            where: { equipmentId },
            order: { timestamp: 'DESC' },
            take: 50,
        });
    }

    // ==================== Statistics ====================

    async getStats(): Promise<{
        total: number;
        available: number;
        inUse: number;
        maintenance: number;
        lowBattery: number;
        maintenanceDue: number;
    }> {
        const all = await this.equipmentRepository.find();
        const today = new Date();

        return {
            total: all.length,
            available: all.filter(e => e.status === EquipmentStatus.AVAILABLE).length,
            inUse: all.filter(e => e.status === EquipmentStatus.IN_USE).length,
            maintenance: all.filter(e => e.status === EquipmentStatus.MAINTENANCE).length,
            lowBattery: all.filter(e => e.batteryLevel !== undefined && e.batteryLevel < 20).length,
            maintenanceDue: all.filter(e => e.nextMaintenanceDate && e.nextMaintenanceDate < today).length,
        };
    }
}
