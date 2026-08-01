/**
 * Equipment Controller
 * Phase 5.5: 設備管理 API
 */

import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';
import { EquipmentService } from './equipment.service';
import { Equipment, EquipmentCategory, EquipmentStatus } from './entities';

@ApiTags('equipment')
@ApiBearerAuth()
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
// P0 授權定級：設備查詢與現場借還由志工執行 → 類別預設 L1；
// 建檔／維護／指派任務屬管理動作 → 逐一標 L2（前端 page-policy 的 equipment 頁本來就是 L2）。
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
@Controller('equipment')
export class EquipmentController {
    constructor(private readonly equipmentService: EquipmentService) { }

    @Post()
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 管理：新增設備主檔
    @ApiOperation({ summary: '新增設備' })
    async create(@Body() data: Partial<Equipment>) {
        return this.equipmentService.create(data);
    }

    @Get()
    @ApiOperation({ summary: '取得設備列表' })
    @ApiQuery({ name: 'category', enum: EquipmentCategory, required: false })
    @ApiQuery({ name: 'status', enum: EquipmentStatus, required: false })
    async findAll(
        @Query('category') category?: EquipmentCategory,
        @Query('status') status?: EquipmentStatus
    ) {
        return this.equipmentService.findAll({ category, status });
    }

    @Get('stats')
    @ApiOperation({ summary: '取得設備統計' })
    async getStats() {
        return this.equipmentService.getStats();
    }

    @Get('low-battery')
    @ApiOperation({ summary: '取得低電量設備' })
    @ApiQuery({ name: 'threshold', required: false })
    async getLowBattery(@Query('threshold') threshold?: string) {
        return this.equipmentService.getLowBattery(threshold ? parseInt(threshold) : 20);
    }

    @Get('maintenance-due')
    @ApiOperation({ summary: '取得需維護設備' })
    async getMaintenanceDue() {
        return this.equipmentService.getMaintenanceDue();
    }

    // ==================== 任務/事件串接 ====================

    @Get('by-task/:taskId')
    @ApiOperation({ summary: '依任務查詢設備' })
    @ApiParam({ name: 'taskId' })
    async findByTask(@Param('taskId') taskId: string) {
        return this.equipmentService.findByTask(taskId);
    }

    @Get('by-event/:eventId')
    @ApiOperation({ summary: '依事件查詢設備' })
    @ApiParam({ name: 'eventId' })
    async findByEvent(@Param('eventId') eventId: string) {
        return this.equipmentService.findByEvent(eventId);
    }

    @Get(':id')
    @ApiOperation({ summary: '取得設備詳情' })
    @ApiParam({ name: 'id' })
    async findById(@Param('id') id: string) {
        return this.equipmentService.findById(id);
    }

    @Get('qr/:qrCode')
    @ApiOperation({ summary: '透過 QR Code 查詢' })
    @ApiParam({ name: 'qrCode' })
    async findByQrCode(@Param('qrCode') qrCode: string) {
        return this.equipmentService.findByQrCode(qrCode);
    }

    @Post(':id/checkout')
    @ApiOperation({ summary: '借出設備' })
    @ApiParam({ name: 'id' })
    async checkout(
        @Param('id') id: string,
        @Body() data: { holderId: string; holderName: string; expectedReturnAt?: string }
    ) {
        return this.equipmentService.checkout(
            id,
            data.holderId,
            data.holderName,
            data.expectedReturnAt ? new Date(data.expectedReturnAt) : undefined
        );
    }

    @Post(':id/return')
    @ApiOperation({ summary: '歸還設備' })
    @ApiParam({ name: 'id' })
    async returnEquipment(
        @Param('id') id: string,
        @Body() data: { returnerId: string; returnerName: string; batteryLevel?: number }
    ) {
        return this.equipmentService.returnEquipment(
            id,
            data.returnerId,
            data.returnerName,
            data.batteryLevel
        );
    }

    @Post(':id/maintenance/start')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 管理：設備轉入維護（影響可派遣性）
    @ApiOperation({ summary: '開始維護' })
    @ApiParam({ name: 'id' })
    async startMaintenance(@Param('id') id: string, @Body() data: { reason: string }) {
        return this.equipmentService.startMaintenance(id, data.reason);
    }

    @Post(':id/maintenance/end')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 管理：設備解除維護
    @ApiOperation({ summary: '結束維護' })
    @ApiParam({ name: 'id' })
    async endMaintenance(@Param('id') id: string, @Body() data: { notes?: string }) {
        return this.equipmentService.endMaintenance(id, data.notes);
    }

    @Put(':id/battery')
    @ApiOperation({ summary: '更新電池狀態' })
    @ApiParam({ name: 'id' })
    async updateBattery(
        @Param('id') id: string,
        @Body() data: { batteryLevel: number; isCharging?: boolean }
    ) {
        return this.equipmentService.updateBattery(id, data.batteryLevel, data.isCharging);
    }

    @Get(':id/logs')
    @ApiOperation({ summary: '取得設備記錄' })
    @ApiParam({ name: 'id' })
    async getLogs(@Param('id') id: string) {
        return this.equipmentService.getLogs(id);
    }

    @Post(':id/assign-task')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 管理：設備指派至任務
    @ApiOperation({ summary: '指派設備至任務' })
    @ApiParam({ name: 'id' })
    async assignToTask(
        @Param('id') id: string,
        @Body() data: { taskId: string; eventId?: string; actorId?: string; actorName?: string }
    ) {
        return this.equipmentService.assignToTask(id, data.taskId, data.eventId, data.actorId, data.actorName);
    }

    @Post(':id/unassign-task')
    @RequiredLevel(ROLE_LEVELS.OFFICER) // 管理：解除設備指派
    @ApiOperation({ summary: '從任務解除指派' })
    @ApiParam({ name: 'id' })
    async unassignFromTask(@Param('id') id: string) {
        return this.equipmentService.unassignFromTask(id);
    }
}
