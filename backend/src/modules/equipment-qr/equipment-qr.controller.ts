import { Controller, Get, Post, Patch, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EquipmentQrService } from './equipment-qr.service';

@ApiTags('Equipment QR API')
@ApiBearerAuth()
@Controller('equipment-qr')
export class EquipmentQrController {
    constructor(private readonly service: EquipmentQrService) { }

    @Get()
    @ApiOperation({ summary: '取得所有裝備' })
    getAllEquipment() {
        return this.service.getAllEquipment();
    }

    @Get('category/:category')
    @ApiOperation({ summary: '依類別取得裝備' })
    getByCategory(@Param('category') category: string) {
        return this.service.getEquipmentByCategory(category);
    }

    @Get('scan/:qrCode')
    @ApiOperation({ summary: '掃描 QR Code 取得裝備資訊' })
    scanQr(@Param('qrCode') qrCode: string) {
        return this.service.getEquipmentByQr(qrCode);
    }

    @Post('register')
    @ApiOperation({ summary: '登錄新裝備' })
    register(@Body() data: any) {
        return this.service.registerEquipment(data);
    }

    @Post('checkout')
    @ApiOperation({ summary: '領用裝備' })
    checkout(@Body() data: { qrCode: string; userId: string; userName: string; expectedReturnAt?: string }) {
        return this.service.checkout(
            data.qrCode,
            data.userId,
            data.userName,
            data.expectedReturnAt ? new Date(data.expectedReturnAt) : undefined
        );
    }

    @Post('return/:recordId')
    @ApiOperation({ summary: '歸還裝備' })
    returnEquipment(
        @Param('recordId') recordId: string,
        @Body() data: { condition: 'good' | 'damaged' | 'needs_repair'; notes?: string }
    ) {
        return this.service.returnEquipment(recordId, data.condition, data.notes);
    }

    @Get('checkouts/active')
    @ApiOperation({ summary: '取得進行中的領用紀錄' })
    getActiveCheckouts() {
        return this.service.getActiveCheckouts();
    }

    @Get('checkouts/history/:equipmentId')
    @ApiOperation({ summary: '取得裝備領用歷史' })
    getCheckoutHistory(@Param('equipmentId') equipmentId: string) {
        return this.service.getCheckoutHistory(equipmentId);
    }

    @Get('maintenance/pending')
    @ApiOperation({ summary: '取得待維護排程' })
    getPendingMaintenance() {
        return this.service.getPendingMaintenance();
    }

    @Get('maintenance/alerts')
    @ApiOperation({ summary: '取得維護警示' })
    getMaintenanceAlerts() {
        return this.service.getMaintenanceAlerts();
    }

    @Post('maintenance/schedule')
    @ApiOperation({ summary: '排程維護' })
    scheduleMaintenance(@Body() data: any) {
        return this.service.scheduleMaintenance(data);
    }

    @Patch('maintenance/:scheduleId/complete')
    @ApiOperation({ summary: '完成維護' })
    completeMaintenance(@Param('scheduleId') scheduleId: string) {
        return { success: this.service.completeMaintenance(scheduleId) };
    }

    @Get('stats')
    @ApiOperation({ summary: '取得庫存統計' })
    getInventoryStats() {
        return this.service.getInventoryStats();
    }

    @Get('alerts/low-stock')
    @ApiOperation({ summary: '取得低庫存警示' })
    getLowStockAlerts() {
        return this.service.getLowStockAlerts();
    }
}
