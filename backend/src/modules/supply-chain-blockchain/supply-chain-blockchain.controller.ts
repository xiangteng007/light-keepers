import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SupplyChainBlockchainService } from './supply-chain-blockchain.service';

@ApiTags('Supply Chain Blockchain')
@ApiBearerAuth()
@Controller('blockchain')
export class SupplyChainBlockchainController {
    constructor(private readonly service: SupplyChainBlockchainService) { }

    @Get('chain')
    @ApiOperation({ summary: '取得完整區塊鏈' })
    getChain() {
        return this.service.getChain();
    }

    @Get('chain/verify')
    @ApiOperation({ summary: '驗證區塊鏈完整性' })
    verifyChain() {
        return this.service.verifyChain();
    }

    @Get('blocks/:hash')
    @ApiOperation({ summary: '取得區塊' })
    getBlock(@Param('hash') hash: string) {
        return this.service.getBlock(hash);
    }

    @Post('donations')
    @ApiOperation({ summary: '記錄捐贈' })
    recordDonation(@Body() dto: any) {
        return this.service.recordDonation(dto);
    }

    @Get('donations')
    @ApiOperation({ summary: '取得所有捐贈' })
    getAllDonations() {
        return this.service.getAllDonations();
    }

    @Get('donations/:id')
    @ApiOperation({ summary: '取得捐贈記錄' })
    getDonation(@Param('id') id: string) {
        return this.service.getDonation(id);
    }

    @Get('donations/donor/:name')
    @ApiOperation({ summary: '依捐贈者查詢' })
    getDonationsByDonor(@Param('name') name: string) {
        return this.service.getDonationsByDonor(name);
    }

    @Get('items/:itemId/trail')
    @ApiOperation({ summary: '取得物資追蹤記錄' })
    getItemTrail(@Param('itemId') itemId: string) {
        return this.service.getItemTrail(itemId);
    }

    @Post('items/:itemId/transfer')
    @ApiOperation({ summary: '物資轉移' })
    transferItem(
        @Param('itemId') itemId: string,
        @Body() dto: { fromEntity: string; toEntity: string; quantity: number; location?: string }
    ) {
        return this.service.transferItem(itemId, dto.fromEntity, dto.toEntity, dto.quantity, dto.location);
    }

    @Post('items/:itemId/distribute')
    @ApiOperation({ summary: '物資發放' })
    distributeItem(
        @Param('itemId') itemId: string,
        @Body() dto: { toEntity: string; quantity: number; location: string }
    ) {
        return this.service.distributeItem(itemId, dto.toEntity, dto.quantity, dto.location);
    }

    @Get('public/ledger')
    @ApiOperation({ summary: '公開帳本' })
    getPublicLedger() {
        return this.service.getPublicLedger();
    }

    @Get('audit/report')
    @ApiOperation({ summary: '稽核報告' })
    generateAuditReport(
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string
    ) {
        return this.service.generateAuditReport(new Date(startDate), new Date(endDate));
    }
}
