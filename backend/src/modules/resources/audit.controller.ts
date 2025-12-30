import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { AuditService } from './audit.service';
import { InventoryAudit, AuditStatus } from './inventory-audit.entity';

@Controller('audits')
export class AuditController {
    constructor(private readonly auditService: AuditService) { }

    // 開始耗材盤點
    @Post('consumable')
    async startConsumableAudit(
        @Body() dto: { auditorName: string; auditorId?: string; warehouseId?: string; locationId?: string },
    ): Promise<{ data: InventoryAudit }> {
        const audit = await this.auditService.startConsumableAudit(dto);
        return { data: audit };
    }

    // 開始資產盤點
    @Post('asset')
    async startAssetAudit(
        @Body() dto: { auditorName: string; auditorId?: string; warehouseId?: string; locationId?: string },
    ): Promise<{ data: InventoryAudit }> {
        const audit = await this.auditService.startAssetAudit(dto);
        return { data: audit };
    }

    @Get()
    async findAll(@Query('status') status?: AuditStatus): Promise<{ data: InventoryAudit[]; total: number }> {
        const audits = await this.auditService.findAll(status);
        return { data: audits, total: audits.length };
    }

    @Get(':id')
    async findById(@Param('id') id: string): Promise<{ data: InventoryAudit }> {
        const audit = await this.auditService.findById(id);
        return { data: audit };
    }

    // 更新耗材數量
    @Patch(':id/consumable/:itemId')
    async updateConsumableCount(
        @Param('id') id: string,
        @Param('itemId') itemId: string,
        @Body() dto: { actualQty: number; notes?: string },
    ): Promise<{ data: InventoryAudit }> {
        const audit = await this.auditService.updateConsumableCount(id, itemId, dto.actualQty, dto.notes);
        return { data: audit };
    }

    // 掃描資產
    @Patch(':id/asset/:assetId/scan')
    async scanAsset(
        @Param('id') id: string,
        @Param('assetId') assetId: string,
    ): Promise<{ data: InventoryAudit }> {
        const audit = await this.auditService.scanAsset(id, assetId);
        return { data: audit };
    }

    // 標記遺失
    @Patch(':id/asset/:assetId/missing')
    async markAssetMissing(
        @Param('id') id: string,
        @Param('assetId') assetId: string,
        @Body() dto: { note: string },
    ): Promise<{ data: InventoryAudit }> {
        const audit = await this.auditService.markAssetMissing(id, assetId, dto.note);
        return { data: audit };
    }

    // 完成盤點
    @Patch(':id/complete')
    async complete(
        @Param('id') id: string,
        @Body() dto: { reviewerName: string; reviewerId?: string; applyDifference?: boolean },
    ): Promise<{ data: InventoryAudit }> {
        const audit = await this.auditService.complete(id, dto.reviewerName, dto.reviewerId, dto.applyDifference);
        return { data: audit };
    }

    // 取消盤點
    @Patch(':id/cancel')
    async cancel(@Param('id') id: string): Promise<{ data: InventoryAudit }> {
        const audit = await this.auditService.cancel(id);
        return { data: audit };
    }
}
