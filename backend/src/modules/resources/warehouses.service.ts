import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './warehouse.entity';
import { StorageLocation } from './storage-location.entity';

@Injectable()
export class WarehousesService {
    private readonly logger = new Logger(WarehousesService.name);

    constructor(
        @InjectRepository(Warehouse)
        private warehouseRepo: Repository<Warehouse>,
        @InjectRepository(StorageLocation)
        private locationRepo: Repository<StorageLocation>,
    ) { }

    // ==================== 倉庫管理 ====================

    async createWarehouse(dto: Partial<Warehouse>): Promise<Warehouse> {
        const warehouse = this.warehouseRepo.create(dto);
        const saved = await this.warehouseRepo.save(warehouse);
        this.logger.log(`🏭 Created warehouse: ${saved.name}`);
        return saved;
    }

    async findAllWarehouses(): Promise<Warehouse[]> {
        return this.warehouseRepo.find({
            where: { isActive: true },
            order: { isPrimary: 'DESC', name: 'ASC' },
        });
    }

    async findWarehouseById(id: string): Promise<Warehouse> {
        const warehouse = await this.warehouseRepo.findOne({ where: { id } });
        if (!warehouse) throw new NotFoundException(`Warehouse ${id} not found`);
        return warehouse;
    }

    async updateWarehouse(id: string, dto: Partial<Warehouse>): Promise<Warehouse> {
        await this.warehouseRepo.update(id, dto);
        return this.findWarehouseById(id);
    }

    async deleteWarehouse(id: string): Promise<void> {
        await this.warehouseRepo.update(id, { isActive: false });
        this.logger.log(`🏭 Deactivated warehouse: ${id}`);
    }

    async getPrimaryWarehouse(): Promise<Warehouse | null> {
        return this.warehouseRepo.findOne({ where: { isPrimary: true, isActive: true } });
    }

    // ==================== 儲位管理 ====================

    async createLocation(dto: {
        warehouseId: string;
        zone: string;
        rack: string;
        level: string;
        position?: string;
        barcode?: string;
        capacity?: number;
    }): Promise<StorageLocation> {
        const fullPath = this.buildLocationPath(dto.zone, dto.rack, dto.level, dto.position);
        const location = this.locationRepo.create({
            ...dto,
            fullPath,
            barcode: dto.barcode || `LOC:${dto.zone}-${dto.rack}-${dto.level}${dto.position ? '-' + dto.position : ''}`,
        });
        const saved = await this.locationRepo.save(location);
        this.logger.log(`📍 Created location: ${fullPath}`);
        return saved;
    }

    async findLocationsByWarehouse(warehouseId: string): Promise<StorageLocation[]> {
        return this.locationRepo.find({
            where: { warehouseId, isActive: true },
            order: { zone: 'ASC', rack: 'ASC', level: 'ASC', position: 'ASC' },
        });
    }

    async findLocationById(id: string): Promise<StorageLocation> {
        const location = await this.locationRepo.findOne({
            where: { id },
            relations: ['warehouse'],
        });
        if (!location) throw new NotFoundException(`Location ${id} not found`);
        return location;
    }

    async findLocationByBarcode(barcode: string): Promise<StorageLocation | null> {
        return this.locationRepo.findOne({
            where: { barcode },
            relations: ['warehouse'],
        });
    }

    async updateLocation(id: string, dto: Partial<StorageLocation>): Promise<StorageLocation> {
        if (dto.zone || dto.rack || dto.level || dto.position !== undefined) {
            const current = await this.findLocationById(id);
            const fullPath = this.buildLocationPath(
                dto.zone || current.zone,
                dto.rack || current.rack,
                dto.level || current.level,
                dto.position !== undefined ? dto.position : current.position,
            );
            dto.fullPath = fullPath;
        }
        await this.locationRepo.update(id, dto);
        return this.findLocationById(id);
    }

    async deleteLocation(id: string): Promise<void> {
        await this.locationRepo.update(id, { isActive: false });
        this.logger.log(`📍 Deactivated location: ${id}`);
    }

    async findAllLocations(): Promise<StorageLocation[]> {
        return this.locationRepo.find({
            where: { isActive: true },
            relations: ['warehouse'],
            order: { warehouseId: 'ASC', zone: 'ASC', rack: 'ASC', level: 'ASC' },
        });
    }

    // ==================== 輔助方法 ====================

    private buildLocationPath(zone: string, rack: string, level: string, position?: string): string {
        let path = `${zone}區-${rack}架-${level}層`;
        if (position) path += `-${position}`;
        return path;
    }

    async getLocationStats(warehouseId?: string): Promise<{
        total: number;
        byZone: Record<string, number>;
    }> {
        const where = warehouseId ? { warehouseId, isActive: true } : { isActive: true };
        const locations = await this.locationRepo.find({ where });

        const byZone: Record<string, number> = {};
        for (const loc of locations) {
            byZone[loc.zone] = (byZone[loc.zone] || 0) + 1;
        }

        return { total: locations.length, byZone };
    }
}
