import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { EquipmentQrService } from './equipment-qr.service';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { RegisterEquipmentDto, ScheduleMaintenanceDto } from './dto/equipment-qr.dto';

@ApiTags('Equipment QR API')
@ApiBearerAuth()
@Controller('equipment-qr')
// 定級理由：裝備清單與 QR 查詢屬現場志工日常唯讀需求（L1）；登錄、領用、歸還、維護等異動屬庫管寫入作業，逐一提升至 L2。
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
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
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：建立裝備主檔
    @ApiOperation({ summary: '登錄新裝備' })
    register(@Body() data: RegisterEquipmentDto) {
        return this.service.registerEquipment(data);
    }

    @Post('checkout')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：裝備領用需由幹部核發（沿用盤點初判）
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
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：歸還驗收含損壞狀態判定
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
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：維護排程
    @ApiOperation({ summary: '排程維護' })
    scheduleMaintenance(@Body() data: ScheduleMaintenanceDto) {
        return this.service.scheduleMaintenance(data);
    }

    @Patch('maintenance/:scheduleId/complete')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 寫入：結案維護紀錄
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
