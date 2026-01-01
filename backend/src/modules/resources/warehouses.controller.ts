import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { WarehousesService } from './warehouses.service';
import { Warehouse } from './warehouse.entity';
import { StorageLocation } from './storage-location.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('warehouses')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.OFFICER)
export class WarehousesController {
    constructor(private readonly warehousesService: WarehousesService) { }

    // ==================== 倉庫 API ====================

    @Post()
    async createWarehouse(@Body() dto: Partial<Warehouse>): Promise<{ data: Warehouse }> {
        const warehouse = await this.warehousesService.createWarehouse(dto);
        return { data: warehouse };
    }

    @Get()
    async findAllWarehouses(): Promise<{ data: Warehouse[]; total: number }> {
        const warehouses = await this.warehousesService.findAllWarehouses();
        return { data: warehouses, total: warehouses.length };
    }

    @Get('primary')
    async getPrimaryWarehouse(): Promise<{ data: Warehouse | null }> {
        const warehouse = await this.warehousesService.getPrimaryWarehouse();
        return { data: warehouse };
    }

    @Get(':id')
    async findWarehouseById(@Param('id') id: string): Promise<{ data: Warehouse }> {
        const warehouse = await this.warehousesService.findWarehouseById(id);
        return { data: warehouse };
    }

    @Patch(':id')
    async updateWarehouse(
        @Param('id') id: string,
        @Body() dto: Partial<Warehouse>,
    ): Promise<{ data: Warehouse }> {
        const warehouse = await this.warehousesService.updateWarehouse(id, dto);
        return { data: warehouse };
    }

    @Delete(':id')
    async deleteWarehouse(@Param('id') id: string): Promise<{ success: boolean }> {
        await this.warehousesService.deleteWarehouse(id);
        return { success: true };
    }

    // ==================== 儲位 API ====================

    @Post(':warehouseId/locations')
    async createLocation(
        @Param('warehouseId') warehouseId: string,
        @Body() dto: {
            zone: string;
            rack: string;
            level: string;
            position?: string;
            barcode?: string;
            capacity?: number;
        },
    ): Promise<{ data: StorageLocation }> {
        const location = await this.warehousesService.createLocation({
            warehouseId,
            ...dto,
        });
        return { data: location };
    }

    @Get(':warehouseId/locations')
    async findLocationsByWarehouse(
        @Param('warehouseId') warehouseId: string,
    ): Promise<{ data: StorageLocation[]; total: number }> {
        const locations = await this.warehousesService.findLocationsByWarehouse(warehouseId);
        return { data: locations, total: locations.length };
    }

    @Get('locations/all')
    async findAllLocations(): Promise<{ data: StorageLocation[]; total: number }> {
        const locations = await this.warehousesService.findAllLocations();
        return { data: locations, total: locations.length };
    }

    @Get('locations/barcode/:barcode')
    async findLocationByBarcode(
        @Param('barcode') barcode: string,
    ): Promise<{ data: StorageLocation | null }> {
        const location = await this.warehousesService.findLocationByBarcode(barcode);
        return { data: location };
    }

    @Get('locations/:id')
    async findLocationById(@Param('id') id: string): Promise<{ data: StorageLocation }> {
        const location = await this.warehousesService.findLocationById(id);
        return { data: location };
    }

    @Patch('locations/:id')
    async updateLocation(
        @Param('id') id: string,
        @Body() dto: Partial<StorageLocation>,
    ): Promise<{ data: StorageLocation }> {
        const location = await this.warehousesService.updateLocation(id, dto);
        return { data: location };
    }

    @Delete('locations/:id')
    async deleteLocation(@Param('id') id: string): Promise<{ success: boolean }> {
        await this.warehousesService.deleteLocation(id);
        return { success: true };
    }

    @Get(':warehouseId/locations/stats')
    async getLocationStats(
        @Param('warehouseId') warehouseId: string,
    ): Promise<{ data: { total: number; byZone: Record<string, number> } }> {
        const stats = await this.warehousesService.getLocationStats(warehouseId);
        return { data: stats };
    }
}
