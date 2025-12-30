import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { AssetsService, CreateAssetDto, BorrowAssetDto, ReturnAssetDto } from './assets.service';
import { Asset, AssetStatus } from './asset.entity';
import { AssetTransaction } from './asset-transaction.entity';

@Controller('assets')
export class AssetsController {
    constructor(private readonly assetsService: AssetsService) { }

    // ==================== CRUD ====================

    @Post()
    async create(@Body() dto: CreateAssetDto): Promise<{ data: Asset }> {
        const asset = await this.assetsService.create(dto);
        return { data: asset };
    }

    @Get()
    async findAll(@Query('status') status?: AssetStatus): Promise<{ data: Asset[]; total: number }> {
        const assets = await this.assetsService.findAll(status);
        return { data: assets, total: assets.length };
    }

    @Get('stats')
    async getStats(): Promise<{ data: { total: number; byStatus: Record<string, number>; overdue: number } }> {
        const stats = await this.assetsService.getStats();
        return { data: stats };
    }

    @Get('overdue')
    async getOverdueAssets(): Promise<{ data: Asset[]; total: number }> {
        const assets = await this.assetsService.getOverdueAssets();
        return { data: assets, total: assets.length };
    }

    @Get('transactions')
    async getAllTransactions(): Promise<{ data: AssetTransaction[]; total: number }> {
        const transactions = await this.assetsService.getTransactions();
        return { data: transactions, total: transactions.length };
    }

    @Get('barcode/:barcode')
    async findByBarcode(@Param('barcode') barcode: string): Promise<{ data: Asset | null }> {
        const asset = await this.assetsService.findByBarcode(decodeURIComponent(barcode));
        return { data: asset };
    }

    @Get('no/:assetNo')
    async findByAssetNo(@Param('assetNo') assetNo: string): Promise<{ data: Asset | null }> {
        const asset = await this.assetsService.findByAssetNo(decodeURIComponent(assetNo));
        return { data: asset };
    }

    @Get(':id')
    async findById(@Param('id') id: string): Promise<{ data: Asset }> {
        const asset = await this.assetsService.findById(id);
        return { data: asset };
    }

    @Patch(':id')
    async update(@Param('id') id: string, @Body() dto: Partial<Asset>): Promise<{ data: Asset }> {
        const asset = await this.assetsService.update(id, dto);
        return { data: asset };
    }

    // ==================== 借出/歸還 ====================

    @Post(':id/borrow')
    async borrow(
        @Param('id') id: string,
        @Body() dto: BorrowAssetDto,
    ): Promise<{ data: Asset }> {
        const asset = await this.assetsService.borrowAsset(id, dto);
        return { data: asset };
    }

    @Post(':id/return')
    async returnAsset(
        @Param('id') id: string,
        @Body() dto: ReturnAssetDto,
    ): Promise<{ data: Asset }> {
        const asset = await this.assetsService.returnAsset(id, dto);
        return { data: asset };
    }

    // ==================== 維修/報廢/遺失 ====================

    @Post(':id/maintenance')
    async markMaintenance(
        @Param('id') id: string,
        @Body() dto: { notes: string; operatorName: string },
    ): Promise<{ data: Asset }> {
        const asset = await this.assetsService.markMaintenance(id, dto.notes, dto.operatorName);
        return { data: asset };
    }

    @Post(':id/maintenance/complete')
    async completeMaintenance(
        @Param('id') id: string,
        @Body() dto: { toLocationId: string; notes: string; operatorName: string },
    ): Promise<{ data: Asset }> {
        const asset = await this.assetsService.completeMaintenance(id, dto.toLocationId, dto.notes, dto.operatorName);
        return { data: asset };
    }

    @Post(':id/dispose')
    async dispose(
        @Param('id') id: string,
        @Body() dto: { reason: string; operatorName: string },
    ): Promise<{ data: Asset }> {
        const asset = await this.assetsService.dispose(id, dto.reason, dto.operatorName);
        return { data: asset };
    }

    @Post(':id/report-lost')
    async reportLost(
        @Param('id') id: string,
        @Body() dto: { notes: string; operatorName: string },
    ): Promise<{ data: Asset }> {
        const asset = await this.assetsService.reportLost(id, dto.notes, dto.operatorName);
        return { data: asset };
    }

    // ==================== 交易紀錄 ====================

    @Get(':id/transactions')
    async getTransactions(@Param('id') id: string): Promise<{ data: AssetTransaction[]; total: number }> {
        const transactions = await this.assetsService.getTransactions(id);
        return { data: transactions, total: transactions.length };
    }

    // ==================== 公開 API (志工用) ====================

    @Get('public/list')
    async getPublicList(): Promise<{ data: Partial<Asset>[]; total: number }> {
        const assets = await this.assetsService.findAll();
        const sanitized = assets.map(a => this.assetsService.sanitizeForPublic(a));
        return { data: sanitized, total: sanitized.length };
    }
}
