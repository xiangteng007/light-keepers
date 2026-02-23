import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ResourcesService, CreateResourceDto, TransactionDto, CreateDonationSourceDto } from './resources.service';
import { ResourceCategory } from './resources.entity';
import { CoreJwtGuard, UnifiedRolesGuard, RequiredLevel, ROLE_LEVELS } from '../shared/guards';

@Controller('resources')
@UseGuards(CoreJwtGuard, UnifiedRolesGuard)
@RequiredLevel(ROLE_LEVELS.VOLUNTEER)
export class ResourcesController {
    constructor(private readonly resourcesService: ResourcesService) { }

    // ==================== 基本 CRUD ====================

    @Post()
    async create(@Body() dto: CreateResourceDto) {
        const resource = await this.resourcesService.create(dto);
        return { success: true, data: resource };
    }

    @Get()
    async findAll(@Query('category') category?: ResourceCategory) {
        const resources = await this.resourcesService.findAll(category);
        return { success: true, data: resources, count: resources.length };
    }

    @Get('stats')
    async getStats() {
        const stats = await this.resourcesService.getStats();
        return { success: true, data: stats };
    }

    @Post('recalculate-status')
    async recalculateStatus() {
        const result = await this.resourcesService.recalculateAllStatus();
        return {
            success: true,
            message: `已重新計算 ${result.updated} 個物資的狀態`,
            data: result
        };
    }

    @Get('low-stock')
    async getLowStock() {
        const resources = await this.resourcesService.getLowStock();
        return { success: true, data: resources, count: resources.length };
    }

    @Get('expiring')
    async getExpiring(@Query('days') days?: string) {
        const resources = await this.resourcesService.getExpiringSoon(Number(days) || 30);
        return { success: true, data: resources, count: resources.length };
    }

    // ==================== 📋 A4: 任務/事件串接 ====================

    @Get('by-task/:taskId')
    async findByTask(@Param('taskId') taskId: string) {
        const transactions = await this.resourcesService.findByTask(taskId);
        return { success: true, data: transactions, count: transactions.length };
    }

    @Get('usage-by-event/:eventId')
    async getUsageByEvent(@Param('eventId') eventId: string) {
        const usage = await this.resourcesService.getUsageByEvent(eventId);
        return { success: true, data: usage };
    }

    // ==================== 📱 條碼查詢 (功能4) ====================

    @Get('barcode/:barcode')
    async findByBarcode(@Param('barcode') barcode: string) {
        const resource = await this.resourcesService.findByBarcode(barcode);
        if (!resource) {
            return { success: false, message: '找不到此條碼的物資' };
        }
        return { success: true, data: resource };
    }

    @Get(':id')
    async findOne(@Param('id') id: string) {
        const resource = await this.resourcesService.findOne(id);
        return { success: true, data: resource };
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: Partial<CreateResourceDto>) {
        const resource = await this.resourcesService.update(id, dto);
        return { success: true, message: '物資已更新', data: resource };
    }

    @Delete(':id')
    async delete(@Param('id') id: string) {
        await this.resourcesService.delete(id);
        return { success: true, message: '物資已刪除' };
    }

    // ==================== 📊 異動紀錄 (功能1) ====================

    @Patch(':id/add')
    async addStock(
        @Param('id') id: string,
        @Body() body: { amount: number; operatorName: string; notes?: string }
    ) {
        const resource = await this.resourcesService.addStock(id, body.amount, body.operatorName, body.notes);
        return { success: true, message: `已入庫 ${body.amount} ${resource.unit}`, data: resource };
    }

    @Patch(':id/deduct')
    async deductStock(
        @Param('id') id: string,
        @Body() body: { amount: number; operatorName: string; notes?: string }
    ) {
        const resource = await this.resourcesService.deductStock(id, body.amount, body.operatorName, body.notes);
        return { success: true, message: `已出庫 ${body.amount} ${resource.unit}`, data: resource };
    }

    @Get(':id/transactions')
    async getTransactions(@Param('id') id: string) {
        const transactions = await this.resourcesService.getTransactions(id);
        return { success: true, data: transactions, count: transactions.length };
    }

    @Get('transactions/all')
    async getAllTransactions() {
        const transactions = await this.resourcesService.getTransactions();
        return { success: true, data: transactions, count: transactions.length };
    }

    @Delete('transactions/:transactionId')
    async deleteTransaction(@Param('transactionId') transactionId: string) {
        await this.resourcesService.deleteTransaction(transactionId);
        return { success: true, message: '紀錄已刪除' };
    }

    // ==================== 🔄 調撥功能 (功能3) ====================

    @Post(':id/transfer')
    async transferResource(
        @Param('id') id: string,
        @Body() body: {
            quantity: number;
            fromLocation: string;
            toLocation: string;
            operatorName: string;
        }
    ) {
        const transaction = await this.resourcesService.transferResource(
            id,
            body.quantity,
            body.fromLocation,
            body.toLocation,
            body.operatorName
        );
        return {
            success: true,
            message: `已調撥 ${body.quantity} 從 ${body.fromLocation} 到 ${body.toLocation}`,
            data: transaction
        };
    }

    // ==================== 🎁 捐贈來源管理 (功能2) ====================

    @Post('donations/sources')
    async createDonationSource(@Body() dto: CreateDonationSourceDto) {
        const source = await this.resourcesService.createDonationSource(dto);
        return { success: true, message: '捐贈來源已新增', data: source };
    }

    @Get('donations/sources')
    async getDonationSources() {
        const sources = await this.resourcesService.getAllDonationSources();
        return { success: true, data: sources, count: sources.length };
    }

    @Post(':id/donate')
    async recordDonation(
        @Param('id') id: string,
        @Body() body: {
            quantity: number;
            donationSourceId: string;
            operatorName: string;
            estimatedValue?: number;
        }
    ) {
        const transaction = await this.resourcesService.recordDonation(
            id,
            body.quantity,
            body.donationSourceId,
            body.operatorName,
            body.estimatedValue
        );
        return { success: true, message: '捐贈已登記', data: transaction };
    }

    // ==================== 📦 批次管理 (功能5) ====================

    @Post(':id/batches')
    async createBatch(
        @Param('id') resourceId: string,
        @Body() body: {
            batchNo: string;
            quantity: number;
            expiresAt?: string;
            manufacturedAt?: string;
            donationSourceId?: string;
            unitPrice?: number;
            location?: string;
            barcode?: string;
            photoUrl?: string;
            notes?: string;
        }
    ) {
        const batch = await this.resourcesService.createBatch({
            resourceId,
            ...body,
            expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
            manufacturedAt: body.manufacturedAt ? new Date(body.manufacturedAt) : undefined,
        });
        return { success: true, message: '批次已新增', data: batch };
    }

    @Get(':id/batches')
    async getBatches(@Param('id') id: string) {
        const batches = await this.resourcesService.getBatches(id);
        return { success: true, data: batches, count: batches.length };
    }

    @Get('batches/expiring')
    async getExpiringBatches(@Query('days') days?: string) {
        const batches = await this.resourcesService.getExpiringBatches(Number(days) || 30);
        return { success: true, data: batches, count: batches.length };
    }
}
